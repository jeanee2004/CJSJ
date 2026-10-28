import type { Verified } from './sources'

export interface ChartMeta {
  title: string
  takeaway: string
  sourceIds: string[]
  verified: Verified
  note?: string
}

// 세종시 2025 청년통계 (뉴시스 2025.12.30 보도)
export const HOUSING_TYPE = [
  { name: '보증금 있는 월세', value: 42.5 },
  { name: '자가', value: 30.8 },
  { name: '전세', value: 21.4 },
  { name: '기타', value: 5.3 },
]

export const HOUSING_META: ChartMeta = {
  title: '세종 청년 10명 중 4명은 월세에 살아요',
  takeaway: '전세만 알아보면 놓치는 지원이 많아요. 월세 지원도 함께 살펴보세요.',
  sourceIds: ['newsis_youth_stat'],
  verified: 'secondary',
  note: '기타 5.3%는 100%에서 나머지를 뺀 값이에요.',
}

// 소득 상한 비교 (만원, 연)
export const INCOME_LIMITS = [
  { name: '세종 이자지원 · 미혼', value: 4500, kind: 'sejong' },
  { name: '청년 버팀목', value: 5000, kind: 'nation' },
  { name: '신혼 버팀목', value: 7500, kind: 'nation' },
  { name: '세종 이자지원 · 신혼', value: 8000, kind: 'sejong' },
]
export const EXAMPLE_COUPLE = 8500

export const INCOME_META: ChartMeta = {
  title: '맞벌이 부부 합산 8,500만원이면 받을 수 있는 제도가 없어요',
  takeaway: '소득 상한선 바로 위에 있는 부부는 어디에도 해당되지 않는 "경계선"에 놓이게 돼요.',
  sourceIds: ['newspim_interest', 'myhome_buteemok'],
  verified: 'secondary',
  note: '8,500만원은 청정 세종이 만든 예시 가구(P4)예요. 실제 통계가 아니에요.',
}

// 실거래가 API 폴백값. 화면은 /api/trades 로 최신 달을 불러오고, 실패하면 이 값을 보여준다.
// PRD 인용값(매매 580 vs 전세 150)은 2026-10-28 국토부 실거래가 API로 확인해 보니 맞지 않아 실측값으로 바꿨다.
// 매매는 해제(cdealType=O) 23건을 뺀 387건(신고 410건), 전세는 월세 0원인 계약만 센 값.
export const SALE_FALLBACK_YM = '202605'
export const SALE_VS_JEONSE = [
  { name: '매매', value: 387 },
  { name: '전세', value: 610 },
]
export const SALE_META: ChartMeta = {
  title: '세종 아파트는 전세 거래가 매매보다 많아요',
  takeaway: '같은 달에 신고된 아파트 매매(해제 제외)와 전세(월세 0원) 계약 건수예요.',
  sourceIds: ['molit_rtms'],
  verified: 'official',
  note: '2026년 5월 계약분, 2026.10.28 조회 기준이에요.',
}

// value는 순유출 크기(명). 화면에서 '−'를 붙여 순유출로 표시한다.
export const OUTFLOW = [{ name: '20~24세 순유출(2025)', value: 479 }]
export const OUTFLOW_META: ChartMeta = {
  title: '20~24세는 한 해 479명이 세종을 떠났어요',
  takeaway: '대학을 졸업할 즈음, 세종에 머물 수 있는 이유가 필요해요.',
  sourceIds: ['prd'],
  verified: 'unverified',
  note: 'PRD 인용값. 통계청 국내인구이동통계(KOSIS)로 재확인이 필요해요.',
}

// 세종시 청년 기본 수치 (뉴시스 2025.12.30, 2024.12 기준)
export const YOUTH_KPIS = [
  { label: '세종 청년(15~39세)', value: '119,927명', sub: '전체 인구의 30.7%', sourceId: 'newsis_youth_stat' },
  { label: '청년 1인 가구', value: '55.4%', sub: '청년가구 2만 6,757가구', sourceId: 'newsis_youth_stat' },
  { label: '보증부 월세 거주', value: '42.5%', sub: '자가 30.8% · 전세 21.4%', sourceId: 'newsis_youth_stat' },
]
