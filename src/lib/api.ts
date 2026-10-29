import { useEffect, useState } from 'react'

// 프론트는 /api/* 만 부른다. 키는 서버리스 함수에만 있다.

export interface TradeSummary { total: number; sale: number; saleCancelled: number; jeonse: number; monthly: number }
export interface TradesRes { source: string; dealYmd: string; fetchedAt: string; summary: TradeSummary }

export interface BuildingRes {
  source: string
  isMultiHouse: true | false | 'unknown'
  reason: 'MULTI_HOUSE_FOUND' | 'NO_MULTI_HOUSE' | 'NO_RECORD'
  buildings: { name: string; dong: string; mainPurpsCdNm: string; etcPurps: string; regstrKindCdNm: string }[]
}

export interface Notice {
  id: string; title: string; status: string; supplier: string; supplyType: string; houseType: string
  complex: string; address: string; noticeDate: string; begin: string; end: string; winnerDate: string
  units: string; url: string; open: boolean
}
export interface MyhomeRes { source: string; fetchedAt: string; items: Notice[] }

export interface Benefit {
  source: 'gov24' | 'bokjiro' | 'youthcenter'; id: string; name: string; summary: string; org: string; apply: string; url: string
  begin?: string; end?: string; deadline?: string
  /** 나이 기준, 출처별 (온통청년이 먼저) */
  ages?: { min: number; max: number; source: Benefit['source'] }[]
  /** 소득·재산 등 원문 조건 (판정에 쓰지 않음) */
  conditions?: string
}
export interface BenefitsRes { source: string; fetchedAt: string; items: Benefit[] }

export interface RonePoint { ym: string; value: number }
export interface RoneSeries {
  unit: string
  latest: RonePoint
  /** 직전 달 대비 변화율(%) */
  mom: number | null
  /** 12개월 전 대비 변화율(%) */
  yoy: number | null
  /** 오래된 순, 최대 12개월 */
  series: RonePoint[]
}
/** GET /api/rone — 한 지표만 실패하면 그 칸이 null */
export interface RoneRes {
  source: string; fetchedAt: string; region: '세종'
  /** 전세지수, 기준시점 2026.06.=100 */
  index: RoneSeries | null
  /** 전세 평균가격, 만원/㎡ */
  avgPrice: RoneSeries | null
}

export type TradeType = 'apt-rent' | 'apt-trade' | 'rh-rent' | 'sh-rent' | 'offi-rent'
export interface TradeItem {
  kind: '매매' | '전세' | '월세'; deposit: number; monthlyRent: number; area: number | null; buildYear: number | null
  dong: string; jibun: string; name: string; floor: number | null; contractDate: string; contractType: string; cancelled: boolean
}
/** GET /api/trades?type=…&dealYmd=… (summary=1 이면 items 없음) */
export interface TradesDetailRes extends TradesRes { lawdCd: string; type: TradeType; items?: TradeItem[] }

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) { super(message); this.code = code }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  const body = await r.json().catch(() => null)
  if (!r.ok || !body) throw new ApiError(body?.error ?? 'NETWORK', body?.message ?? '최신 데이터를 불러오지 못했습니다')
  return body as T
}

export type Load<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; error: ApiError }

/** path 가 null 이면 부르지 않는다. 결과를 path 와 함께 들고 있다가 path 가 바뀌면 loading 으로 본다. */
export function useApi<T>(path: string | null): Load<T> {
  const [s, setS] = useState<{ path: string; load: Load<T> } | null>(null)
  useEffect(() => {
    if (!path) return
    let alive = true
    api<T>(path)
      .then((data) => alive && setS({ path, load: { state: 'ok', data } }))
      .catch((e) => alive && setS({ path, load: { state: 'error', error: e instanceof ApiError ? e : new ApiError('NETWORK', '최신 데이터를 불러오지 못했습니다') } }))
    return () => { alive = false }
  }, [path])
  return s && s.path === path ? s.load : { state: 'loading' }
}

/** 한국 시간 기준 n개월 전 YYYYMM. 실거래 신고 기한(30일) 때문에 기본은 2개월 전 */
export function monthsAgo(n: number, now = new Date()): string {
  const k = new Date(now.getTime() + 9 * 3600_000)
  const d = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() - n, 1))
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
/** 한국 시간 기준 오늘 YYYYMMDD */
export const todayKst = (now = new Date()) => new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '')
export const ymLabel = (ym: string) => `${ym.slice(0, 4)}.${ym.slice(4, 6)}`
export const ymdLabel = (d: string) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : d)
