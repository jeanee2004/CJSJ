import { useState } from 'react'
import type { ReactNode } from 'react'
import { monthsAgo, useApi, ymdLabel, ymLabel } from '../lib/api'
import type { Benefit, BenefitsRes, Load, MyhomeRes, RoneRes, TradesRes } from '../lib/api'
import { LiveCarousel } from './LiveCarousel'
import type { Answers } from '../lib/eligibility'
import { coveredByVerdicts, fitsNotice } from '../lib/live'
import { matchBenefit } from '../lib/recommend'
import { Btn, VBadge, reduced } from '../ui'

const SRC_NAME = { gov24: '정부24', bokjiro: '복지로', youthcenter: '온통청년' } as const

function Stale({ what, href, label }: { what: string; href: string; label: string }) {
  return (
    <div className="strip ask">
      <span className="ico" aria-hidden="true">i</span>
      <span><b>최신 데이터를 불러오지 못했습니다</b>{what}은 <a href={href} target="_blank" rel="noreferrer noopener" style={{ textDecoration: 'underline' }}>{label}</a>에서 바로 확인할 수 있어요.</span>
    </div>
  )
}

/** 결과 화면: 지금 신청 가능한 공공임대 (마이홈 모집공고, 세종). 내 응답과 맞지 않는 공고는 접어 둔다 */
export function PublicRentals({ answers }: { answers: Answers }) {
  const r = useApi<MyhomeRes>('/api/myhome')
  const [all, setAll] = useState(false)
  const openAll = r.state === 'ok' ? r.data.items.filter((n) => n.open) : []
  const fit = openAll.filter((n) => fitsNotice(n, answers))
  const open = all ? openAll : fit
  const hidden = openAll.length - fit.length
  return (
    <section className="live" aria-labelledby="live-rent" aria-busy={r.state === 'loading' || undefined}>
      <span className="label">마이홈 모집공고</span>
      <h2 id="live-rent">지금 신청 가능한 공공임대</h2>
      {r.state === 'loading' && <p className="hint">모집공고를 불러오는 중이에요…</p>}
      {r.state === 'error' && <Stale what="세종 공공임대 모집공고" href="https://www.myhome.go.kr" label="마이홈포털" />}
      {r.state === 'ok' && openAll.length === 0 && <p className="hint">지금 세종에서 접수 중인 공공임대 공고가 없어요. 새 공고는 마이홈포털에서 알림을 받을 수 있어요.</p>}
      {r.state === 'ok' && openAll.length > 0 && fit.length === 0 && !all && <p className="hint">지금 접수 중인 세종 공고 {openAll.length}건은 응답하신 상황(혼인·자녀·나이)과 맞지 않아 보여요.</p>}
      {open.length > 0 && (
        <div className="live-cards">
          {open.map((n) => (
            <article key={n.id} className="live-card">
              <span className="label">{[n.supplier, n.supplyType, n.houseType].filter(Boolean).join(' · ')}</span>
              <h3>{n.title}</h3>
              <p className="hint">접수 {ymdLabel(n.begin)} ~ {ymdLabel(n.end)}{n.winnerDate && ` · 발표 ${ymdLabel(n.winnerDate)}`}{n.units && ` · ${n.units}`}</p>
              {n.complex && <p className="hint">{n.complex}{n.address && ` (${n.address})`}</p>}
              {n.url && <div style={{ marginTop: 14 }}><Btn href={n.url} external size="sm" variant="line">공고 보기</Btn></div>}
            </article>
          ))}
        </div>
      )}
      {hidden > 0 && (
        <p className="hint" style={{ marginTop: 12 }}>
          {all ? '모든 공고를 보여 주고 있어요. ' : `응답하신 상황(혼인·자녀·나이)과 맞지 않아 보이는 공고 ${hidden}건은 접어 두었어요. 공고 이름으로만 가늠한 것이라 정확하지 않을 수 있어요. `}
          <button type="button" className="term" onClick={() => setAll((x) => !x)}>{all ? '맞는 공고만 보기' : '모두 보기'}</button>
        </p>
      )}
      {r.state === 'ok' && <p className="src"><span><VBadge v="official" /> {r.data.source} · {new Date(r.data.fetchedAt).toLocaleDateString('ko-KR')} 기준</span></p>}
    </section>
  )
}

/** 결과 화면 하단: 추가로 확인해볼 혜택 (정부24·복지로·온통청년). 위 진단 카드에 있는 제도는 빼고, 나이·무주택으로 맞지 않는 것은 접는다 */
export function ExtraBenefits({ load: r, answers }: { load: Load<BenefitsRes>; answers: Answers }) {
  const [all, setAll] = useState(false)
  const matches = r.state === 'ok' ? r.data.items.filter((b) => !coveredByVerdicts(b)).map((b) => matchBenefit(b, answers)) : []
  const fit = matches.filter((m) => m.status !== 'no')
  const items = all ? matches : fit
  const hidden = matches.length - fit.length
  return (
    <section className="live" aria-labelledby="live-benefit" aria-busy={r.state === 'loading' || undefined}>
      <span className="label">정부24 · 복지로 · 온통청년</span>
      <h2 id="live-benefit">추가로 확인해볼 혜택</h2>
      <p className="hint" style={{ marginBottom: 12 }}>위 진단에 넣지 않은 제도도 있어요. 나이와 무주택 여부만 확인했고, 소득 등 나머지 조건은 각 안내 페이지에서 직접 확인하세요.</p>
      {r.state === 'loading' && <p className="hint">혜택 목록을 불러오는 중이에요…</p>}
      {r.state === 'error' && <Stale what="세종 청년·신혼 혜택" href="https://www.gov.kr/portal/rcvfvrSvc/main" label="정부24 혜택 찾기" />}
      {r.state === 'ok' && matches.length === 0 && <p className="hint">위 진단에 없는 세종 청년·신혼 주거 혜택은 지금 없어요.</p>}
      {r.state === 'ok' && matches.length > 0 && fit.length === 0 && !all && <p className="hint">위 진단에 없는 혜택 {matches.length}건은 응답하신 나이·주택 상황과 맞지 않아 보여요.</p>}
      {items.length > 0 && (
        <ul className="live-list">
          {items.map(({ benefit: b, status, reasons }) => (
            <li key={`${b.source}-${b.id}`}>
              {b.url ? <a href={b.url} target="_blank" rel="noreferrer noopener"><b>{b.name}</b></a> : <b>{b.name}</b>}
              <span className="label" style={{ marginLeft: 8 }}>{SRC_NAME[b.source]}{b.apply && ` · ${b.apply}`}</span>
              <span className={`status ${status}`} style={{ marginLeft: 8, padding: '3px 10px', fontSize: 12 }}>{status === 'no' ? '✕ 조건이 맞지 않아요' : '△ 확인해 보면 좋아요'}</span>
              {b.summary && <p className="hint">{b.summary}</p>}
              {reasons.map((x, i) => <p key={i} className="hint">{x}</p>)}
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <p className="hint" style={{ marginTop: 12 }}>
          {all ? '조건이 맞지 않는 혜택까지 보여 주고 있어요. ' : `나이·주택 상황과 맞지 않는 혜택 ${hidden}건은 접어 두었어요. `}
          <button type="button" className="term" onClick={() => setAll((x) => !x)}>{all ? '맞는 혜택만 보기' : '모두 보기'}</button>
        </p>
      )}
      {r.state === 'ok' && <p className="src"><span><VBadge v="official" /> {r.data.source} · {new Date(r.data.fetchedAt).toLocaleDateString('ko-KR')} 기준</span></p>}
    </section>
  )
}

/* ───────── 홈: 실시간 정보 확인 (11개 영역, 끝없이 도는 3D 카드) ───────── */

const TRADE_KINDS = [
  { type: 'apt-rent', name: '아파트 전월세', portal: 'https://rt.molit.go.kr' },
  { type: 'offi-rent', name: '오피스텔 전월세', portal: 'https://rt.molit.go.kr' },
  { type: 'rh-rent', name: '연립·다세대 전월세', portal: 'https://rt.molit.go.kr' },
  { type: 'sh-rent', name: '단독·다가구 전월세', portal: 'https://rt.molit.go.kr' },
] as const

interface CardProps { tag: string; title: string; busy?: boolean; children: ReactNode; foot?: ReactNode }
function Card({ tag, title, busy, children, foot }: CardProps) {
  return (
    <article className="l3d" aria-busy={busy || undefined}>
      <span className="label">{tag}</span>
      <h3>{title}</h3>
      <div className="l3d-body">{children}</div>
      {foot && <div className="l3d-foot">{foot}</div>}
    </article>
  )
}

const Big = ({ n, unit }: { n: number | string; unit: string }) => <p className="l3d-big"><b>{n}</b><span>{unit}</span></p>
const stamp = (iso: string) => `${new Date(iso).toLocaleDateString('ko-KR')} 기준`

function TradeCard({ type, name, portal, ym }: { type: string; name: string; portal: string; ym: string }) {
  const r = useApi<TradesRes>(`/api/trades?type=${type}&dealYmd=${ym}&summary=1`)
  const link = <Btn href={portal} external size="sm" variant="line">국토부 실거래가 공개시스템</Btn>
  return (
    <Card tag={`실거래가 · ${ymLabel(ym)} 계약`} title={name} busy={r.state === 'loading'} foot={link}>
      {r.state === 'loading' && <p className="hint">불러오는 중이에요…</p>}
      {r.state === 'error' && <Stale what={`세종 ${name} 실거래가`} href={portal} label="실거래가 공개시스템" />}
      {r.state === 'ok' && (
        <>
          <Big n={r.data.summary.total.toLocaleString('ko-KR')} unit="건 신고" />
          <p className="hint">전세 {r.data.summary.jeonse.toLocaleString('ko-KR')}건 · 월세 {r.data.summary.monthly.toLocaleString('ko-KR')}건</p>
          <p className="l3d-src"><VBadge v="official" /> {stamp(r.data.fetchedAt)}</p>
        </>
      )}
    </Card>
  )
}

/** 11개 영역을 한 번에 불러와 카드로 만든다. 카드는 복제되어 두 번 그려지므로 호출은 여기서 한 번만 한다 */
export function LiveBoard() {
  const ym = monthsAgo(2)
  const sale = useApi<TradesRes>(`/api/trades?type=apt-trade&dealYmd=${ym}&summary=1`)
  const myhome = useApi<MyhomeRes>('/api/myhome')
  const benefits = useApi<BenefitsRes>('/api/benefits')
  const rone = useApi<RoneRes>('/api/rone')
  const roneIdx = rone.state === 'ok' ? rone.data.index : null

  const toAddress = () => document.getElementById('addr-check')?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' })
  const open = myhome.state === 'ok' ? myhome.data.items.filter((n) => n.open) : []
  // 같은 제도는 한 줄로 합쳐지므로(먼저 온 출처만 남음) 출처별 개수는 seen 으로 센다
  const mine = (src: string) => (benefits.state === 'ok' ? benefits.data.items.filter((b) => (b.seen ?? [b.source]).includes(src as Benefit['source'])) : [])
  const by = (src: string) => mine(src).length
  const benefitCard = (src: 'gov24' | 'bokjiro' | 'youthcenter', title: string, href: string) => (
    <Card key={src} tag="세종 청년·신혼 혜택" title={title} busy={benefits.state === 'loading'} foot={<Btn href={href} external size="sm" variant="line">{`${title} 바로가기`}</Btn>}>
      {benefits.state === 'loading' && <p className="hint">불러오는 중이에요…</p>}
      {benefits.state === 'error' && <Stale what={`${title} 혜택`} href={href} label={title} />}
      {benefits.state === 'ok' && (
        <>
          {by(src) > 0 ? <Big n={by(src)} unit="개 제도" /> : null}
          <p className="hint">{mine(src)[0]?.name ?? `지금 ${SRC_NAME[src]}에 올라온 세종 청년 주거 혜택이 없어요. 바로가기에서 직접 확인해 보세요.`}</p>
          <p className="l3d-src"><VBadge v="official" /> {stamp(benefits.data.fetchedAt)}</p>
        </>
      )}
    </Card>
  )

  const cards: ReactNode[] = [
    ...TRADE_KINDS.map((k) => <TradeCard key={k.type} {...k} ym={ym} />),
    <Card key="sale" tag={`실거래가 · ${ymLabel(ym)} 계약`} title="아파트 매매" busy={sale.state === 'loading'} foot={<Btn href="https://rt.molit.go.kr" external size="sm" variant="line">국토부 실거래가 공개시스템</Btn>}>
      {sale.state === 'loading' && <p className="hint">불러오는 중이에요…</p>}
      {sale.state === 'error' && <Stale what="세종 아파트 매매 실거래가" href="https://rt.molit.go.kr" label="실거래가 공개시스템" />}
      {sale.state === 'ok' && (
        <>
          <Big n={sale.data.summary.sale.toLocaleString('ko-KR')} unit="건 매매" />
          <p className="hint">해제 신고 {sale.data.summary.saleCancelled.toLocaleString('ko-KR')}건은 뺐어요</p>
          <p className="l3d-src"><VBadge v="official" /> {stamp(sale.data.fetchedAt)}</p>
        </>
      )}
    </Card>,
    <Card key="hub" tag="건축HUB · 건축물대장" title="다중주택 확인" foot={<button type="button" className="btn-s" onClick={toAddress}>주소로 확인하기 ↓</button>}>
      <Big n="1" unit="분이면 확인" />
      <p className="hint">구하려는 집 주소를 넣으면 건축물대장에서 다중주택인지 알려드려요. 아래 입력창으로 바로 이어져요.</p>
    </Card>,
    <Card key="myhome" tag="마이홈 · 공공임대" title="모집공고" busy={myhome.state === 'loading'} foot={<Btn href="https://www.myhome.go.kr" external size="sm" variant="line">마이홈포털</Btn>}>
      {myhome.state === 'loading' && <p className="hint">불러오는 중이에요…</p>}
      {myhome.state === 'error' && <Stale what="세종 공공임대 모집공고" href="https://www.myhome.go.kr" label="마이홈포털" />}
      {myhome.state === 'ok' && (
        <>
          <Big n={open.length} unit="건 접수 중" />
          <p className="hint">{open[0] ? `${open[0].title} · ~${ymdLabel(open[0].end)}` : '지금 접수 중인 세종 공고가 없어요'}</p>
          <p className="l3d-src"><VBadge v="official" /> {stamp(myhome.data.fetchedAt)}</p>
        </>
      )}
    </Card>,
    benefitCard('gov24', '행정안전부 공공서비스(정부24)', 'https://www.gov.kr/portal/rcvfvrSvc/main'),
    benefitCard('bokjiro', '복지로', 'https://www.bokjiro.go.kr'),
    benefitCard('youthcenter', '온통청년', 'https://www.youthcenter.go.kr'),
    <Card key="rone" tag="한국부동산원 · 전세가격 동향" title="세종 전세가격" busy={rone.state === 'loading'} foot={<Btn href="https://www.reb.or.kr/r-one" external size="sm" variant="line">부동산통계 R-ONE</Btn>}>
      {rone.state === 'loading' && <p className="hint">불러오는 중이에요…</p>}
      {rone.state === 'error' && <Stale what="세종 전세가격 동향" href="https://www.reb.or.kr/r-one" label="부동산통계 R-ONE" />}
      {rone.state === 'ok' && (
        <>
          {roneIdx
            ? <Big n={roneIdx.yoy === null ? roneIdx.latest.value.toFixed(1) : `${roneIdx.yoy > 0 ? '+' : ''}${roneIdx.yoy.toFixed(1)}`} unit={roneIdx.yoy === null ? '전세지수' : '% 1년 전보다'} />
            : <Big n="-" unit="" />}
          {roneIdx && <p className="hint">{ymLabel(roneIdx.latest.ym)} 전세지수 {roneIdx.latest.value.toFixed(1)}{roneIdx.mom !== null ? ` · 전월 ${roneIdx.mom > 0 ? '+' : ''}${roneIdx.mom.toFixed(1)}%` : ''}</p>}
          {rone.data.avgPrice && <p className="hint">전세 평균 {rone.data.avgPrice.latest.value.toLocaleString('ko-KR')}만원/㎡</p>}
          <p className="l3d-src"><VBadge v="official" /> {stamp(rone.data.fetchedAt)}</p>
        </>
      )}
    </Card>,
  ]
  return <LiveCarousel items={cards} label="실시간 공공 정보 카드" />
}
