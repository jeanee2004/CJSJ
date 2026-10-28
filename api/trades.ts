// GET /api/trades?lawdCd=36110&dealYmd=202605&type=apt-rent[&summary=1]
import { badRequest, json, logUpstream, readKey, serverConfigError, upstreamError } from './_lib/http.js'
import { TRADE_TYPES, cacheSecondsFor, monthsAgo, normalizeTrade, summarize } from './_lib/trades.js'
import type { Trade, TradeType } from './_lib/trades.js'
import { fetchUpstream } from './_lib/upstream.js'
import { blocks, tag } from './_lib/xml.js'

const BASE = 'https://apis.data.go.kr/1613000/'
const PAGE = 1000
const MAX_PAGES = 20

export async function GET(request: Request): Promise<Response> {
  const key = readKey('DATA_GO_KR_KEY')
  if (!key) return serverConfigError()

  const q = new URL(request.url).searchParams
  const lawdCd = q.get('lawdCd') ?? '36110'
  const dealYmd = q.get('dealYmd') ?? monthsAgo(2)
  const type = (q.get('type') ?? 'apt-rent') as TradeType
  if (!/^\d{5}$/.test(lawdCd)) return badRequest('lawdCd 는 5자리 숫자예요')
  if (!/^\d{4}(0[1-9]|1[0-2])$/.test(dealYmd) || dealYmd > monthsAgo(0)) return badRequest('dealYmd 는 지난 달까지의 YYYYMM 이에요')
  if (!(type in TRADE_TYPES)) return badRequest(`type 은 ${Object.keys(TRADE_TYPES).join(' | ')} 중 하나예요`)

  const items: Trade[] = []
  let total = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${BASE}${TRADE_TYPES[type]}?LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=${PAGE}&pageNo=${page}`
    const r = await fetchUpstream(url, key)
    if (!r.ok) { logUpstream('trades', r.code, r.detail); return upstreamError(r.code) }
    const code = tag(r.text, 'resultCode')
    if (code !== '000') { logUpstream('trades', 'UPSTREAM_ERROR', `resultCode=${code}`); return upstreamError('UPSTREAM_ERROR') }
    total = Number(tag(r.text, 'totalCount')) || 0
    for (const it of blocks(r.text, 'item')) items.push(normalizeTrade(type, it))
    if (items.length >= total || page * PAGE >= total) break
  }

  const body = {
    source: '국토교통부 실거래가 공개시스템 (공공데이터포털)',
    lawdCd, dealYmd, type,
    fetchedAt: new Date().toISOString(),
    summary: summarize(items),
    ...(q.get('summary') === '1' ? {} : { items }),
  }
  return json(body, 200, { cdn: cacheSecondsFor(dealYmd), browser: 3600 })
}
