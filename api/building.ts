// POST /api/building  { sigunguCd, bjdongCd, bun, ji, platGbCd }
// 지번은 개인이 입력한 주소라서 GET 쿼리(접근 로그에 남음) 대신 POST 본문으로 받고,
// 서버 로그·캐시 어디에도 남기지 않는다 (Cache-Control: no-store).
import { badRequest, json, logUpstream, readKey, serverConfigError, upstreamError } from './_lib/http.js'
import { judgeMultiHouse, parseLot } from './_lib/building.js'
import { fetchUpstream } from './_lib/upstream.js'

const BASE = 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo'

export async function POST(request: Request): Promise<Response> {
  const key = readKey('DATA_GO_KR_KEY')
  if (!key) return serverConfigError()

  let body: unknown
  try { body = await request.json() } catch { return badRequest('JSON 본문이 필요해요') }
  const lot = parseLot(body)
  if (!lot) return badRequest('sigunguCd·bjdongCd 5자리, bun·ji 4자리, platGbCd 0 또는 1 이 필요해요')

  const url = `${BASE}?sigunguCd=${lot.sigunguCd}&bjdongCd=${lot.bjdongCd}&platGbCd=${lot.platGbCd}&bun=${lot.bun}&ji=${lot.ji}&numOfRows=100&pageNo=1&_type=json`
  const r = await fetchUpstream(url, key)
  // 실패 로그에는 코드만 남긴다 (detail 에 지번이 섞일 수 있음)
  if (!r.ok) { logUpstream('building', r.code); return upstreamError(r.code) }

  let parsed: { response?: { header?: { resultCode?: string }; body?: { items?: { item?: unknown } | string } } }
  try { parsed = JSON.parse(r.text) } catch { logUpstream('building', 'UPSTREAM_ERROR', 'non-json'); return upstreamError('UPSTREAM_ERROR') }
  if (parsed.response?.header?.resultCode !== '00') { logUpstream('building', 'UPSTREAM_ERROR', `resultCode=${parsed.response?.header?.resultCode}`); return upstreamError('UPSTREAM_ERROR') }

  const raw = typeof parsed.response.body?.items === 'object' ? parsed.response.body.items.item : undefined
  const items = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Record<string, unknown>[]
  return json({ source: '국토교통부 건축HUB 건축물대장 표제부', ...judgeMultiHouse(items) })
}

export function GET(): Response {
  return json({ error: 'METHOD', message: 'POST 로 요청해 주세요' }, 405)
}
