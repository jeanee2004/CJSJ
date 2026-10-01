import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_ANSWERS } from '../lib/eligibility'
import type { Answers, Deal, HouseType, Marital, Stage } from '../lib/eligibility'
import { Btn, Term } from '../ui'
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

function NumberField({ value, onChange, unit, presets, hint, max }: { value: number; onChange: (n: number) => void; unit: string; presets: number[]; hint?: ReactNode; max?: number }) {
  return (
    <>
      <div className="num-field">
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

interface Step {
  id: string
  title: ReactNode | ((a: Answers) => ReactNode)
  why: ReactNode
  show?: (a: Answers) => boolean
  body: (a: Answers, set: (p: Partial<Answers>) => void, next: () => void) => ReactNode
  valid?: (a: Answers) => boolean
}

const UNK = (a: Answers, key: string, on: boolean): string[] => {
  const s = new Set(a.unknown ?? [])
  if (on) s.add(key)
  else s.delete(key)
  return [...s]
}

const STEPS: Step[] = [
  {
    id: 'age',
    title: '올해 만 몇 살이신가요?',
    why: <>제도마다 나이 기준이 달라서 여쭤봐요(19~34세 / 19~39세). <b>만 나이</b>는 생일이 지나야 한 살 늘어나요.</>,
    body: (a, set) => (
      <div className="stepper">
        <button type="button" aria-label="한 살 줄이기" onClick={() => set({ age: Math.max(15, a.age - 1) })}>−</button>
        <output aria-live="polite">{a.age}<small>세</small></output>
        <button type="button" aria-label="한 살 늘리기" onClick={() => set({ age: Math.min(60, a.age + 1) })}>＋</button>
      </div>
    ),
  },
  {
    id: 'marital',
    title: '지금 어떤 상황이신가요?',
    why: <>혼자이신지, 결혼하셨는지에 따라 소득 기준이 크게 달라져요. 결혼 7년 이내이거나 6개월 안에 결혼할 예정이면 <b>신혼부부</b> 제도를 볼 수 있어요.</>,
    body: (a, set, next) => (
      <Choice<Marital>
        value={a.marital}
        onPick={(v) => { set({ marital: v, ...(v !== 'single' ? { livesApart: true } : {}) }); next() }}
        opts={[
          { v: 'single', t: '혼자 살아요 (미혼)', d: '1인 가구' },
          { v: 'newlywed', t: '결혼했어요 (7년 이내)', d: '신혼부부' },
          { v: 'planning', t: '곧 결혼해요 (6개월 이내)', d: '예비부부' },
        ]}
      />
    ),
  },
  {
    id: 'income',
    title: (a: Answers) => (a.marital === 'single' ? '1년 소득은 대략 얼마인가요?' : '두 분의 1년 소득을 합치면 얼마인가요?'),
    why: <><Term id="income" />은 세금 떼기 전 1년 치 수입이에요. 부부라면 둘이 번 돈을 합쳐요(<Term id="combined" />). 월급 250만원이면 약 3,000만원이에요.</>,
    body: (a, set) => (
      <NumberField
        value={a.income} onChange={(n) => set({ income: n })} unit="만원 / 연" presets={[0, 2000, 3000, 4000, 5000, 6500, 8500]}
        hint={`월급으로 환산하면 약 ${Number.isNaN(a.income) ? 0 : Math.round(a.income / 12).toLocaleString()}만원이에요. 소득이 없는 대학생이라면 0을 눌러 주세요.`}
      />
    ),
    valid: (a) => !Number.isNaN(a.income),
  },
  {
    id: 'livesApart',
    title: '부모님과 따로 살고 계신가요?',
    why: <>부모님과 주소가 같으면 못 받는 월세 지원이 있어요. 주민등록상 주소 기준이에요.</>,
    show: (a) => a.marital === 'single',
    body: (a, set, next) => (
      <Choice<boolean> value={a.livesApart} onPick={(v) => { set({ livesApart: v }); next() }} opts={[
        { v: true, t: '네, 주소가 따로예요' }, { v: false, t: '아니요, 같은 주소예요', d: '부모님 집에 같이 있어요' },
      ]} />
    ),
  },
  {
    id: 'ownsHome',
    title: <>내 이름으로 된 집이 있나요?</>,
    why: <>대부분 <Term id="nohome" /> 사람만 받을 수 있어요. 부모님 집은 해당 안 돼요.</>,
    body: (a, set, next) => (
      <Choice<boolean> value={a.ownsHome} onPick={(v) => { set({ ownsHome: v }); next() }} opts={[
        { v: false, t: '없어요 (무주택)' }, { v: true, t: '있어요' },
      ]} />
    ),
  },
  {
    id: 'hasLoan',
    title: '지금 이용 중인 전세대출이 있나요?',
    why: <>이미 전세대출(<Term id="buteemok" /> 등)이 있으면 세종 <Term id="interest" />을 못 받아요. 둘이 겹치면 안 되거든요.</>,
    body: (a, set, next) => (
      <Choice<string> value={a.unknown?.includes('hasLoan') ? 'unk' : String(a.hasLoan)} onPick={(v) => { set({ hasLoan: v === 'true', unknown: UNK(a, 'hasLoan', v === 'unk') }); next() }} opts={[
        { v: 'false', t: '없어요' }, { v: 'true', t: '있어요' }, { v: 'unk', t: '잘 모르겠어요', d: '없다고 보고 계산한 뒤, 결과에서 다시 확인하실 수 있게 알려드려요' },
      ]} />
    ),
  },
  {
    id: 'usedBefore',
    title: '세종시 이자지원이나 임대료 지원을 받은 적 있나요?',
    why: <>이 두 가지는 <Term id="lifeonce" />이에요. 한 번 받았으면 다시 못 받아요.</>,
    body: (a, set, next) => (
      <Choice<string> value={a.unknown?.includes('usedBefore') ? 'unk' : String(a.usedBefore)} onPick={(v) => { set({ usedBefore: v === 'true', unknown: UNK(a, 'usedBefore', v === 'unk') }); next() }} opts={[
        { v: 'false', t: '받은 적 없어요' }, { v: 'true', t: '받은 적 있어요' }, { v: 'unk', t: '잘 모르겠어요' },
      ]} />
    ),
  },
  {
    id: 'deal',
    title: '어떤 방식으로 집을 구하고 계세요?',
    why: <>전세인지 월세인지에 따라 받을 수 있는 지원이 완전히 달라요. 헷갈리면 아래 설명을 보세요.</>,
    body: (a, set, next) => (
      <Choice<Deal> value={a.deal} onPick={(v) => { set({ deal: v, ...(v === 'jeonse' ? { rent: 0, deposit: 12000 } : { rent: a.rent || 50, deposit: a.deposit > 10000 ? 1000 : a.deposit }) }); next() }} opts={[
        { v: 'jeonse', t: '전세', d: '큰 보증금만 맡기고 월세는 없어요' },
        { v: 'banjeonse', t: '반전세', d: '보증금이 꽤 크고 월세도 조금 내요' },
        { v: 'wolse', t: '월세 (보증부 월세)', d: '보증금은 작게, 매달 월세를 내요' },
      ]} />
    ),
  },
  {
    id: 'money',
    title: (a: Answers) => (a.deal === 'jeonse' ? '전세금(보증금)은 얼마 정도인가요?' : '보증금과 월세는 얼마 정도인가요?'),
    why: <><Term id="deposit" />과 월세가 정해진 금액을 넘으면 지원이 안 돼요. 아직 정해지지 않았다면 대략 생각하는 금액을 넣어요.</>,
    body: (a, set) => (
      <>
        <p className="label" style={{ marginBottom: 6 }}>보증금</p>
        <NumberField value={a.deposit} onChange={(n) => set({ deposit: n })} unit="만원" presets={a.deal === 'jeonse' ? [8000, 12000, 15000, 20000] : [500, 1000, 3000, 5000]}
          hint={`1만원 단위예요. 지금 ${Number.isNaN(a.deposit) ? 0 : (a.deposit / 10000).toFixed(1)}억원이에요.`} />
        {a.deal !== 'jeonse' && (
          <>
            <p className="label" style={{ margin: '18px 0 6px' }}>월세 (매달)</p>
            <NumberField value={a.rent} onChange={(n) => set({ rent: n })} unit="만원 / 월" presets={[30, 40, 50, 60, 70]} />
          </>
        )}
      </>
    ),
    valid: (a) => !Number.isNaN(a.deposit) && a.deposit >= 0 && (a.deal === 'jeonse' || !Number.isNaN(a.rent)),
  },
  {
    id: 'houseType',
    title: '구하시는 집은 어떤 종류인가요?',
    why: <>원룸·고시원처럼 방을 쪼개 쓰는 <Term id="multihouse" />은 지원에서 빠지는 경우가 많아요. 계약서의 "건축물 용도"를 보면 알 수 있어요.</>,
    body: (a, set, next) => (
      <Choice<string> value={a.unknown?.includes('houseType') ? 'unk' : a.houseType} onPick={(v) => { set({ houseType: v === 'multi' ? 'multi' : ('normal' as HouseType), unknown: UNK(a, 'houseType', v === 'unk') }); next() }} opts={[
        { v: 'normal', t: '아파트·빌라·오피스텔', d: '독립된 한 가구가 쓰는 집' },
        { v: 'multi', t: '원룸·고시원 (다중주택)', d: '건물 한 채를 여러 방으로 나눈 곳' },
        { v: 'unk', t: '아직 모르겠어요' },
      ]} />
    ),
  },
  {
    id: 'stage',
    title: '지금 집 계약은 어디까지 진행됐나요?',
    why: <>이 질문이 가장 중요해요. 같은 지원도 <b>계약 어느 시점이냐</b>에 따라 받을 수도, 못 받을 수도 있어요. <Term id="jan" />을 치르기 전과 후가 특히 달라요.</>,
    body: (a, set, next) => (
      <Choice<Stage> value={a.stage} onPick={(v) => { set({ stage: v }); next() }} opts={[
        { v: 'explore', t: '아직 집을 보러 다녀요', d: '계약 전' },
        { v: 'contract', t: '계약했어요 (잔금 전)', d: '가계약·본계약 후 잔금은 아직' },
        { v: 'paid', t: '잔금까지 냈어요', d: '아직 이사는 안 했을 수도 있어요' },
        { v: 'movedin', t: '이미 이사했어요 (전입 완료)' },
      ]} />
    ),
  },
]

const LABELS: Record<string, string> = { age: '나에 대해', marital: '나에 대해', income: '소득', livesApart: '나에 대해', ownsHome: '지원 이력', hasLoan: '지원 이력', usedBefore: '지원 이력', deal: '구하는 집', money: '구하는 집', houseType: '구하는 집', stage: '진행 단계' }

export function DiagnoseFlow({ onClose }: { onClose: () => void }) {
  const { answers, setAnswers } = useStore()
  const nav = useNavigate()
  const [a, setA] = useState<Answers>({ ...DEFAULT_ANSWERS, unknown: [] })
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  void answers

  const visible = STEPS.filter((s) => !s.show || s.show(a))
  const idx = Math.min(i, visible.length - 1)
  const step = visible[idx]
  const set = (p: Partial<Answers>) => setA((prev) => ({ ...prev, ...p }))
  const finish = (final: Answers) => { setAnswers(final); onClose(); nav('/result') }
  const go = (n: number) => { setDir(n > 0 ? 1 : -1); setI((x) => Math.max(0, x + n)) }
  const isLast = idx === visible.length - 1
  const ok = step.valid ? step.valid(a) : true
  const next = () => { if (isLast) finish(a); else go(1) }
  // 선택형 질문은 바로 넘어가므로, 상태 반영 후 이동하도록 setTimeout 사용
  const autoNext = () => setTimeout(() => (isLast ? undefined : go(1)), 180)
  const title = typeof step.title === 'function' ? step.title(a) : step.title

  const hues: [string, string][] = [['var(--blush)', 'var(--aqua)'], ['var(--mint)', 'var(--peri)'], ['var(--aqua)', 'var(--blush)'], ['var(--peri)', 'var(--mint)'], ['var(--blush)', 'var(--mint)'], ['var(--tint)', 'var(--aqua)']]
  const [h1, h2] = hues[idx % hues.length]

  return (
    <div className="diag-flow" style={{ ['--hc1' as string]: h1, ['--hc2' as string]: h2 }}>
      <div>
        <div className="diag-top">
          <span className="label">질문 {String(idx + 1).padStart(2, '0')} / {String(visible.length).padStart(2, '0')} · {LABELS[step.id]}</span>
          <span className="label">약 {Math.max(1, Math.ceil((visible.length - idx) * 0.3))}분 남았어요</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={visible.length} aria-valuenow={idx + 1}><i style={{ width: `${((idx + 1) / visible.length) * 100}%` }} /></div>
          <section key={step.id} className="diag-grid step-in" aria-live="polite" style={{ ['--dir' as string]: dir }}>
            <div className="diag-side">
              <span className="diag-no" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</span>
              <h1>{title}</h1>
              <div className="why"><b>여쭤보는 이유</b>{step.why}</div>
            </div>
            <div className="diag-main">
              {step.body(a, set, () => { if (!isLast) autoNext() })}
              <div className="nav-row">
                <button className="back" type="button" onClick={() => go(-1)} style={{ visibility: idx === 0 ? 'hidden' : 'visible' }}>← 이전</button>
                <Btn onClick={next} disabled={!ok}>{isLast ? '결과 보기' : '다음'}</Btn>
              </div>
            </div>
          </section>
        <p className="hint" style={{ marginTop: 36 }}>입력한 내용은 서버로 보내지 않고 이 기기에만 저장돼요.</p>
      </div>
    </div>
  )
}
