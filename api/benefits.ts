// GET /api/benefits — 세종 청년·신혼 주거 관련 혜택 (정부24 공공서비스 + 복지로 지자체복지 + 온통청년)
// 세 API 모두 호출 한도가 작아서 CDN 하루 캐시 + 인스턴스 메모리 캐시를 둔다.
// 한 출처가 실패해도 나머지로 응답하고, 출처별 상태를 같이 돌려준다.
import { json, logUpstream, readKey, serverConfigError } from './_lib/http.js'
import type { UpstreamCode } from './_lib/http.js'
import { dedupe, fromBokjiro, fromGov24, fromYouthCenter, gov24Ages } from './_lib/benefits.js'
import type { Benefit } from './_lib/benefits.js'
import { fetchUpstream } from './_lib/upstream.js'
import { blocks, tag } from './_lib/xml.js'

type Status = 'ok' | 'skipped' | UpstreamCode
const enc = encodeURIComponent
const SEJONG = '세종특별자치시'

async function gov24(key: string): Promise<[Benefit[], Status]> {
  const url = `https://api.odcloud.kr/api/gov24/v3/serviceList?page=1&perPage=100&returnType=JSON&${enc('cond[소관기관명::LIKE]')}=${enc(SEJONG)}&${enc('cond[서비스분야::LIKE]')}=${enc('주거')}`
  const r = await fetchUpstream(url, key)
  if (!r.ok) { logUpstream('benefits/gov24', r.code, r.detail); return [[], r.code] }
  try {
    const data = (JSON.parse(r.text) as { data?: Record<string, unknown>[] }).data ?? []
    const list = data.map(fromGov24).filter((b): b is Benefit => !!b)
    await Promise.all(list.map(async (b) => { const ages = await gov24Conditions(key, b.id); if (ages.length) b.ages = ages }))
    return [list, 'ok']
  } catch { return [[], 'UPSTREAM_ERROR'] }
}

// 서비스마다 지원조건(나이 등)을 한 줄씩 준다. 실패해도 목록은 그대로 내보낸다
async function gov24Conditions(key: string, id: string) {
  if (!id) return []
  const r = await fetchUpstream(`https://api.odcloud.kr/api/gov24/v3/supportConditions?page=1&perPage=1&returnType=JSON&${enc('cond[서비스ID::EQ]')}=${enc(id)}`, key)
  if (!r.ok) { logUpstream('benefits/gov24-cond', r.code, r.detail); return [] }
  try { return gov24Ages((JSON.parse(r.text) as { data?: Record<string, unknown>[] }).data?.[0] ?? {}) } catch { return [] }
}

async function bokjiro(key: string): Promise<[Benefit[], Status]> {
  const url = `https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist?pageNo=1&numOfRows=200&ctpvNm=${enc(SEJONG)}`
  // 복지로는 응답이 20초를 넘기는 일이 잦다 (2026-10-28 확인)
  const r = await fetchUpstream(url, key, 'serviceKey', 45_000)
  if (!r.ok) { logUpstream('benefits/bokjiro', r.code, r.detail); return [[], r.code] }
  if (tag(r.text, 'resultCode') !== '0') { logUpstream('benefits/bokjiro', 'UPSTREAM_ERROR', `resultCode=${tag(r.text, 'resultCode')}`); return [[], 'UPSTREAM_ERROR'] }
  return [blocks(r.text, 'servList').map(fromBokjiro).filter((b): b is Benefit => !!b), 'ok']
}

async function youthcenter(key: string | undefined): Promise<[Benefit[], Status]> {
  if (!key) return [[], 'skipped']
  const out: Benefit[] = []
  // pageSize 는 50 까지만 받는다 (100 이면 e003)
  for (let page = 1; page <= 4; page++) {
    const url = `https://www.youthcenter.go.kr/go/ythip/getPlcy?pageNum=${page}&pageSize=50&rtnType=json&zipCd=36110&lclsfNm=${enc('주거')}`
    const r = await fetchUpstream(url, key, 'apiKeyNm')
    if (!r.ok) { logUpstream('benefits/youthcenter', r.code, r.detail); return [out, r.code] }
    let j: { resultCode?: number; result?: { pagging?: { totCount?: number }; youthPolicyList?: Record<string, unknown>[] } }
    try { j = JSON.parse(r.text) } catch { return [out, 'UPSTREAM_ERROR'] }
    if (j.resultCode !== 200) { logUpstream('benefits/youthcenter', 'UPSTREAM_ERROR', `resultCode=${j.resultCode}`); return [out, 'UPSTREAM_ERROR'] }
    const list = j.result?.youthPolicyList ?? []
    out.push(...list.map(fromYouthCenter).filter((b): b is Benefit => !!b))
    if (page * 50 >= (j.result?.pagging?.totCount ?? 0) || list.length === 0) break
  }
  return [out, 'ok']
}

const TTL = 6 * 3600_000
let memo: { at: number; body: unknown } | null = null

export async function GET(): Promise<Response> {
  const key = readKey('DATA_GO_KR_KEY')
  if (!key) return serverConfigError()
  if (memo && Date.now() - memo.at < TTL) return json(memo.body, 200, { cdn: 86_400, browser: 3600 })

  const [[g, gs], [b, bs], [y, ys]] = await Promise.all([gov24(key), bokjiro(key), youthcenter(readKey('YOUTHCENTER_KEY'))])
  const body = {
    source: '행정안전부 공공서비스(혜택) 정보 · 복지로 지자체복지서비스 · 온통청년',
    fetchedAt: new Date().toISOString(),
    status: { gov24: gs, bokjiro: bs, youthcenter: ys },
    // 접수 일정은 온통청년을 먼저 쓴다 (2026-10-29 요청)
    items: dedupe([...y, ...g, ...b]),
  }
  const allOk = gs === 'ok' && bs === 'ok' && (ys === 'ok' || ys === 'skipped')
  if (allOk) memo = { at: Date.now(), body }
  // 일부 출처가 실패하면 짧게만 캐시해 곧 다시 시도하게 한다
  return json(body, 200, allOk ? { cdn: 86_400, browser: 3600 } : { cdn: 300, browser: 60 })
}
