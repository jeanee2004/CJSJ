import { useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { compareCost, evaluate, warnings } from '../lib/eligibility'
import { summarize } from '../lib/survey'
import type { Survey } from '../data/survey'
import type { Status } from '../lib/eligibility'
import { POLICIES, RULES } from '../data/policies'
import { Btn, CountUp, Lines, SourceBlock, Term, VBadge } from '../ui'
import { useStore } from '../store'
import { Footer } from './Home'
import { ExtraBenefits, PublicRentals } from '../components/LiveCards'
import { todayKst, useApi } from '../lib/api'
import type { BenefitsRes } from '../lib/api'
import { applySchedules } from '../lib/live'
import { Navigate } from 'react-router-dom'

const LABEL: Record<Status, { t: string; g: string }> = {
  ok: { t: '신청할 수 있어요', g: '✓' },
  maybe: { t: '확인해 보면 좋아요', g: '△' },
  no: { t: '지금은 어려워요', g: '✕' },
}
const UNKNOWN_TXT: Record<string, string> = {
  income: '1년 소득이 얼마인지 (소득 증빙은 홈택스에서 뗄 수 있어요)',
  ownsHome: '내 이름으로 된 집이 없는지',
  livesApart: '부모님과 주민등록 주소가 따로인지 (주민등록등본에서 확인)',
  deal: '계약이 전세인지 월세인지 (계약서의 "차임/월세" 칸을 보세요)',
  money: '보증금·월세가 얼마인지',
  hasLoan: '기존 전세대출이 있는지',
  usedBefore: '세종시 지원을 받은 적이 있는지',
  houseType: '구하는 집이 다중주택(원룸·고시원)인지',
}
const BARRIER_TIP: Record<string, string> = {
  '2': '절차가 복잡하다고 하신 분이 많아요. 아래 카드의 "다음에 할 일"에 순서대로 적어 두었어요.',
  '3': '서류 준비가 부담스럽다면 정부24·홈택스에서 온라인으로 뗄 수 있는 것부터 챙겨 보세요.',
  '4': '신청 방법·시기는 아래 카드의 "신청하기" 버튼과 접수 일정에서 확인할 수 있어요.',
  '6': '지원 금액이 적더라도 월세 지원과 이자 지원을 비교해 더 큰 쪽을 고를 수 있어요.',
}
const FILTERS: { id: 'all' | Status; t: string }[] = [
  { id: 'all', t: '전체' }, { id: 'ok', t: '✓ 신청할 수 있어요' }, { id: 'maybe', t: '△ 확인해 보면 좋아요' }, { id: 'no', t: '✕ 지금은 어려워요' },
]

export default function Result() {
  const { answers: a, hasSaved, user, openModal, persisted, openLogin } = useStore()
  const [f, setF] = useState<'all' | Status>('all')
  const [bank, setBank] = useState(4.5)
  // 자격 판정은 evaluate 그대로, 접수 일정만 공공 API(온통청년 우선)로 덧붙인다. 불러오지 못하면 기존 판정을 쓴다
  const benefits = useApi<BenefitsRes>('/api/benefits')
  const items = benefits.state === 'ok' ? benefits.data.items : null
  const verdicts = useMemo(() => (items ? applySchedules(evaluate(a), items, todayKst()) : evaluate(a)), [a, items])
  const warns = useMemo(() => warnings(a), [a])
  const cost = useMemo(() => compareCost(a, bank), [a, bank])
  if (!hasSaved) return <Navigate to="/" replace />

  const count = (s: Status) => verdicts.filter((v) => v.status === s).length
  const shown = verdicts.filter((v) => f === 'all' || v.status === f)
  const pickOne = verdicts.some((v) => v.codes.includes('EXCL_PICK_ONE') && v.id === 'sejongInterest')
  const unknown = (a.unknown ?? []).filter((k) => UNKNOWN_TXT[k])
  const knownIds = (a.aware ?? []).flatMap((k) => (k === 'buteemok' ? ['youthButeemok', 'newlywedButeemok'] : [k]))
  const missed = a.aware?.length
    ? verdicts.filter((v) => v.status !== 'no' && !knownIds.includes(v.id)).map((v) => POLICIES.find((p) => p.id === v.id)!.name)
    : []
  const sum = a.survey ? summarize(a.survey as Survey) : null
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

          {!persisted && (
            <div className="strip ask">
              <span className="ico" aria-hidden="true">i</span>
              <span>
                <b>저장되지 않은 결과예요</b>
                로그인하지 않으면 이 결과는 화면을 닫거나 새로고침할 때 사라져요. 회원등록(로그인)하면 내 계정에 저장돼서 언제든 다시 볼 수 있어요.
                <span className="strip-act"><Btn size="sm" variant="light" onClick={() => openLogin()}>회원등록하고 저장하기</Btn></span>
              </span>
            </div>
          )}

          {warns.map((w, i) => (
            <div key={i} className={`strip ${w.tone === 'stop' ? 'stop' : ''}`} role={w.tone === 'stop' ? 'alert' : undefined}>
              <span className="ico" aria-hidden="true">{w.tone === 'stop' ? '!' : '✓'}</span>
              <span><b>{w.tone === 'stop' ? '이것만은 조심해 주세요' : '미리 챙겨 두면 좋아요'}</b>{w.text}</span>
            </div>
          ))}
          {sum && (
            <section className="strip" style={{ display: 'block', marginTop: 24 }} aria-label="내 응답 요약">
              <b>세종시 조사에 답해 주신 내용으로 정리했어요</b>
              <div className="sum">
                <div><b className="num">{sum.known}/{sum.total}</b><small>알고 있거나 써 본 주거정책 (몰랐다면 아래 카드에서 하나씩 알려드릴게요)</small></div>
                {sum.housingCost !== undefined && <div><b className="num">{sum.housingCost.toLocaleString()}<span style={{ fontSize: '0.4em' }}>만원</span></b><small>매달 나가는 집 돈 (월세+관리비+대출상환){sum.ratio !== undefined ? ` · 소득의 약 ${sum.ratio}%` : ''}</small></div>}
                {sum.burden && <div><b className="num" style={{ fontSize: 28 }}>{sum.burden}</b><small>소득 대비 주거비 부담</small></div>}
                {sum.topPolicy && <div><b className="num" style={{ fontSize: 28 }}>{sum.topPolicy}</b><small>가장 먼저 필요하다고 고른 정책</small></div>}
              </div>
              {sum.barrierCode && BARRIER_TIP[sum.barrierCode] && <p style={{ marginTop: 14 }}><b>신청을 망설인 이유 · {sum.barrier}</b> {BARRIER_TIP[sum.barrierCode]}</p>}
              {sum.channels.length > 0 && <p style={{ marginTop: 10 }}>소식은 <b>{sum.channels.join(', ')}</b>으로 받고 싶다고 하셨어요. 접수 일정은 세종시 공고가 올라오는 곳에서 가장 먼저 확인할 수 있어요.</p>}
            </section>
          )}

          {missed.length > 0 && (
            <div className="strip">
              <span className="ico" aria-hidden="true">★</span>
              <span><b>몰랐다고 하신 지원 중에 받을 수 있는 게 있어요</b>{missed.join(' · ')} — 아래 카드에서 신청 방법을 확인하세요.</span>
            </div>
          )}
          {unknown.length > 0 && (
            <div className="strip ask">
              <span className="ico" aria-hidden="true">?</span>
              <span><b>"잘 모르겠어요"라고 하신 항목</b>대략적인 값(소득은 연 3,000만원, 집은 없음, 월세 50만원 등)으로 계산했어요. 한 번 확인해 보세요: {unknown.map((k) => UNKNOWN_TXT[k]).join(' / ')}</span>
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

          {benefits.state === 'error' && <p className="hint" style={{ marginTop: 14 }}>최신 데이터를 불러오지 못했습니다. 접수 일정은 각 제도 안내 페이지에서 한 번 더 확인해 주세요.</p>}
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

          <PublicRentals answers={a} />
          <ExtraBenefits load={benefits} />

          <p className="disclaimer">
            결과는 <b>참고용</b>이에요. 최종 판단은 각 기관에서 해요. 공고 기준일은 항목마다 표시해 두었어요. 입력하신 정보는 이 기기에만 저장되고 서버로 보내지 않았어요.
            {a.deal === 'banjeonse' && ' 반전세가 “전세계약”으로 인정되는지는 공식 기준을 확인하지 못해 "확인 필요"로 표시했어요.'}
          </p>

          <div className="restart">
            <Btn onClick={() => openModal('diagnose')}>다시 해 보기</Btn>
            <Btn to="/#policies" variant="line">제도 전체 보기</Btn>
          </div>

          <div style={{ margin: '12px 0 100px' }}>
            <Btn variant="line" onClick={() => openModal('feedback')}>의견 남기기</Btn>
          </div>
        </div>
      </main>
      <Footer tone="paper" />
    </>
  )
}
