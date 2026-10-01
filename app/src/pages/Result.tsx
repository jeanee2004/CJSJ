import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { LayoutGroup, motion } from 'framer-motion'
import { compareCost, evaluate, warnings } from '../lib/eligibility'
import type { Status } from '../lib/eligibility'
import { POLICIES } from '../data/policies'
import { RULES } from '../data/policies'
import { SourceBlock, Term, VBadge, reduced, spotlight } from '../ui'
import { useStore } from '../store'
import { Feedback } from '../components/Feedback'
import { Footer } from './Home'

const LABEL: Record<Status, { t: string; icon: string }> = {
  ok: { t: '받을 수 있어요', icon: '✓' },
  maybe: { t: '확인이 필요해요', icon: '△' },
  no: { t: '어려워요', icon: '✕' },
}
const UNKNOWN_TXT: Record<string, string> = {
  hasLoan: '기존 전세대출이 있는지',
  usedBefore: '세종시 지원을 받은 적이 있는지',
  houseType: '구하는 집이 다중주택(원룸·고시원)인지',
}
const FILTERS: { id: 'all' | Status; t: string }[] = [
  { id: 'all', t: '전체' }, { id: 'ok', t: '✓ 받을 수 있어요' }, { id: 'maybe', t: '△ 확인 필요' }, { id: 'no', t: '✕ 어려워요' },
]

export default function Result() {
  const { answers: a, hasSaved, user } = useStore()
  const [f, setF] = useState<'all' | Status>('all')
  const [bank, setBank] = useState(4.5)
  const verdicts = useMemo(() => evaluate(a), [a])
  const warns = useMemo(() => warnings(a), [a])
  const cost = useMemo(() => compareCost(a, bank), [a, bank])
  if (!hasSaved) return <Navigate to="/diagnose" replace />

  const count = (s: Status) => verdicts.filter((v) => v.status === s).length
  const shown = verdicts.filter((v) => f === 'all' || v.status === f)
  const pickOne = verdicts.some((v) => v.codes.includes('EXCL_PICK_ONE') && (v.id === 'sejongInterest'))
  const unknown = (a.unknown ?? []).filter((k) => UNKNOWN_TXT[k])
  const best = count('ok') + count('maybe')

  return (
    <>
      <main className="result">
        <div className="wrap">
          <span className="label">YOUR RESULT{user ? ` · ${user.name}` : ''}</span>
          <h1>
            {best > 0 ? <>받을 수 있는 지원이 <span style={{ color: 'var(--blue-600)' }}>{best}개</span> 있어요</> : <>지금 조건으로는 받을 수 있는 지원이 없어요</>}
          </h1>
          <p style={{ color: 'var(--ink-700)', maxWidth: 640 }}>
            {best > 0 ? '아래 카드에서 이유와 다음에 할 일을 확인하세요. 순서를 지키는 게 가장 중요해요.' : '낙담하지 마세요. 어떤 이유로 어려운지 쉽게 풀어 놓았어요. 조건을 바꾸면 달라질 수 있어요.'}
          </p>
          <div className="summary" aria-label="요약">
            <span className="sum-pill status ok">✓ 받을 수 있어요 {count('ok')}</span>
            <span className="sum-pill status maybe">△ 확인 필요 {count('maybe')}</span>
            <span className="sum-pill status no">✕ 어려워요 {count('no')}</span>
          </div>

          {warns.map((w, i) => (
            <div key={i} className={`warn-strip ${w.tone}`} role={w.tone === 'stop' ? 'alert' : undefined}>
              <span className="ico" aria-hidden="true">{w.tone === 'stop' ? '⛔' : '📌'}</span>
              <span><b>{w.tone === 'stop' ? '지금 하면 안 되는 일' : '꼭 챙기세요'} · </b>{w.text}</span>
            </div>
          ))}

          {unknown.length > 0 && (
            <div className="warn-strip" style={{ marginTop: 12 }}>
              <span className="ico" aria-hidden="true">❓</span>
              <span>"모르겠다"고 하신 항목은 없다고 가정했어요. 꼭 확인하세요: {unknown.map((k) => UNKNOWN_TXT[k]).join(' / ')}</span>
            </div>
          )}

          <LayoutGroup>
            <div className="chips" role="group" aria-label="결과 필터" style={{ marginTop: 28 }}>
              {FILTERS.map((x) => (
                <button key={x.id} className="chip" type="button" aria-pressed={f === x.id} onClick={() => setF(x.id)}>
                  {f === x.id && <motion.span layoutId="rchip" className="bg" transition={{ duration: reduced() ? 0 : 0.4 }} />}
                  <span>{x.t}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          <div className="grid two">
            {shown.map((v) => {
              const p = POLICIES.find((x) => x.id === v.id)!
              const L = LABEL[v.status]
              return (
                <article key={v.id} className="card verdict spot" onMouseMove={spotlight} aria-label={`${p.name}: ${L.t}`}>
                  <span className={`status ${v.status}`}><span aria-hidden="true">{L.icon}</span> {L.t}</span>
                  <h3>{p.name}</h3>
                  <p style={{ color: 'var(--ink-700)' }}>{p.easy}</p>
                  <ul>{v.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  {v.todo.length > 0 && <div className="todo"><b>다음에 할 일</b>{v.todo.map((t, i) => <div key={i}>• {t}</div>)}</div>}
                  {v.status !== 'no' && <a className="link-arrow" href={p.apply.url} target="_blank" rel="noreferrer noopener">{p.apply.name}에서 신청 ↗</a>}
                  <SourceBlock ids={p.sourceIds} />
                </article>
              )
            })}
          </div>

          {cost && pickOne && (
            <section className="card" style={{ marginTop: 28 }} aria-labelledby="cmp-t">
              <span className="label">PICK ONE · 예시 계산</span>
              <h2 id="cmp-t" style={{ fontSize: 28, margin: '8px 0' }}>둘 중 하나만 받을 수 있어요. 6년 이자를 비교해 볼게요</h2>
              <p style={{ color: 'var(--ink-700)' }}><Term id="pickone" />라서, 6년 동안 내가 내는 이자를 비교했어요. 시중 은행 금리는 사람마다 달라서 직접 움직여 보세요.</p>
              <div style={{ margin: '16px 0' }}>
                <label htmlFor="bank"><b>시중 은행 대출금리(가정): {bank.toFixed(1)}%</b></label>
                <input id="bank" type="range" min={3} max={6} step={0.1} value={bank} onChange={(e) => setBank(Number(e.target.value))} />
              </div>
              <div className="compare">
                <div className={`cmp ${cost.better === 'buteemok' ? 'win' : ''}`}>
                  <span className="label">버팀목 (나라)</span>
                  <b className="big">{cost.buteemok6y.toLocaleString()}만원</b>
                  <p>대출 {Math.round(cost.loanButeemok).toLocaleString()}만원 × 연 {cost.buteemokRate}% × 6년</p>
                  {cost.better === 'buteemok' && <p><b>✓ 이쪽이 더 적게 내요</b></p>}
                </div>
                <div className={`cmp ${cost.better === 'interest' ? 'win' : ''}`}>
                  <span className="label">세종 이자지원</span>
                  <b className="big">{cost.interest6y.toLocaleString()}만원</b>
                  <p>대출 {Math.round(cost.loanInterest).toLocaleString()}만원 × 내가 내는 이자 {cost.interestSelf}% × 6년</p>
                  {cost.better === 'interest' && <p><b>✓ 이쪽이 더 적게 내요</b></p>}
                </div>
              </div>
              <p className="chart-note">
                ※ 예시 계산이에요. 버팀목 금리는 소득에 따라 연 {a.marital === 'single' ? `${RULES.youthButeemok.rateMin}~${RULES.youthButeemok.rateMax}` : `${RULES.newlywedButeemok.rateMin}~${RULES.newlywedButeemok.rateMax}`}% 범위에서 추정했고, 세종 이자지원은 은행금리에서 최대 {RULES.sejongInterest.maxSupportRate}%p를 빼서 계산했어요. 이자지원은 보증료 같은 부대비용을 따로 내야 하고, 대출 가능 금액도 달라서 실제와 차이가 나요. 신청 전 은행에서 확인하세요. <VBadge v="secondary" />
              </p>
            </section>
          )}

          <p className="disclaimer">
            결과는 <b>참고용</b>이에요. 최종 판단은 각 기관이 해요. 공고 기준일은 카드마다 표시했어요. 입력한 정보는 이 기기에만 저장되고 서버로 보내지 않았어요.
            {a.deal === 'banjeonse' && ' 반전세가 “전세계약”으로 인정되는지는 공식 기준을 확인하지 못해 "확인 필요"로 표시했어요.'}
          </p>

          <div className="restart">
            <Link className="pill" to="/diagnose">다시 해보기 ↘</Link>
            <Link className="pill ghost" to="/#policies">제도 전체 보기</Link>
          </div>

          <section style={{ marginTop: 48 }} aria-labelledby="fb-r">
            <h2 id="fb-r" style={{ fontSize: 26, marginBottom: 14 }}>가장 부담스러운 돈은 뭐예요?</h2>
            <Feedback />
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
