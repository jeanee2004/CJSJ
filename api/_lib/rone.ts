// 한국부동산원 R-ONE 부동산통계 Open API 응답 정규화.
// 엔드포인트·필드는 2026-10-29 실제 응답으로 확인했다 (docs/api-integration.md 5절).

import type { UpstreamCode } from './http.js'

export const RONE_BASE = 'https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do'
/** (월) 지역별 전세지수_아파트 — 기준시점 2026.06.=100 */
export const JEONSE_INDEX = 'A_2024_00182'
/** (월) 지역별 전세 평균가격_아파트 — 만원/㎡ */
export const JEONSE_AVG_PRICE = 'A_2024_00192'
/** 분류(CLS_ID) 세종 */
export const SEJONG_CLS = 500014

export interface RonePoint { ym: string; value: number }

export type RoneParsed =
  | { ok: true; points: RonePoint[]; unit: string }
  | { ok: false; code: UpstreamCode | 'NO_DATA' }

/** 응답 JSON 하나를 월별 값 목록(오래된 순)으로 바꾼다. 오류 봉투는 코드로 바꾼다 */
export function parseRone(text: string): RoneParsed {
  let j: Record<string, unknown>
  try { j = JSON.parse(text) } catch { return { ok: false, code: 'UPSTREAM_ERROR' } }
  const result = (j.RESULT ?? (j.SttsApiTblData as { head?: { RESULT?: unknown }[] }[] | undefined)?.[0]?.head?.find((h) => 'RESULT' in h)?.RESULT) as { CODE?: string } | undefined
  const code = result?.CODE ?? ''
  if (code === 'INFO-200') return { ok: false, code: 'NO_DATA' }
  if (code === 'ERROR-290' || code === 'ERROR-300') return { ok: false, code: 'KEY_NOT_REGISTERED' }
  if (code === 'ERROR-336' || code === 'ERROR-337') return { ok: false, code: 'QUOTA_EXCEEDED' }
  if (code && code !== 'INFO-000') return { ok: false, code: 'UPSTREAM_ERROR' }
  const block = (j.SttsApiTblData as { row?: Record<string, unknown>[] }[] | undefined)?.find((b) => b.row)
  if (!block?.row) return { ok: false, code: 'UPSTREAM_ERROR' }
  const points = block.row
    .filter((r) => typeof r.DTA_VAL === 'number' && /^\d{6}$/.test(String(r.WRTTIME_IDTFR_ID)))
    .map((r) => ({ ym: String(r.WRTTIME_IDTFR_ID), value: r.DTA_VAL as number }))
    .sort((a, b) => a.ym.localeCompare(b.ym))
  const unit = String(block.row[0]?.UI_NM ?? '')
  return { ok: true, points, unit }
}

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d

export interface RoneSeries {
  unit: string
  latest: { ym: string; value: number }
  /** 직전 달 대비 변화율(%) */
  mom: number | null
  /** 12개월 전 대비 변화율(%) */
  yoy: number | null
  series: RonePoint[]
}

const prevYm = (ym: string, n: number) => {
  const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(4, 6)) - 1 - n, 1))
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** 값 목록 → 최신값·전월/전년 대비·최근 n개월. 비교 달이 없으면 null */
export function summarizeSeries(points: RonePoint[], unit: string, keep = 12): RoneSeries | null {
  if (points.length === 0) return null
  const latest = points[points.length - 1]
  const at = (ym: string) => points.find((p) => p.ym === ym)?.value
  const pct = (base: number | undefined) => (base ? round(((latest.value - base) / base) * 100, 2) : null)
  return {
    unit,
    latest: { ym: latest.ym, value: round(latest.value, 2) },
    mom: pct(at(prevYm(latest.ym, 1))),
    yoy: pct(at(prevYm(latest.ym, 12))),
    series: points.slice(-keep).map((p) => ({ ym: p.ym, value: round(p.value, 2) })),
  }
}
