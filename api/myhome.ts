// GET /api/myhome — 마이홈포털 공공임대 모집공고 (세종 brtcCode=36)
import { json, logUpstream, readKey, serverConfigError, todayKst, upstreamError } from './_lib/http.js'
import { fetchUpstream } from './_lib/upstream.js'

const URL_ = 'https://apis.data.go.kr/1613000/HWSPR02/rsdtRcritNtcList?pageNo=1&numOfRows=100&brtcCode=36'

export interface Notice {
  id: string
  title: string
  status: string
  supplier: string
  supplyType: string
  houseType: string
  complex: string
  address: string
  noticeDate: string
  begin: string
  end: string
  winnerDate: string
  units: string
  url: string
  open: boolean
}

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))

export async function GET(): Promise<Response> {
  const key = readKey('DATA_GO_KR_KEY')
  if (!key) return serverConfigError()

  const r = await fetchUpstream(URL_, key)
  if (!r.ok) { logUpstream('myhome', r.code, r.detail); return upstreamError(r.code) }
  let j: { response?: { header?: { resultCode?: string }; body?: { totalCount?: string; item?: unknown } } }
  try { j = JSON.parse(r.text) } catch { logUpstream('myhome', 'UPSTREAM_ERROR', 'non-json'); return upstreamError('UPSTREAM_ERROR') }
  if (j.response?.header?.resultCode !== '00') { logUpstream('myhome', 'UPSTREAM_ERROR', `resultCode=${j.response?.header?.resultCode}`); return upstreamError('UPSTREAM_ERROR') }

  const raw = j.response.body?.item
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Record<string, unknown>[]
  const today = todayKst()
  const items: Notice[] = list.map((x) => {
    const begin = s(x.beginDe), end = s(x.endDe)
    return {
      id: s(x.pblancId), title: s(x.pblancNm), status: s(x.sttusNm), supplier: s(x.suplyInsttNm),
      supplyType: s(x.suplyTyNm), houseType: s(x.houseTyNm), complex: s(x.hsmpNm), address: s(x.fullAdres),
      noticeDate: s(x.rcritPblancDe), begin, end, winnerDate: s(x.przwnerPresnatnDe), units: s(x.suplyHoCo),
      url: s(x.pcUrl) || s(x.url),
      open: !!begin && !!end && begin <= today && today <= end,
    }
  }).sort((a, b) => Number(b.open) - Number(a.open) || b.noticeDate.localeCompare(a.noticeDate))

  return json({ source: '마이홈포털 공공주택 모집공고 (국토교통부)', fetchedAt: new Date().toISOString(), today, items }, 200, { cdn: 6 * 3600, browser: 600 })
}
