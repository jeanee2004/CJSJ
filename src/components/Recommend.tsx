import { useState } from 'react'
import type { CostBasis, RateBasis } from '../lib/eligibility'
import type { Rec } from '../lib/recommend'
import { Btn } from '../ui'

// 먼저 보여 줄 카드 수. 나머지는 "더 보기"로 편다
const TOP = 3
const YEARS = [1, 2, 6] as const
const RATES: { id: RateBasis; t: string }[] = [{ id: 'min', t: '낮게 (범위 하단)' }, { id: 'est', t: '소득으로 추정' }, { id: 'max', t: '높게 (범위 상단)' }]
const STATUS = { ok: { t: '신청할 수 있어요', g: '✓' }, maybe: { t: '확인해 보면 좋아요', g: '△' } } as const

function Chips<T extends string | number>({ label, value, opts, onChange }: { label: string; value: T; opts: { id: T; t: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="rec-basis-row" role="group" aria-label={label}>
      <b>{label}</b>
      {opts.map((o) => (
        <button key={o.id} type="button" className="fchip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {value === o.id && <span className="bg" />}
          <span>{o.t}</span>
        </button>
      ))}
    </div>
  )
}

/** 결과 화면 맨 위: 진단 제도 + 공공 API 제도를 먼저 할 순서대로. 금액 비교 기준은 사용자가 고른다 */
export function Recommendations({ recs, basis, onBasis, apiState }: { recs: Rec[]; basis: CostBasis; onBasis: (b: CostBasis) => void; apiState: 'loading' | 'ok' | 'error' }) {
  const [more, setMore] = useState(false)
  const shown = more ? recs : recs.slice(0, TOP)
  return (
    <section className="live rec" aria-labelledby="rec-t">
      <span className="label">추천 순서</span>
      <h2 id="rec-t">먼저 할 일</h2>
      <p className="hint" style={{ marginBottom: 14 }}>지금 접수 중인지, 계약 단계에 맞는지, 받거나 아끼는 돈이 얼마인지 순서로 정렬했어요. 함께 받을 수 없는 제도는 더 이득인 쪽만 올렸어요.</p>
      <div className="rec-basis">
        <Chips label="비교 기간" value={basis.years} opts={YEARS.map((y) => ({ id: y, t: `${y}년` }))} onChange={(years) => onBasis({ ...basis, years })} />
        <Chips label="버팀목 금리" value={basis.rate} opts={RATES} onChange={(rate) => onBasis({ ...basis, rate })} />
      </div>
      {apiState === 'loading' && <p className="hint">최신 접수 일정과 혜택을 불러오는 중이에요. 먼저 진단 결과로 정렬해 두었어요.</p>}
      {apiState === 'error' && <p className="hint">최신 데이터를 불러오지 못했습니다. 진단 결과만으로 정렬했어요.</p>}
      {recs.length === 0 && <p className="hint">지금 바로 신청할 수 있는 지원은 없어요. 아래에서 어려운 이유와 조건이 바뀌면 받을 수 있는 지원을 확인하세요.</p>}
      {shown.length > 0 && (
        <ol className="live-cards rec-list">
          {shown.map((r, i) => (
            <li key={r.key} className="live-card">
              <span className="label">{i + 1}순위 · {r.from === 'verdict' ? '진단' : '공공 API'}</span>
              <h3>{r.name}</h3>
              <span className={`status ${r.status}`}><i data-g={STATUS[r.status].g} aria-hidden="true" />{STATUS[r.status].t}</span>
              <ul className="rec-why">{r.why.map((w, j) => <li key={j}>{w}</li>)}</ul>
              {r.url && <div style={{ marginTop: 14 }}><Btn href={r.url} external size="sm" variant="line">안내·신청 페이지</Btn></div>}
            </li>
          ))}
        </ol>
      )}
      {recs.length > TOP && (
        <p className="hint" style={{ marginTop: 12 }}>
          <button type="button" className="term" onClick={() => setMore((x) => !x)}>{more ? `${TOP}개만 보기` : `${recs.length - TOP}개 더 보기`}</button>
        </p>
      )}
    </section>
  )
}
