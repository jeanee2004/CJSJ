// GET /api/rone — 한국부동산원 R-ONE 세종 아파트 전세가격 동향 (지수 + 평균가격)
// 월 1회 갱신되는 통계라 CDN 하루 캐시. 한 지표만 실패해도 나머지로 응답한다.
import { json, logUpstream, readKey, serverConfigError, upstreamError } from './_lib/http.js'
import { JEONSE_AVG_PRICE, JEONSE_INDEX, RONE_BASE, SEJONG_CLS, parseRone, summarizeSeries } from './_lib/rone.js'
import type { RoneSeries } from './_lib/rone.js'
import { fetchUpstream } from './_lib/upstream.js'

/** 최근 16개월. 최신 발표월이 2~3개월 늦으므로 전년 동월(최신-12개월)이 들어오게 여유를 둔다 (14개월이면 yoy 가 null 이 된다, 2026-11-04 확인) */
const monthsBack = (n: number, now = new Date()) => {
  const k = new Date(now.getTime() + 9 * 3600_000)
  const d = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() - n, 1))
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

async function load(key: string, statblId: string, name: string): Promise<RoneSeries | null> {
  const url = `${RONE_BASE}?Type=json&STATBL_ID=${statblId}&DTACYCLE_CD=MM&CLS_ID=${SEJONG_CLS}&START_WRTTIME=${monthsBack(16)}&END_WRTTIME=${monthsBack(0)}&pIndex=1&pSize=100`
  const r = await fetchUpstream(url, key, 'KEY')
  if (!r.ok) { logUpstream(`rone/${name}`, r.code, r.detail); return null }
  const p = parseRone(r.text)
  if (!p.ok) { logUpstream(`rone/${name}`, p.code === 'NO_DATA' ? 'UPSTREAM_ERROR' : p.code, p.code); return null }
  return summarizeSeries(p.points, p.unit)
}

export async function GET(): Promise<Response> {
  const key = readKey('RONE_KEY')
  if (!key) return serverConfigError()

  const [index, avgPrice] = await Promise.all([load(key, JEONSE_INDEX, 'index'), load(key, JEONSE_AVG_PRICE, 'price')])
  if (!index && !avgPrice) return upstreamError('UPSTREAM_ERROR')

  const body = {
    source: '한국부동산원 R-ONE 부동산통계 (세종 아파트 전세, 월간)',
    fetchedAt: new Date().toISOString(),
    region: '세종',
    /** 전세지수 (기준시점 2026.06.=100) */
    index,
    /** 전세 평균가격 (만원/㎡) */
    avgPrice,
  }
  return json(body, 200, index && avgPrice ? { cdn: 86_400, browser: 3600 } : { cdn: 600, browser: 60 })
}
