import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { BuildingRes } from '../lib/api'
import { lotFromPostcode } from '../lib/address'
import type { PostcodeData } from '../lib/address'
import { Btn, Term } from '../ui'

// 카카오(Daum) 우편번호 서비스. 키가 필요 없고, 필요할 때만 스크립트를 불러온다.
const POSTCODE_JS = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
type DaumPostcode = new (o: { oncomplete: (d: PostcodeData & { address?: string }) => void }) => { open: () => void }
declare global { interface Window { daum?: { Postcode: DaumPostcode } } }

let loading: Promise<void> | null = null
const loadPostcode = () => {
  if (window.daum?.Postcode) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = POSTCODE_JS
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { loading = null; reject(new Error('postcode')) }
    document.head.appendChild(s)
  })
  return loading
}

type St =
  | { s: 'idle' }
  | { s: 'loading'; addr: string }
  | { s: 'done'; addr: string; res: BuildingRes }
  | { s: 'error'; addr?: string; msg: string }

/**
 * 설문 "새로 구하는 집"(N3) 단계에 붙는 다중주택 확인.
 * 판정이 나오면 onResult 로 N3 답을 채우고, 주소 자체는 화면에만 두고 저장하지 않는다.
 */
export function AddressCheck({ onResult }: { onResult?: (isMulti: boolean) => void }) {
  const [st, setSt] = useState<St>({ s: 'idle' })

  const check = async (d: PostcodeData & { address?: string }) => {
    const addr = d.jibunAddress || d.autoJibunAddress || d.address || ''
    const lot = lotFromPostcode(d)
    if (!lot) return setSt({ s: 'error', addr, msg: '이 주소는 지번을 찾지 못했어요. 계약서의 "건축물 용도"를 확인해 주세요.' })
    setSt({ s: 'loading', addr })
    try {
      const res = await api<BuildingRes>('/api/building', { method: 'POST', body: JSON.stringify(lot) })
      setSt({ s: 'done', addr, res })
      if (res.isMultiHouse !== 'unknown') onResult?.(res.isMultiHouse)
    } catch (e) {
      setSt({ s: 'error', addr, msg: e instanceof ApiError && e.code !== 'NETWORK' ? `${e.message}. 잠시 뒤 다시 해 보세요.` : '최신 데이터를 불러오지 못했습니다. 잠시 뒤 다시 해 보세요.' })
    }
  }

  const open = async () => {
    try {
      await loadPostcode()
      new window.daum!.Postcode({ oncomplete: (d) => void check(d) }).open()
    } catch {
      setSt({ s: 'error', msg: '주소 검색 창을 열지 못했어요. 인터넷 연결을 확인해 주세요.' })
    }
  }

  return (
    <div className="addr-check" aria-live="polite">
      <p className="label" style={{ marginBottom: 6 }}>선택 · 구하려는 집이 <Term id="multihouse" />인지 건축물대장으로 확인하기</p>
      <Btn size="sm" variant="line" onClick={() => void open()}>{st.s === 'idle' ? '주소로 확인하기' : '다른 주소 확인하기'}</Btn>
      {st.s === 'loading' && <p className="hint" style={{ marginTop: 10 }}>{st.addr} 건축물대장을 찾고 있어요…</p>}
      {st.s === 'error' && <div className="strip ask" style={{ marginTop: 12 }}><span className="ico" aria-hidden="true">?</span><span>{st.addr && <b>{st.addr}</b>}{st.msg}</span></div>}
      {st.s === 'done' && <Verdict addr={st.addr} res={st.res} />}
      <p className="hint" style={{ marginTop: 10 }}>주소는 건축물대장 조회에만 쓰고 저장하지 않아요. 설문 답변과 함께 보내지 않아요.</p>
    </div>
  )
}

function Verdict({ addr, res }: { addr: string; res: BuildingRes }) {
  const evidence = res.buildings.slice(0, 3).map((b) => [b.dong || b.name, `주용도 ${b.mainPurpsCdNm || '-'}`, b.etcPurps && `기타용도 ${b.etcPurps}`].filter(Boolean).join(' · '))
  if (res.isMultiHouse === true)
    return (
      <div className="strip stop" role="alert" style={{ marginTop: 12 }}>
        <span className="ico" aria-hidden="true">!</span>
        <span><b>{addr} — 건축물대장에 다중주택으로 올라 있어요</b>위 답을 &quot;원룸·고시원 (다중주택)&quot;으로 골라 두었어요. 다중주택은 일부 지원에서 빠져서, 결과에 반영해 알려드릴게요.<small style={{ display: 'block', marginTop: 6, opacity: 0.75 }}>근거: {evidence.join(' / ')}</small></span>
      </div>
    )
  if (res.isMultiHouse === false)
    return (
      <div className="strip" style={{ marginTop: 12 }}>
        <span className="ico" aria-hidden="true">✓</span>
        <span><b>{addr} — 다중주택이 아니에요</b>위 답을 &quot;아파트·빌라·오피스텔&quot;로 골라 두었어요. 건축물대장 기준이에요. 실제 쓰임이 다르면 계약서의 &quot;건축물 용도&quot;도 함께 보세요.<small style={{ display: 'block', marginTop: 6, opacity: 0.75 }}>근거: {evidence.join(' / ')}</small></span>
      </div>
    )
  return (
    <div className="strip ask" style={{ marginTop: 12 }}>
      <span className="ico" aria-hidden="true">?</span>
      <span><b>{addr} — 건축물대장을 찾지 못했어요</b>대장이 없거나 주소가 바뀐 건물일 수 있어요. 위에서 직접 골라 주시고, 정부24에서 건축물대장을 떼어 &quot;주용도&quot;를 확인해 보세요.</span>
    </div>
  )
}
