import { useState } from 'react'
import { useApi, ymdLabel } from '../lib/api'
import type { BenefitsRes, Load, MyhomeRes } from '../lib/api'
import type { Answers } from '../lib/eligibility'
import { coveredByVerdicts, fitsNotice } from '../lib/live'
import { Btn, VBadge } from '../ui'

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

/** 결과 화면 하단: 추가로 확인해볼 혜택 (정부24·복지로·온통청년). 위 진단 카드에 있는 제도는 뺀다 */
export function ExtraBenefits({ load: r }: { load: Load<BenefitsRes> }) {
  const items = r.state === 'ok' ? r.data.items.filter((b) => !coveredByVerdicts(b)) : []
  return (
    <section className="live" aria-labelledby="live-benefit" aria-busy={r.state === 'loading' || undefined}>
      <span className="label">정부24 · 복지로 · 온통청년</span>
      <h2 id="live-benefit">추가로 확인해볼 혜택</h2>
      <p className="hint" style={{ marginBottom: 12 }}>위 진단에 넣지 않은 제도도 있어요. 조건은 각 안내 페이지에서 직접 확인하세요.</p>
      {r.state === 'loading' && <p className="hint">혜택 목록을 불러오는 중이에요…</p>}
      {r.state === 'error' && <Stale what="세종 청년·신혼 혜택" href="https://www.gov.kr/portal/rcvfvrSvc/main" label="정부24 혜택 찾기" />}
      {r.state === 'ok' && items.length === 0 && <p className="hint">위 진단에 없는 세종 청년·신혼 주거 혜택은 지금 없어요.</p>}
      {items.length > 0 && (
        <ul className="live-list">
          {items.map((b) => (
            <li key={`${b.source}-${b.id}`}>
              {b.url ? <a href={b.url} target="_blank" rel="noreferrer noopener"><b>{b.name}</b></a> : <b>{b.name}</b>}
              <span className="label" style={{ marginLeft: 8 }}>{SRC_NAME[b.source]}{b.apply && ` · ${b.apply}`}</span>
              {b.summary && <p className="hint">{b.summary}</p>}
            </li>
          ))}
        </ul>
      )}
      {r.state === 'ok' && <p className="src"><span><VBadge v="official" /> {r.data.source} · {new Date(r.data.fetchedAt).toLocaleDateString('ko-KR')} 기준</span></p>}
    </section>
  )
}
