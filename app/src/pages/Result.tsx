import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LayoutGroup, motion } from 'framer-motion'
import { compareCost, evaluate, warnings } from '../lib/eligibility'
import type { Status } from '../lib/eligibility'
import { POLICIES, RULES } from '../data/policies'
import { Btn, CountUp, Lines, SourceBlock, Term, VBadge } from '../ui'
import { useStore } from '../store'
import { Feedback } from '../components/Feedback'
import { Footer } from './Home'

const LABEL: Record<Status, { t: string; g: string }> = {
  ok: { t: '신청할 수 있어요', g: '✓' },
  maybe: { t: '확인해 보면 좋아요', g: '△' },
  no: { t: '지금은 어려워요', g: '✕' },
}
const UNKNOWN_TXT: Record<string, string> = {
  hasLoan: '기존 전세대출이 있는지',
  usedBefore: '세종시 지원을 받은 적이 있는지',
  houseType: '구하는 집이 다중주택(원룸·고시원)인지',
}
const FILTERS: { id: 'all' | Status; t: string }[] = [
  { id: 'all', t: '전체' }, { id: 'ok', t: '✓ 신청할 수 있어요' }, { id: 'maybe', t: '△ 확인해 보면 좋아요' }, { id: 'no', t: '✕ 지금은 어려워요' },
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
  const pickOne = verdicts.some((v) => v.codes.includes('EXCL_PICK_ONE') && v.id === 'sejongInterest')
  const unknown = (a.unknown ?? []).filter((k) => UNKNOWN_TXT[k])
  const best = count('ok') + count('maybe')

  return (
    <>
      <main className="result">
        <div className="wrap">
          <span className="label">내 결과{user ? ` · ${user.name}` : ''} · {new Date().toLocaleDateString('ko-KR')}</span>
          <Lines
            as="h1" className="display"
            lines={best > 0
              ? [<span className="l" key="1">받을 수 있는 지원이</span>, <span key="2"><span className="em">{best}개</span> 있어요</span>]
              : [<span className="l" key="1">아직은 맞는 지원이</span>, <span key="2"><span className="em">없지만</span> 괜찮아요</span>]}
          />
          <p style={{ color: 'var(--ink-2)', maxWidth: 560 }}>
            {best > 0 ? '아래에서 이유와 다음에 할 일을 천천히 살펴보세요. 순서를 지키는 게 가장 중요해요.' : '너무 속상해하지 않으셔도 돼요. 어려운 이유를 쉬운 말로 풀어 두었고, 조건이 바뀌면 결과도 달라질 수 있어요.'}
          </p>

          <div className="tally" aria-label="요약">
            <div className="t-ok"><b className="num"><CountUp to={count('ok')} /></b><span>✓ 신청할 수 있어요</span></div>
            <div className="t-maybe"><b className="num"><CountUp to={count('maybe')} /></b><span>△ 확인해 보면 좋아요</span></div>
            <div className="t-no"><b className="num"><CountUp to={count('no')} /></b><span>✕ 지금은 어려워요</span></div>
          </div>

          {warns.map((w, i) => (
            <div key={i} className={`strip ${w.tone === 'stop' ? 'stop' : ''}`} role={w.tone === 'stop' ? 'alert' : undefined}>
              <span className="ico" aria-hidden="true">{w.tone === 'stop' ? '!' : '✓'}</span>
              <span><b>{w.tone === 'stop' ? '이것만은 조심해 주세요' : '미리 챙겨 두면 좋아요'}</b>{w.text}</span>
            </div>
          ))}
          {unknown.length > 0 && (
            <div className="strip ask">
              <span className="ico" aria-hidden="true">?</span>
              <span><b>"잘 모르겠어요"라고 하신 항목</b>없다고 보고 계산했어요. 한 번 확인해 보세요: {unknown.map((k) => UNKNOWN_TXT[k]).join(' / ')}</span>
            </div>
          )}

          <LayoutGroup>
            <div className="filters" role="group" aria-label="결과 필터" style={{ marginTop: 40, marginBottom: 0 }}>
              {FILTERS.map((x) => (
                <button key={x.id} className="fchip" type="button" aria-pressed={f === x.id} onClick={() => setF(x.id)}>
                  {f === x.id && <motion.span layoutId="rchip" className="bg" transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />}
                  <span>{x.t}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          <div className="verdicts">
            {shown.map((v) => {
              const p = POLICIES.find((x) => x.id === v.id)!
              const L = LABEL[v.status]
              return (
                <article key={v.id} className="vd" aria-label={`${p.name}: ${L.t}`}>
                  <div><span className={`status ${v.status}`}><i data-g={L.g} aria-hidden="true" />{L.t}</span></div>
                  <div>
                    <h3>{p.name}</h3>
                    <p className="easy">{p.easy}</p>
                    {v.status !== 'no' && <div style={{ marginTop: 18 }}><Btn href={p.apply.url} external size="sm">{`${p.apply.name.split(' ')[0]}에서 신청하기`}</Btn></div>}
                  </div>
                  <div>
                    <ul>{v.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                    {v.todo.length > 0 && <div className="todo"><b>다음에 할 일</b>{v.todo.map((t, i) => <div key={i}>• {t}</div>)}</div>}
                  </div>
                  <SourceBlock ids={p.sourceIds} />
                </article>
              )
            })}
          </div>

          {cost && pickOne && (
            <section className="cmp-wrap" aria-labelledby="cmp-t">
              <span className="label" style={{ color: 'rgba(243,239,231,.6)' }}>둘 중 하나 · 예시 계산</span>
              <h2 id="cmp-t">둘 중 하나만 받을 수 있어요.<br /><span className="em">6년 동안 낼 이자</span>를 비교해 볼게요</h2>
              <p style={{ color: 'rgba(243,239,231,.75)', maxWidth: 620 }}><Term id="pickone" />이라서 6년 동안 내가 내게 될 이자를 비교해 봤어요. 시중 은행 금리는 사람마다 달라서 직접 움직여 보실 수 있게 해 두었어요.</p>
              <div style={{ margin: '22px 0 6px' }}>
                <label htmlFor="bank"><b>시중 은행 대출금리(가정): <span className="num" style={{ fontSize: 22 }}>{bank.toFixed(1)}%</span></b></label>
                <input id="bank" type="range" min={3} max={6} step={0.1} value={bank} onChange={(e) => setBank(Number(e.target.value))} />
              </div>
              <div className="compare">
                <div className={`cmp ${cost.better === 'buteemok' ? 'win' : ''}`}>
                  <span className="label" style={{ color: 'inherit', opacity: 0.7 }}>버팀목 (나라)</span>
                  <b className="big num">{cost.buteemok6y.toLocaleString()}<small style={{ fontSize: '0.3em', letterSpacing: 0 }}>만원</small></b>
                  <p>대출 {Math.round(cost.loanButeemok).toLocaleString()}만원 × 연 {cost.buteemokRate}% × 6년</p>
                  {cost.better === 'buteemok' && <p><b>✓ 이쪽이 부담이 더 적어요</b></p>}
                </div>
                <div className={`cmp ${cost.better === 'interest' ? 'win' : ''}`}>
                  <span className="label" style={{ color: 'inherit', opacity: 0.7 }}>세종 이자지원</span>
                  <b className="big num">{cost.interest6y.toLocaleString()}<small style={{ fontSize: '0.3em', letterSpacing: 0 }}>만원</small></b>
                  <p>대출 {Math.round(cost.loanInterest).toLocaleString()}만원 × 내가 내는 이자 {cost.interestSelf}% × 6년</p>
                  {cost.better === 'interest' && <p><b>✓ 이쪽이 부담이 더 적어요</b></p>}
                </div>
              </div>
              <p className="chart-note">
                ※ 예시 계산이에요. 버팀목 금리는 소득에 따라 연 {a.marital === 'single' ? `${RULES.youthButeemok.rateMin}~${RULES.youthButeemok.rateMax}` : `${RULES.newlywedButeemok.rateMin}~${RULES.newlywedButeemok.rateMax}`}% 범위에서 추정했고, 세종 이자지원은 은행금리에서 최대 {RULES.sejongInterest.maxSupportRate}%p를 빼서 계산했어요. 이자지원은 보증료 같은 부대비용을 따로 내야 하고 대출 가능 금액도 달라서 실제와 차이가 나요. 신청 전 은행에서 확인하세요. <VBadge v="secondary" />
              </p>
            </section>
          )}

          <p className="disclaimer">
            결과는 <b>참고용</b>이에요. 최종 판단은 각 기관에서 해요. 공고 기준일은 항목마다 표시해 두었어요. 입력하신 정보는 이 기기에만 저장되고 서버로 보내지 않았어요.
            {a.deal === 'banjeonse' && ' 반전세가 “전세계약”으로 인정되는지는 공식 기준을 확인하지 못해 "확인 필요"로 표시했어요.'}
          </p>

          <div className="restart">
            <Btn to="/diagnose">다시 해 보기</Btn>
            <Btn to="/#policies" variant="line">제도 전체 보기</Btn>
          </div>

          <section style={{ margin: '80px 0 100px' }} aria-labelledby="fb-r">
            <Lines id="fb-r" className="display" lines={[<span className="l" key="1">집을 구할 때</span>, <span key="2">가장 <span className="em">마음 쓰이는</span> 비용은?</span>]} />
            <div style={{ maxWidth: 860, marginTop: 36 }}><Feedback /></div>
          </section>
        </div>
      </main>
      <Footer tone="paper" />
    </>
  )
}
