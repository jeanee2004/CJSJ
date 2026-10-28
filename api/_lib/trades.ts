// 국토부 실거래가 정규화. 2026-10-28 실제 응답(XML)으로 필드명을 확인했다.

export const TRADE_TYPES = {
  'apt-rent': 'RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
  'apt-trade': 'RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
  'rh-rent': 'RTMSDataSvcRHRent/getRTMSDataSvcRHRent',
  'sh-rent': 'RTMSDataSvcSHRent/getRTMSDataSvcSHRent',
  'offi-rent': 'RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent',
} as const
export type TradeType = keyof typeof TRADE_TYPES

export interface Trade {
  kind: '매매' | '전세' | '월세'
  /** 만원. 매매는 거래금액, 전월세는 보증금 */
  deposit: number
  /** 만원. 전세·매매는 0 */
  monthlyRent: number
  /** ㎡. 단독다가구는 연면적(totalFloorAr) */
  area: number | null
  buildYear: number | null
  dong: string
  jibun: string
  name: string
  floor: number | null
  contractDate: string
  /** 계약 구분(신규/갱신). 전월세만 */
  contractType: string
  /** 매매 해제 여부 (cdealType = O) */
  cancelled: boolean
}

const num = (s: string | undefined) => {
  const n = Number((s ?? '').replace(/,/g, '').trim())
  return (s ?? '').trim() === '' || Number.isNaN(n) ? null : n
}
const pad = (s: string | undefined) => (s ?? '').trim().padStart(2, '0')

export function normalizeTrade(type: TradeType, r: Record<string, string>): Trade {
  const isSale = type === 'apt-trade'
  const rent = isSale ? 0 : (num(r.monthlyRent) ?? 0)
  return {
    kind: isSale ? '매매' : rent === 0 ? '전세' : '월세',
    deposit: (isSale ? num(r.dealAmount) : num(r.deposit)) ?? 0,
    monthlyRent: rent,
    area: num(r.excluUseAr) ?? num(r.totalFloorAr),
    buildYear: num(r.buildYear),
    dong: r.umdNm ?? '',
    jibun: r.jibun ?? '',
    name: r.aptNm || r.mhouseNm || r.offiNm || '',
    floor: num(r.floor),
    contractDate: `${r.dealYear}-${pad(r.dealMonth)}-${pad(r.dealDay)}`,
    contractType: r.contractType ?? '',
    cancelled: isSale && (r.cdealType ?? '').trim() === 'O',
  }
}

export interface TradeSummary { total: number; sale: number; saleCancelled: number; jeonse: number; monthly: number }

export function summarize(items: Trade[]): TradeSummary {
  const s: TradeSummary = { total: items.length, sale: 0, saleCancelled: 0, jeonse: 0, monthly: 0 }
  for (const t of items) {
    if (t.kind === '매매') { if (t.cancelled) s.saleCancelled++; else s.sale++ }
    else if (t.kind === '전세') s.jeonse++
    else s.monthly++
  }
  return s
}

/** 한국 시간 기준 n개월 전 YYYYMM */
export function monthsAgo(n: number, now = new Date()): string {
  const k = new Date(now.getTime() + 9 * 3600_000)
  const d = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() - n, 1))
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * 신고 기한(계약 후 30일)과 해제 신고가 남아 있는 최근 3개월은 하루만,
 * 그 이전 달은 30일 캐시한다.
 */
export function cacheSecondsFor(dealYmd: string, now = new Date()): number {
  return dealYmd >= monthsAgo(3, now) ? 86_400 : 30 * 86_400
}
