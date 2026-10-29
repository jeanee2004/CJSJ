import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SECTIONS } from '../data/survey'
import type { Opt as SOpt, Q, Survey, Val } from '../data/survey'
import { deriveAnswers, visibleQuestions } from '../lib/survey'
import { Btn } from '../ui'
import { AddressCheck } from '../components/AddressCheck'
import { useStore } from '../store'

interface Opt<T> { v: T; t: string; d?: string }
function Choice<T extends string | boolean>({ opts, value, onPick }: { opts: Opt<T>[]; value: T | undefined; onPick: (v: T) => void }) {
  return (
    <div className="choices" role="group">
      {opts.map((o, i) => (
        <button key={String(o.v)} type="button" className="choice" aria-pressed={value === o.v} onClick={() => onPick(o.v)}>
          <span className="k">{String.fromCharCode(65 + i)}</span>
          <span><b>{o.t}</b>{o.d && <small>{o.d}</small>}</span>
          <span className="tick" aria-hidden="true">{value === o.v ? '✓' : ''}</span>
        </button>
      ))}
    </div>
  )
}

function NumberField({ value, onChange, unit, presets, hint, max, compact }: { value: number; onChange: (n: number) => void; unit: string; presets: number[]; hint?: ReactNode; max?: number; compact?: boolean }) {
  return (
    <>
      <div className={`num-field${compact ? ' compact' : ''}`}>
        <input
          className="num-input" type="number" inputMode="numeric" min={0} max={max} value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Math.max(0, Number(e.target.value)))} aria-label={`금액(${unit})`}
        />
        <b>{unit}</b>
      </div>
      <div className="preset">
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)}>{p.toLocaleString()}</button>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </>
  )
}

const UNK = 'unk'
const EXCLUSIVE = /^(해당 없음|없음|겪은 적 없음|아무것도 안 함|받고 있는 지원 없음|찾아본 적 없음)/
const DRAFT = 'cjsj.draft.v2'
const withUnk = (q: Q): SOpt[] => [...(q.opts ?? []), ...(q.unk ? [{ v: UNK, t: '잘 모르겠어요', d: '괜찮아요. 결과에서 어떻게 확인하는지 알려드릴게요' }] : [])]

function QBody({ q, sv, set, next }: { q: Q; sv: Survey; set: (v: Val | undefined | ((prev: Val | undefined) => Val | undefined)) => void; next: () => void }) {
  const v = sv[q.id]
  if (q.kind === 'single')
    return <Choice<string> value={typeof v === 'string' ? v : undefined} onPick={(x) => { set(x); next() }} opts={withUnk(q)} />

  if (q.kind === 'multi') {
    const sel = Array.isArray(v) ? v : []
    const opts = withUnk(q)
    const toggle = (o: SOpt) => {
      const excl = o.v === UNK || EXCLUSIVE.test(o.t)
      if (sel.includes(o.v)) return set(sel.filter((x) => x !== o.v))
      if (excl) return set([o.v])
      const base = sel.filter((x) => x !== UNK && !EXCLUSIVE.test(opts.find((p) => p.v === x)?.t ?? ''))
      set(q.max && base.length >= q.max ? [...base.slice(1), o.v] : [...base, o.v])
    }
    return (
      <div className="choices" role="group">
        {opts.map((o, i) => (
          <button key={o.v} type="button" className="choice" aria-pressed={sel.includes(o.v)} onClick={() => toggle(o)}>
            <span className="k">{String.fromCharCode(65 + (i % 26))}</span>
            <span><b>{o.t}</b>{o.d && <small>{o.d}</small>}</span>
            <span className="tick" aria-hidden="true">{sel.includes(o.v) ? '✓' : ''}</span>
          </button>
        ))}
        <p className="hint" style={{ marginTop: 12 }}>{q.max ? `최대 ${q.max}개까지 고를 수 있어요.` : '여러 개 고를 수 있어요.'}</p>
      </div>
    )
  }

  if (q.kind === 'rank') {
    const sel = Array.isArray(v) ? v : []
    const toggle = (x: string) => set((p) => {
      const cur = Array.isArray(p) ? p : []
      return cur.includes(x) ? cur.filter((y) => y !== x) : cur.length >= (q.max ?? 3) ? cur : [...cur, x]
    })
    return (
      <div className="choices" role="group">
        {(q.opts ?? []).map((o) => {
          const r = sel.indexOf(o.v)
          return (
            <button key={o.v} type="button" className="choice" aria-pressed={r >= 0} onClick={() => toggle(o.v)}>
              <span className="k">{r >= 0 ? `${r + 1}순위` : ''}</span>
              <span><b>{o.t}</b></span>
              <span className="tick" aria-hidden="true">{r >= 0 ? r + 1 : ''}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (q.kind === 'age') {
    const age = Number(typeof v === 'string' ? v : 26)
    return (
      <div className="stepper">
        <button type="button" aria-label="한 살 줄이기" onClick={() => set(String(Math.max(15, age - 1)))}>−</button>
        <output aria-live="polite">{age}<small>세</small></output>
        <button type="button" aria-label="한 살 늘리기" onClick={() => set(String(Math.min(60, age + 1)))}>＋</button>
      </div>
    )
  }

  if (q.kind === 'numbers') {
    const isUnk = v === UNK
    const val = v && typeof v === 'object' && !Array.isArray(v) ? v : {}
    return (
      <>
        {q.note && <p className="hint" style={{ marginBottom: 14 }}>{q.note}</p>}
        {!isUnk && (q.fields ?? []).map((f) => {
          const raw = val[f.k]
          const n = raw === undefined || raw === '' ? NaN : Number(raw)
          return (
            <div key={f.k} style={{ marginBottom: 22 }}>
              <p className="label" style={{ marginBottom: 6 }}>{f.label}</p>
              <NumberField compact={(q.fields?.length ?? 1) > 1} value={n} unit={f.unit} presets={f.presets ?? [0]} max={f.max}
                onChange={(x) => set((p) => ({ ...(p && typeof p === 'object' && !Array.isArray(p) ? p : {}), [f.k]: Number.isNaN(x) ? '' : x }))} />
            </div>
          )
        })}
        {q.unk && (
          <div className="preset" style={{ marginTop: 8 }}>
            <button type="button" aria-pressed={isUnk} onClick={() => { set(isUnk ? undefined : UNK); if (!isUnk) next() }}>
              {isUnk ? '✓ ' : ''}정확히 모르겠어요
            </button>
          </div>
        )}
      </>
    )
  }

  if (q.kind === 'matrix') {
    const val = v && typeof v === 'object' && !Array.isArray(v) ? v : {}
    return (
      <div className="mx" role="group">
        {(q.rows ?? []).map((r, ri) => (
          <div key={r.k} className="mx-row">
            <p><span className="k">{String(ri + 1).padStart(2, '0')}</span>{r.t}</p>
            <div className="mx-cols">
              {(q.cols ?? []).map((c) => (
                <button key={c.v} type="button" aria-pressed={val[r.k] === c.v} onClick={() => set((p) => ({ ...(p && typeof p === 'object' && !Array.isArray(p) ? p : {}), [r.k]: c.v }))}>{c.t}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {q.note && <p className="hint" style={{ marginBottom: 12 }}>{q.note}</p>}
      <textarea className="mx-text" rows={6} maxLength={500} value={typeof v === 'string' ? v : ''} onChange={(e) => set(e.target.value)} aria-label="자유롭게 적기" />
      <p className="hint">{(typeof v === 'string' ? v : '').length} / 500자</p>
    </>
  )
}

const answered = (q: Q, v: Val | undefined): boolean => {
  if (q.kind === 'text' || q.kind === 'age') return true
  if (v === undefined) return false
  if (q.kind === 'single') return typeof v === 'string'
  if (q.kind === 'multi') return Array.isArray(v) && v.length > 0
  if (q.kind === 'rank') return Array.isArray(v) && v.length === (q.max ?? 3)
  if (q.kind === 'numbers') return v === UNK || (typeof v === 'object' && !Array.isArray(v) && (q.fields ?? []).every((f) => v[f.k] !== undefined && v[f.k] !== ''))
  if (q.kind === 'matrix') return typeof v === 'object' && !Array.isArray(v) && (q.rows ?? []).every((r) => (v as Record<string, unknown>)[r.k] !== undefined)
  return true
}

const loadDraft = (): { sv: Survey; i: number } => {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? 'null')
    if (d && typeof d === 'object' && d.sv) return { sv: d.sv, i: Number(d.i) || 0 }
  } catch { /* noop */ }
  return { sv: {}, i: 0 }
}

export function DiagnoseFlow({ onClose }: { onClose: () => void }) {
  const { setAnswers } = useStore()
  const nav = useNavigate()
  const [draft] = useState(loadDraft)
  const [sv, setSv] = useState<Survey>(draft.sv)
  const [i, setI] = useState(draft.i)
  const [dir, setDir] = useState(1)

  const visible = visibleQuestions(sv)
  const idx = Math.min(i, visible.length - 1)
  const q = visible[idx]
  const set = (v: Val | undefined | ((prev: Val | undefined) => Val | undefined)) =>
    setSv((prev) => ({ ...prev, [q.id]: typeof v === 'function' ? v(prev[q.id]) : v }))
  const finish = () => {
    try { sessionStorage.removeItem(DRAFT) } catch { /* noop */ }
    setAnswers(deriveAnswers(sv)); onClose(); nav('/result')
  }
  const go = (n: number) => { setDir(n > 0 ? 1 : -1); setI((x) => Math.max(0, x + n)) }
  const isLast = idx === visible.length - 1
  const ok = answered(q, sv[q.id])
  const next = () => { if (isLast) finish(); else go(1) }
  // 선택형 질문은 바로 넘어가므로, 상태 반영 후 이동하도록 setTimeout 사용
  const autoNext = () => setTimeout(() => (isLast ? undefined : go(1)), 180)

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT, JSON.stringify({ sv, i: idx })) } catch { /* noop */ }
  }, [sv, idx])

  const secNo = SECTIONS.indexOf(q.sec as (typeof SECTIONS)[number]) + 1
  const hues: [string, string][] = [['var(--blush)', 'var(--aqua)'], ['var(--mint)', 'var(--peri)'], ['var(--aqua)', 'var(--blush)'], ['var(--peri)', 'var(--mint)'], ['var(--blush)', 'var(--mint)'], ['var(--tint)', 'var(--aqua)']]
  const [h1, h2] = hues[(secNo - 1) % hues.length]
  const minutes = Math.max(1, Math.ceil((visible.length - idx) * 0.18))
  const tag = q.id.startsWith('N') ? '맞춤 지원 확인용 추가 질문' : `설문 ${q.id}`

  return (
    <div className="diag-flow" style={{ ['--hc1' as string]: h1, ['--hc2' as string]: h2 }}>
      <div>
        <div className="diag-top">
          <span className="label">질문 {String(idx + 1).padStart(2, '0')} / {String(visible.length).padStart(2, '0')} · {secNo}/{SECTIONS.length} {q.sec}</span>
          <span className="label">약 {minutes}분 남았어요</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={visible.length} aria-valuenow={idx + 1}><i style={{ width: `${((idx + 1) / visible.length) * 100}%` }} /></div>
        <section key={q.id} className="diag-grid step-in" aria-live="polite" style={{ ['--dir' as string]: dir }}>
          <div className="diag-side">
            <span className="diag-no" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</span>
            <span className="label" style={{ display: 'block', marginBottom: 6 }}>{tag}</span>
            <h1>{q.title}</h1>
            <div className="why">
              <b>여쭤보는 이유</b>
              {q.why ?? <>청년 주거 경험 설문에 나오는 질문이에요. {q.unk ? '잘 모르면 "잘 모르겠어요"를 눌러도 괜찮아요.' : '정확하지 않아도 떠오르는 대로 골라 주세요.'}</>}
            </div>
          </div>
          <div className="diag-main">
            <QBody q={q} sv={sv} set={set} next={() => { if (!isLast) autoNext() }} />
            {/* 지원 자격은 새로 구하는 집 기준이라 N3 에서 확인하고, 판정 결과로 N3 답을 채운다 */}
            {q.id === 'N3' && <AddressCheck onResult={(multi) => set(multi ? 'multi' : 'normal')} />}
            <div className="nav-row">
              <button className="back" type="button" onClick={() => go(-1)} style={{ visibility: idx === 0 ? 'hidden' : 'visible' }}>← 이전</button>
              <Btn onClick={next} disabled={!ok}>{isLast ? '결과 보기' : '다음'}</Btn>
            </div>
          </div>
        </section>
        <p className="hint" style={{ marginTop: 36 }}>입력한 내용은 서버로 보내지 않고 이 기기에만 저장돼요. 질문은 「청정(靑定) 세종 · 청년 주거 경험 설문」과 같아요.</p>
      </div>
    </div>
  )
}
