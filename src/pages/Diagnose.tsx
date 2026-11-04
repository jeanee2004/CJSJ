import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Opt as SOpt, Q, Survey, SurveyType, Val } from '../data/survey'
import { deriveAnswers, visibleQuestions } from '../lib/survey'
import { Btn } from '../ui'
import { AddressCheck } from '../components/AddressCheck'
import { useStore } from '../store'
import { saveResponse } from '../lib/responses'
import { track } from '../lib/track'
import { SIMPLE_IDS } from '../data/survey'
import { simpleScreens } from '../lib/surveyGroups'
import '../components/Survey.css'

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
const DRAFT = (t: SurveyType) => `cjsj.draft.v4.${t}`
const withUnk = (q: Q): SOpt[] => [...(q.opts ?? []), ...(q.unk ? [{ v: UNK, t: '잘 모르겠어요', d: '괜찮아요. 결과에서 어떻게 확인하는지 알려드릴게요' }] : [])]

function QBody({ q, sv, set, next, compact }: { q: Q; sv: Survey; set: (v: Val | undefined | ((prev: Val | undefined) => Val | undefined)) => void; next: () => void; compact?: boolean }) {
  const v = sv[q.id]
  if (q.kind === 'single' && compact)
    return (
      <div className="chips" role="group">
        {withUnk(q).map((o) => (
          <button key={o.v} type="button" className="chip" aria-pressed={v === o.v} onClick={() => set(o.v)}>
            <b>{o.t}</b>{o.d && o.v !== UNK && <small>{o.d}</small>}
          </button>
        ))}
      </div>
    )
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
      <div className={`mx${compact ? ' mx-compact' : ''}`} role="group">
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

const loadDraft = (t: SurveyType): { sv: Survey; i: number } | null => {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT(t)) ?? 'null')
    if (d && typeof d === 'object' && d.sv) return { sv: d.sv, i: Number(d.i) || 0 }
  } catch { /* noop */ }
  return null
}

export function DiagnoseFlow({ mode, onClose }: { mode: SurveyType; onClose: () => void }) {
  const { setAnswers, answers, hasSaved, openDeep, user } = useStore()
  const nav = useNavigate()
  // 이어 쓰던 초안이 없으면, 간편 설문에서 답한 내용을 심화 설문의 시작점으로 쓴다
  const [draft] = useState(() => loadDraft(mode) ?? { sv: mode === 'deep' && hasSaved ? ((answers.survey ?? {}) as Survey) : {}, i: 0 })
  const [sv, setSv] = useState<Survey>(draft.sv)
  const [i, setI] = useState(draft.i)
  const [dir, setDir] = useState(1)

  // 맛보기는 관련 질문을 묶은 화면(qs 여러 개), 심화는 한 문항씩
  const grouped = mode === 'simple'
  const screens = grouped ? simpleScreens(sv) : visibleQuestions(sv, mode).map((x) => ({ key: x.id, title: x.title, sub: x.sec, qs: [x] }))
  const visible = screens
  const idx = Math.min(i, screens.length - 1)
  const scr = screens[idx]
  const q = scr.qs[0]
  const secs = [...new Set(screens.map((x) => x.qs[0].sec))]
  const setFor = (qq: Q) => (v: Val | undefined | ((prev: Val | undefined) => Val | undefined)) =>
    setSv((prev) => ({ ...prev, [qq.id]: typeof v === 'function' ? v(prev[qq.id]) : v }))
  const set = setFor(q)
  // 추적: 문항별 소요 시간, 완료/이탈 (식별정보 없이 문항 id 와 시간만)
  const qStart = useRef(Date.now())
  const lastQ = useRef('')
  const finished = useRef(false)
  lastQ.current = q.id
  const trackAnswer = () => {
    // 묶음 화면은 문항별로 이벤트를 남기되, 걸린 시간은 첫 문항에 합쳐 기록한다
    scr.qs.forEach((qq, n) => track('survey_answer', { name: qq.id, survey_type: mode, duration_ms: n === 0 ? Date.now() - qStart.current : 0 }))
    qStart.current = Date.now()
  }
  const mounted = useRef(false)
  const started = useRef(false)
  useEffect(() => {
    mounted.current = true
    qStart.current = Date.now()
    if (!started.current) { started.current = true; track('survey_start', { survey_type: mode }) }
    return () => {
      // 개발 모드 StrictMode 의 가짜 언마운트는 곧바로 다시 마운트되므로 한 틱 뒤에 확인한다
      mounted.current = false
      setTimeout(() => { if (!mounted.current && !finished.current) track('survey_abandon', { name: lastQ.current, survey_type: mode }) }, 0)
    }
  }, [mode])
  const finish = () => {
    finished.current = true
    trackAnswer(); track('survey_complete', { survey_type: mode })
    try { sessionStorage.removeItem(DRAFT(mode)) } catch { /* noop */ }
    setAnswers(deriveAnswers(sv, mode)); void saveResponse(sv, mode, user?.respondentId ?? null); onClose(); nav('/result')
  }
  const go = (n: number) => { if (n > 0) trackAnswer(); setDir(n > 0 ? 1 : -1); setI((x) => Math.max(0, x + n)) }
  const isLast = idx === visible.length - 1
  const ok = scr.qs.every((qq) => answered(qq, sv[qq.id]))
  const next = () => { if (isLast) finish(); else go(1) }
  // 선택형 질문은 바로 넘어가므로, 상태 반영 후 이동하도록 setTimeout 사용
  const autoNext = () => setTimeout(() => (isLast ? undefined : go(1)), 180)

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT(mode), JSON.stringify({ sv, i: idx })) } catch { /* noop */ }
  }, [sv, idx, mode])

  const secNo = secs.indexOf(q.sec) + 1
  const hues: [string, string][] = [['var(--blush)', 'var(--aqua)'], ['var(--mint)', 'var(--peri)'], ['var(--aqua)', 'var(--blush)'], ['var(--peri)', 'var(--mint)'], ['var(--blush)', 'var(--mint)'], ['var(--tint)', 'var(--aqua)']]
  const [h1, h2] = hues[(secNo - 1) % hues.length]
  const minutes = Math.max(1, Math.ceil((visible.length - idx) * (grouped ? 0.5 : 0.18)))
  const tag = mode === 'simple' ? `맛보기 · ${scr.sub}` : q.id.startsWith('N') ? '맞춤 지원 확인용 추가 질문' : `심화 설문 ${q.id}`

  return (
    <div className={`diag-flow${grouped ? ' is-grouped' : ''}`} style={{ ['--hc1' as string]: h1, ['--hc2' as string]: h2 }}>
      <div>
        <div className="diag-top">
          <span className="label">{grouped ? `${idx + 1} / ${visible.length} 단계 · ${scr.sub}` : `질문 ${String(idx + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')} · ${secNo}/${secs.length} ${q.sec}`}</span>
          <span className="label">약 {minutes}분 남았어요</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={visible.length} aria-valuenow={idx + 1}><i style={{ width: `${((idx + 1) / visible.length) * 100}%` }} /></div>
        {grouped ? (
          <section key={scr.key} className="diag-group step-in" aria-live="polite" style={{ ['--dir' as string]: dir }}>
            <span className="label">{tag}</span>
            <h1>{scr.title}</h1>
            {scr.qs.map((qq, n) => (
              <div key={qq.id} className="gq" data-done={answered(qq, sv[qq.id])}>
                <p className="gq-t"><span className="gq-n">{n + 1}</span>{qq.id === 'Q13' ? '아래 제도를 알고 계신가요? 이용 경험이 있다면 함께 표시해 주세요.' : qq.title}</p>
                {qq.why && <details className="gq-why"><summary>여쭤보는 이유</summary><div>{qq.why}</div></details>}
                <QBody q={qq} sv={sv} set={setFor(qq)} next={() => undefined} compact />
                {qq.id === 'N3' && <AddressCheck onResult={(multi) => setFor(qq)(multi ? 'multi' : 'normal')} />}
              </div>
            ))}
            <div className="nav-row">
              <button className="back" type="button" onClick={() => go(-1)} style={{ visibility: idx === 0 ? 'hidden' : 'visible' }}>← 이전</button>
              {!ok && <span className="hint" role="status">{scr.qs.filter((qq) => !answered(qq, sv[qq.id])).length}개 문항이 남았어요</span>}
              <Btn onClick={next} disabled={!ok}>{isLast ? '결과 보기' : '다음'}</Btn>
            </div>
          </section>
        ) : (
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
        )}
        {mode === 'simple' ? (
          <p className="hint" style={{ marginTop: 36 }}>맛보기 설문이에요(로그인 없이 {SIMPLE_IDS.length}문항). 결과는 이 기기에서 계산하고, 통계용으로 이름·이메일 없이 구간 값만 저장해요(<Link to="/privacy" onClick={onClose}>개인정보처리방침</Link>). 더 정확한 점검은 로그인 후 <button type="button" className="link-btn" onClick={() => { onClose(); openDeep() }}>심화 설문</button>에서 할 수 있어요.</p>
        ) : (
          <p className="hint" style={{ marginTop: 36 }}>심화 설문이에요. 질문은 「청정(靑定) 세종 · 청년 주거 경험 설문」과 같아요.</p>
        )}
      </div>
    </div>
  )
}
