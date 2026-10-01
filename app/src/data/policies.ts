import { PORTALS } from './sources'
import type { Verified } from './sources'

// 판정 코드와 분리된 설정값. 공고가 바뀌면 이 파일만 고친다.
export const RULES = {
  sejongInterest: {
    ageMin: 19,
    ageMax: 39,
    incomeSingle: 4500, // 만원, 연
    incomeNewlywed: 8000, // 만원, 부부합산 (뉴스 2건 일치, 시청 원문 미확인)
    maxLoan: 10000, // 만원
    loanRatio: 0.9,
    maxSupportRate: 4.1, // %p
  },
  sejongRent: {
    ageMin: 19,
    ageMax: 39,
    // 기준중위소득 150%, 1인 월 384만원 → 연 4,608만원
    incomeYear: 4608,
    maxDeposit: 10000,
    maxRent: 60,
    maxArea: 85,
    monthlySupport: 20,
    months: 10,
  },
  molitRent: {
    ageMin: 19,
    ageMax: 34,
    // 청년가구 기준중위소득 60% 1인 가구의 연 환산 근사치 — 원문 확인 필요
    incomeYearApprox: 1900,
    monthlySupport: 20,
    months: 24,
  },
  youthButeemok: {
    ageMin: 19,
    ageMax: 34,
    income: 5000,
    maxLoan: 15000,
    ratio: 0.8,
    rateMin: 2.0,
    rateMax: 3.1,
  },
  newlywedButeemok: {
    income: 7500,
    maxLoanNonCapital: 16000, // 수도권 외
    ratio: 0.8,
    rateMin: 2.1,
    rateMax: 2.9,
  },
} as const

export type PolicyId =
  | 'sejongInterest'
  | 'sejongRent'
  | 'molitRent'
  | 'youthButeemok'
  | 'newlywedButeemok'

export interface PolicyInfo {
  id: PolicyId
  name: string
  easy: string // 한 줄 쉬운 설명
  type: ('전세' | '월세' | '신혼' | '청년')[]
  money: string
  who: string
  how: string
  apply: { name: string; url: string }
  sourceIds: string[]
  verified: Verified
  caution?: string
}

export const POLICIES: PolicyInfo[] = [
  {
    id: 'sejongInterest',
    name: '세종 청년 주택임차보증금 이자지원',
    easy: '전세 대출 이자의 일부를 세종시가 대신 내줘요.',
    type: ['전세', '청년', '신혼'],
    money: '은행금리 중 최대 4.1%p 지원 · 보증금의 90%, 최대 1억원 · 최장 6년',
    who: '세종 거주(예정) 19~39세 무주택. 미혼 연소득 4,500만원 이하 / 신혼부부 합산 8,000만원 이하',
    how: '세종 일자리 종합 플랫폼에서 온라인 신청 (2026.3.23~ 예산 소진 시까지)',
    apply: PORTALS.sejong,
    sourceIds: ['newspim_interest', 'hankook_interest', 'sejong_interest_2025'],
    verified: 'secondary',
    caution: '집값의 마지막 큰 금액(잔금)을 치르기 전에 신청해야 해요. 주택금융공사 보증료 같은 부대비용은 본인이 부담해요(2025 공고 기준).',
  },
  {
    id: 'sejongRent',
    name: '세종 청년 주거임대료 지원',
    easy: '내가 낸 월세를 월 최대 20만원씩 돌려줘요.',
    type: ['월세', '청년'],
    money: '월 최대 20만원 · 평생 1회 · 최대 10개월',
    who: '세종 거주 19~39세 무주택 1인 가구. 보증금 1억 이하, 월세 60만원 이하, 85㎡ 이하. 소득은 기준중위소득 150% 이하(1인 월 384만원), 재산 1.22억 이하',
    how: '세종 일자리 종합 플랫폼 온라인 신청 (2026년은 3.3~3.5 사흘만 접수)',
    apply: PORTALS.sejong,
    sourceIds: ['viva_rent'],
    verified: 'secondary',
    caution: '1년에 사흘만 접수해요. 놓치면 다음 해를 기다려야 해서, 접수 기간을 꼭 챙겨 주세요.',
  },
  {
    id: 'molitRent',
    name: '국토부 청년월세지원',
    easy: '부모님과 따로 사는 청년의 월세를 월 최대 20만원씩 도와줘요.',
    type: ['월세', '청년'],
    money: '월 최대 20만원 · 최대 24개월 (총 480만원)',
    who: '만 19~34세 무주택, 부모와 따로 거주. 청년가구 중위소득 60% 이하·재산 1.22억 이하, 원가구 중위소득 100% 이하·재산 4.7억 이하',
    how: '복지로 또는 행정복지센터 (2026.3.30부터 상시 접수)',
    apply: PORTALS.bokjiro,
    sourceIds: ['studygov_rent'],
    verified: 'secondary',
    caution: '세종시 임대료 지원과 같은 기간에는 둘 중 하나만 받을 수 있어요.',
  },
  {
    id: 'youthButeemok',
    name: '청년전용 버팀목 전세대출',
    easy: '청년이 낮은 금리로 전세금을 빌릴 수 있는 나라 대출이에요.',
    type: ['전세', '청년'],
    money: '연 2.0~3.1% · 최대 1.5억원(2025.6.28 이후 계약) · 전세금의 80% 이내',
    who: '만 19~34세 무주택 세대주, 부부합산 연소득 5,000만원 이하, 순자산 3.45억원 이하',
    how: '기금e든든 / 취급 은행 (보증금의 5%를 낸 뒤부터 신청)',
    apply: PORTALS.nhuf,
    sourceIds: ['myhome_buteemok', 'banksalad_youth'],
    verified: 'secondary',
  },
  {
    id: 'newlywedButeemok',
    name: '신혼부부전용 버팀목 전세대출',
    easy: '신혼부부(혼인 7년 이내·예비부부)를 위한 낮은 금리 전세대출이에요.',
    type: ['전세', '신혼'],
    money: '연 2.1~2.9% · 수도권 외 최대 1.6억원 · 전세금의 80% 이내',
    who: '무주택 세대주, 신혼부부 부부합산 연소득 7,500만원 이하',
    how: '기금e든든 / 취급 은행',
    apply: PORTALS.nhuf,
    sourceIds: ['myhome_buteemok', 'korea_newlywed_2023'],
    verified: 'official',
    caution: '세종 이자지원과는 둘 중 하나만 고를 수 있어요.',
  },
]
