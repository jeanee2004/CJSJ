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
  // ── 확장 제도 (2026-11 조사). 출처·검증 상태는 아래 POLICIES 와 sources.ts 참고 ──
  generalButeemok: {
    // 마이홈포털 버팀목전세대출 안내(2026 기준)
    income: 5000,
    incomeNewlywed: 7500,
    asset: 34500, // 부부합산 순자산, 만원
    maxLoan: 8000, // 수도권 외
    ratio: 0.7,
    rateMin: 2.5,
    rateMax: 3.5,
  },
  youthMonthlyLoan: { ageMin: 19, ageMax: 34, income: 5000, asset: 34500, maxArea: 60 }, // 순자산 기준은 출처마다 달라 확인 필요
  smeYouthLoan: { ageMin: 19, ageMax: 34 },
  youthDreamAccount: { ageMin: 19, ageMax: 34, income: 5000, maxRate: 4.5 },
  youthDreamLoan: { ageMin: 19, ageMax: 34, incomeSingle: 7000, incomeNewlywed: 10000 },
  newlywedSpecial: { priorityPct: 100, dualPct: 120, generalPct: 140, dualGeneralPct: 160, incomeBase: 9040 }, // 3인 이하 100% ≈ 월 753만원 (2025 청약홈 표)
  lhYouthJeonse: { ageMin: 19, ageMax: 39 },
  lhNewlywedJeonse: { income100: 9040, income120: 10850, asset: 34500 },
  happyYouth: { ageMin: 19, ageMax: 39, income1p: 5491, asset: 25100, assetStudent: 10800, car: 4542 }, // 1인 가구 가산(120%) 포함 월 457.6만원
  happyNewlywed: { income2p: 7743, incomeMax: 11760, asset: 34500, car: 4542 },
  youthMaeip: { ageMin: 19, ageMax: 39, income1p: 4577, asset: 25100 }, // 3순위: 1인 도시근로자 월평균소득 100% (월 381.4만원)
  nationalRental: {
    income70: { 1: 4118, 2: 5632, 3: 6861 }, // 가구원수별 도시근로자 월평균소득 70% 연 환산, 만원
    income50: { 1: 3203, 2: 4224, 3: 4901 },
    asset: 34500,
  },
  rentTaxCredit: { salaryMax: 8000, salaryHigh: 5500, rateHigh: 17, rateLow: 15, rentCap: 1000 },
  housingBenefit: { income: { 1: 1477, 2: 2419, 3: 3087 } }, // 기준중위소득 48% 연 환산, 만원 (2026)
  depositGuaranteeFee: { feeCap: 40 }, // 만원, 정부24 원문 (세부 소득·보증금 기준은 미확인)
} as const

export type PolicyId =
  | 'sejongInterest'
  | 'sejongRent'
  | 'molitRent'
  | 'youthButeemok'
  | 'newlywedButeemok'
  | 'generalButeemok'
  | 'youthMonthlyLoan'
  | 'smeYouthLoan'
  | 'youthDreamAccount'
  | 'youthDreamLoan'
  | 'newlywedSpecial'
  | 'lhYouthJeonse'
  | 'lhNewlywedJeonse'
  | 'happyYouth'
  | 'happyNewlywed'
  | 'youthMaeip'
  | 'nationalRental'
  | 'rentTaxCredit'
  | 'housingBenefit'
  | 'depositGuaranteeFee'

export type Category = '월세지원' | '대출' | '공공임대' | '청약' | '비용지원'
export const CATEGORIES: Category[] = ['월세지원', '대출', '공공임대', '청약', '비용지원']
/** simple = 맛보기 설문으로 대략 판정 / deep = 심화 설문의 소득 분위·자산·세대 정보가 있어야 판정 (맛보기에서는 잠금 미리보기) */
export type Tier = 'simple' | 'deep'

export interface PolicyInfo {
  id: PolicyId
  name: string
  easy: string // 한 줄 쉬운 설명
  category: Category
  tier: Tier
  type: ('전세' | '월세' | '신혼' | '청년')[]
  money: string
  who: string
  how: string
  apply: { name: string; url: string }
  sourceIds: string[]
  verified: Verified
  caution?: string
  /** 심화 결과에서만 보여 주는 준비 서류·확인 항목 */
  checklist?: string[]
}

/** 홈 화면의 다섯 가지 핵심 지원. 결과 화면은 아래 ALL_POLICIES 를 쓴다 */
export const POLICIES: PolicyInfo[] = [
  {
    id: 'sejongInterest',
    category: '대출',
    tier: 'simple',
    name: '세종 청년 주택임차보증금 이자지원',
    easy: '전세 대출 이자의 일부를 세종시가 대신 내줘요.',
    type: ['전세', '청년', '신혼'],
    money: '은행금리 중 최대 4.1%p 지원 · 보증금의 90%, 최대 1억원 · 최장 6년',
    who: '세종 거주(예정) 19~39세 무주택. 미혼 연소득 4,500만원 이하 / 신혼부부 합산 8,000만원 이하',
    how: '세종 일자리 종합 플랫폼에서 온라인 신청 (2026.3.23~ 예산 소진 시까지 모집했고, 정부24 안내에는 "금년 상시모집 접수 마감"으로 표시돼요. 재모집 여부는 공고에서 확인)',
    apply: PORTALS.sejong,
    sourceIds: ['newspim_interest', 'hankook_interest', 'sejong_interest_2025', 'gov24_sejong_interest'],
    verified: 'secondary',
    caution: '집값의 마지막 큰 금액(잔금)을 치르기 전에 신청해야 해요. 주택금융공사 보증료 같은 부대비용은 본인이 부담해요(2025 공고 기준). 2026년 접수는 정부24 기준 마감 상태예요(2026.11 확인). 신혼부부 소득 기준은 보도 8,000만원, 정부24 페이지 7,000만원으로 달라 공고에서 확인하세요.',
  },
  {
    id: 'sejongRent',
    category: '월세지원',
    tier: 'simple',
    name: '세종 청년 주거임대료 지원',
    easy: '내가 낸 월세를 월 최대 20만원씩 돌려줘요.',
    type: ['월세', '청년'],
    money: '월 최대 20만원 · 평생 1회 · 최대 10개월',
    who: '세종 거주 19~39세 무주택 1인 가구. 보증금 1억 이하, 월세 60만원 이하, 85㎡ 이하. 소득은 기준중위소득 150% 이하(1인 월 384만원), 재산 1.22억 이하',
    how: '세종 일자리 종합 플랫폼 온라인 신청 (2026년은 3.3~3.5 사흘만 접수. 보도에 "상반기" 모집으로 나와 하반기 재모집은 공고에서 확인)',
    apply: PORTALS.sejong,
    sourceIds: ['viva_rent'], // 2026.11 재확인: 접수 3.3~3.5, 기준중위소득 150%(월 384만원)·재산 1.22억 일치
    verified: 'secondary',
    caution: '1년에 사흘만 접수해요. 놓치면 다음 해를 기다려야 해서, 접수 기간을 꼭 챙겨 주세요.',
  },
  {
    id: 'molitRent',
    category: '월세지원',
    tier: 'simple',
    name: '국토부 청년월세지원',
    easy: '부모님과 따로 사는 청년의 월세를 월 최대 20만원씩 도와줘요.',
    type: ['월세', '청년'],
    money: '월 최대 20만원 · 최대 24개월 (총 480만원) · 2026년 신규 접수는 5.29 마감',
    who: '만 19~34세 무주택, 부모와 따로 거주. 청년가구 중위소득 60% 이하·재산 1.22억 이하, 원가구 중위소득 100% 이하·재산 4.7억 이하',
    how: '복지로 또는 행정복지센터 (2026년 신규 접수는 3.30~5.29 16시에 마감. 다음 접수는 국토부·복지로 공고에서 확인)',
    apply: PORTALS.bokjiro,
    sourceIds: ['studygov_rent', 'vegan_rent'],
    verified: 'secondary',
    caution: '세종시 임대료 지원과 같은 기간에는 둘 중 하나만 받을 수 있어요. 2026년 신규 접수는 끝났고, 2027년에는 소득 기준 완화 등 확대안이 예산안 단계라 확정 공고를 기다려야 해요. 이미 선정된 사람은 계속 지급받아요.',
  },
  {
    id: 'youthButeemok',
    category: '대출',
    tier: 'simple',
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
    category: '대출',
    tier: 'simple',
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

// ── 확장 제도 ──
// 확인한 것만 넣었다. 금액·기준을 원문에서 읽지 못한 항목은 숫자를 쓰지 않고 verified 를 낮춰 두었다.
// 조사일 2026-11-04. 공고가 바뀌면 이 파일과 RULES, sources.ts 만 고친다.
const MORE: PolicyInfo[] = [
  {
    id: 'generalButeemok', category: '대출', tier: 'simple', type: ['전세'],
    name: '버팀목 전세자금대출 (일반)',
    easy: '나이 제한 없이 무주택 세대주가 낮은 금리로 전세금을 빌리는 나라 대출이에요.',
    money: '연 2.5~3.5%(변동) · 수도권 외 최대 8,000만원 · 필요 자금의 70% 이내',
    who: '성년 무주택 세대주, 부부합산 연소득 5,000만원 이하, 순자산 3.45억원 이하 (신혼·2자녀 가구는 소득·한도 우대)',
    how: '기금e든든 / 취급 은행',
    apply: PORTALS.nhuf, sourceIds: ['myhome_buteemok'], verified: 'official',
    caution: '만 34세 이하 청년과 신혼부부는 전용 상품이 금리·한도가 더 좋아서 그쪽을 먼저 보세요.',
    checklist: ['임대차계약서(계약금 5% 영수증)', '주민등록등본·가족관계증명서', '소득금액증명(홈택스)', '순자산 계산: 부동산·자동차·예금에서 부채를 뺀 금액'],
  },
  {
    id: 'youthMonthlyLoan', category: '대출', tier: 'simple', type: ['월세', '청년'],
    name: '청년전용 보증부월세대출',
    easy: '보증금과 매달 내는 월세를 낮은 금리로 빌릴 수 있는 청년 전용 나라 대출이에요.',
    money: '보증금 대출 + 월세금 대출 (한도·금리는 해마다 달라 취급 은행에서 확인)',
    who: '만 19~34세 무주택 단독세대주, 부부합산 연소득 5,000만원 이하, 전용 60㎡ 이하 주택. 순자산 기준은 출처마다 달라(3.37억/3.45억) 공고 확인 필요',
    how: '기금e든든 / 취급 은행',
    apply: PORTALS.nhuf, sourceIds: ['gg_wolse_loan', 'myhome_buteemok'], verified: 'secondary',
    caution: '한도·금리 숫자는 최신 자료를 확인하지 못해 적지 않았어요. 신청 전 은행에서 꼭 확인하세요.',
    checklist: ['임대차계약서', '주민등록등본(세대주 확인)', '소득금액증명', '건축물대장(전용면적 60㎡ 이하 확인)'],
  },
  {
    id: 'smeYouthLoan', category: '대출', tier: 'deep', type: ['전세', '청년'],
    name: '중소기업 취업 청년 전월세보증금대출',
    easy: '중소·중견기업에 다니는 청년을 위한 낮은 금리 보증금 대출이에요.',
    money: '과거 자료: 연 1.5% 고정 · 최대 1억원. 현재 운영 조건은 확인 필요',
    who: '만 19~34세 중소·중견기업 재직 청년 (공무원·공공기관 제외). 소득 기준은 과거 자료만 있어 적지 않음',
    how: '기금e든든 / 취급 은행 (현재 접수 방식은 은행에 확인)',
    apply: PORTALS.nhuf, sourceIds: ['molit_sme_youth'], verified: 'unverified',
    caution: '청년전용 버팀목 체계로 합쳐졌다는 자료가 있어요(중소기업 재직 시 우대금리). 지금도 따로 있는 상품인지 먼저 확인하세요.',
    checklist: ['재직증명서·사업자등록번호(중소기업 확인)', '소득금액증명', '임대차계약서'],
  },
  {
    id: 'youthDreamAccount', category: '청약', tier: 'simple', type: ['청년'],
    name: '청년주택드림 청약통장',
    easy: '집을 사려는 청년이 높은 이자를 받으며 모으는 청약통장이에요. 나중에 낮은 금리 대출과 이어져요.',
    money: '금리 연 2.0~4.5%(조건 충족 시 최고) · 월 2만~100만원 납입 · 소득공제',
    who: '만 19~34세 무주택, 연소득 5,000만원 이하 (병역 이행 기간만큼 나이에서 빼 줘요)',
    how: '취급 은행 (우리·국민·신한·하나·농협 등) 앱·창구',
    apply: { name: '청약홈', url: 'https://www.applyhome.co.kr' }, sourceIds: ['korea_dream'], verified: 'secondary',
    caution: '전월세 지원이 아니라 내 집 마련 준비용이에요. 4.5%는 최고 금리라 가입 후 무주택을 유지하는 등 조건이 붙어요.',
    checklist: ['신분증', '소득 확인 서류(소득금액증명 등)', '무주택 확인(주택소유확인 서류)'],
  },
  {
    id: 'youthDreamLoan', category: '대출', tier: 'deep', type: ['청년'],
    name: '청년주택드림대출 (내 집 마련)',
    easy: '청년주택드림 청약통장으로 내 집을 사게 되면 낮은 금리로 빌려 주는 대출이에요.',
    money: '최저 연 2.2%부터(소득·만기별 차등) · 최대 40년 만기',
    who: '만 19~34세 무주택, 연소득 미혼 7,000만원 / 신혼 부부합산 1억원 이하, 청약통장 1년 이상 가입·1,000만원 이상 납입 후 청약 당첨',
    how: '기금e든든 / 취급 은행',
    apply: PORTALS.nhuf, sourceIds: ['korea_dream'], verified: 'secondary',
    caution: '집을 사는 계획이 있을 때만 해당돼요. 지금 전월세를 구한다면 참고만 하세요.',
    checklist: ['청약통장 가입일·납입 내역', '소득금액증명', '분양 계약서'],
  },
  {
    id: 'newlywedSpecial', category: '청약', tier: 'deep', type: ['신혼'],
    name: '신혼부부 특별공급 (청약)',
    easy: '결혼 7년 이내 신혼부부가 새 아파트 분양을 일반 청약보다 유리하게 노릴 수 있어요.',
    money: '분양가 기준 · 소득 우선공급 100%(맞벌이 120%), 일반공급 140%(맞벌이 160%) 안팎 (공급 유형마다 달라요)',
    who: '혼인 7년 이내(예비신혼 포함) 무주택 세대구성원, 청약통장 가입. 소득 기준은 도시근로자 월평균소득 대비 %',
    how: '청약홈 (단지별 입주자 모집공고 확인)',
    apply: { name: '청약홈', url: 'https://www.applyhome.co.kr' }, sourceIds: ['applyhome_special'], verified: 'secondary',
    caution: '소득 기준 금액은 2025년 청약홈 표로 확인했고 2026 공고에서는 달라질 수 있어요. 단지 공고문이 최종 기준이에요.',
    checklist: ['청약통장 가입 기간·납입 횟수', '혼인관계증명서(예비신혼은 혼인 예정 확인)', '건강보험 자격득실확인서(소득 확인)', '무주택 기간 확인'],
  },
  {
    id: 'lhYouthJeonse', category: '공공임대', tier: 'deep', type: ['전세', '청년'],
    name: 'LH 청년 전세임대',
    easy: 'LH가 내가 고른 집의 전세 계약을 대신 맺고, 나는 낮은 임대료만 내는 제도예요.',
    money: '지역별 지원 한도 안에서 LH가 전세금 지원 · 본인은 소액 보증금 + 임대료 (순위별로 달라요)',
    who: '만 19~39세 무주택 미혼 청년 (순위: 1순위 수급자·한부모·차상위 등). 소득·자산 기준은 공고문 확인',
    how: 'LH청약플러스 / 마이홈 수시모집 접수 → 선정 후 집 물색·계약',
    apply: PORTALS.myhome, sourceIds: ['lh_jeonse'], verified: 'secondary',
    caution: '입주자로 선정된 뒤에 집을 찾아 LH가 계약해요. 이미 계약했거나 이사한 집에는 쓸 수 없어요. 지원 한도·소득 수치는 확인한 공식 원문이 없어 적지 않았어요.',
    checklist: ['주민등록등본·가족관계증명서', '소득·자산 조회 동의(사회보장정보시스템)', '신청 순위 증빙(수급자 증명 등)'],
  },
  {
    id: 'lhNewlywedJeonse', category: '공공임대', tier: 'deep', type: ['전세', '신혼'],
    name: 'LH 신혼부부 전세임대',
    easy: 'LH가 신혼부부 대신 전세 계약을 맺고, 부부는 낮은 임대료를 내며 사는 제도예요.',
    money: '지역별 지원 한도 안에서 LH가 전세금 지원 (한도 수치는 최신 공고 확인)',
    who: '혼인 7년 이내(예비 포함) 무주택. Ⅰ형 소득 70% 이하 / Ⅱ형 소득 100%(맞벌이 120%) 이하, 총자산 3.45억·자동차 4,542만원 이하',
    how: 'LH 전세임대포털 / LH청약플러스 접수',
    apply: PORTALS.myhome, sourceIds: ['lh_jeonse', 'myhome_happy'], verified: 'secondary',
    caution: 'LH 안내 페이지가 오래되어 소득 비율은 과거 기준일 수 있어요. 선정 뒤에 집을 찾아 계약해요.',
    checklist: ['혼인관계증명서', '건강보험 자격득실확인서·소득 증빙', '소득·자산 조회 동의'],
  },
  {
    id: 'happyYouth', category: '공공임대', tier: 'deep', type: ['청년'],
    name: '행복주택 (청년·대학생·사회초년생)',
    easy: '주변 시세보다 싸게 사는 청년용 공공임대예요. 공고가 날 때 신청해요.',
    money: '시세보다 낮은 임대료 · 단지별 공고에서 보증금·월 임대료 확인',
    who: '만 19~39세 미혼 무주택. 소득: 세대 월평균소득이 도시근로자 100% 이하(1인 가구는 120%로 가산), 총자산 2.51억·자동차 4,542만원 이하 (대학생은 본인+부모 소득·총자산 1.08억 이하, 사회초년생은 소득 업무 5년 이내)',
    how: 'LH청약플러스·마이홈 공고 확인 후 온라인 접수',
    apply: PORTALS.myhome, sourceIds: ['myhome_happy'], verified: 'official',
    caution: '모집공고가 있을 때만 신청할 수 있어요. 세종 공고는 아래 "지금 신청 가능한 공공임대"에서 확인하세요.',
    checklist: ['소득·자산 조회 동의', '주민등록등본', '재직증명서(사회초년생) 또는 재학증명서(대학생)', '무주택 확인'],
  },
  {
    id: 'happyNewlywed', category: '공공임대', tier: 'deep', type: ['신혼'],
    name: '행복주택 (신혼부부)',
    easy: '신혼부부가 시세보다 싸게 살 수 있는 공공임대예요. 공고가 날 때 신청해요.',
    money: '시세보다 낮은 임대료 · 단지별 공고에서 확인',
    who: '혼인 7년 이내 또는 만 6세 이하 자녀가 있는 무주택 세대구성원, 소득 100%(맞벌이 120%) 이하, 총자산 3.45억·자동차 4,542만원 이하',
    how: 'LH청약플러스·마이홈 공고 확인 후 온라인 접수',
    apply: PORTALS.myhome, sourceIds: ['myhome_happy'], verified: 'official',
    checklist: ['혼인관계증명서', '소득·자산 조회 동의', '건강보험 자격득실확인서(맞벌이 확인)'],
  },
  {
    id: 'youthMaeip', category: '공공임대', tier: 'deep', type: ['월세', '청년'],
    name: 'LH 청년 매입임대주택',
    easy: 'LH가 사들인 집을 시세의 40~50%만 내고 빌려 쓰는 청년용 공공임대예요.',
    money: '임대료 시세의 40%(1순위, 보증금 100만원) / 50%(2·3순위, 보증금 200만원) · 최장 10년',
    who: '만 19~39세 미혼 무주택 (대학생·취업준비생 포함). 1순위 수급자·차상위·한부모 / 2순위 본인+부모 소득 100% 이하 / 3순위 본인 소득 1인 도시근로자 100% 이하',
    how: 'LH청약플러스 분기별 모집(3·6·9·12월) 공고',
    apply: PORTALS.myhome, sourceIds: ['lh_youth_maeip'], verified: 'official',
    checklist: ['소득·자산 조회 동의', '주민등록등본', '재학·졸업 증명(대학생·취업준비생)', '부모 소득 확인 서류(2순위)'],
  },
  {
    id: 'nationalRental', category: '공공임대', tier: 'deep', type: ['월세', '전세'],
    name: '국민임대주택',
    easy: '소득이 낮은 무주택 가구가 시세의 60~80%로 오래 살 수 있는 공공임대예요.',
    money: '임대료 시세의 60~80% · 전용 60㎡ 이하 · 2년 단위 갱신',
    who: '무주택 세대구성원, 가구 월평균소득이 도시근로자 70% 이하(50㎡ 미만은 50% 이하 우선), 총자산 3.45억·자동차 4,542만원 이하',
    how: 'LH청약플러스·마이홈 공고 확인 후 접수',
    apply: PORTALS.myhome, sourceIds: ['myhome_national'], verified: 'official',
    checklist: ['세대원 전원 소득·자산 조회 동의', '주민등록등본', '가족관계증명서'],
  },
  {
    id: 'rentTaxCredit', category: '비용지원', tier: 'simple', type: ['월세'],
    name: '월세 세액공제',
    easy: '월세를 낸 직장인이 연말정산에서 낸 월세의 일부를 세금에서 돌려받는 제도예요.',
    money: '월세 연 1,000만원까지 대상 · 총급여 5,500만원 이하 17%, 8,000만원 이하 15% (최대 약 170만원)',
    who: '총급여 8,000만원 이하 근로소득자, 무주택 세대주(또는 세대원), 국민주택규모 이하 또는 기준시가 4억원 이하 주택, 계약서 주소와 주민등록 주소가 같아야 함',
    how: '연말정산(회사) 또는 5월 종합소득세 신고 / 홈택스 경정청구',
    apply: { name: '국세청 홈택스', url: 'https://www.hometax.go.kr' }, sourceIds: ['tax_rent', 'mtn_tax_2027'], verified: 'secondary',
    caution: '정부 지원금이 아니라 세금 환급이에요. 근거는 조세특례제한법 시행령 제95조로 안내되고, 국세청 원문 확인을 권해요. 2026.8 세제개편안에 공제 대상 월세 한도를 1,200만원으로 올려 2027.1.1부터 적용하는 안이 있어요(국회 통과는 확인 못 함). 지금 적용은 1,000만원이에요.',
    checklist: ['임대차계약서 사본', '월세 이체 내역(계좌이체 영수증)', '주민등록등본', '임대인 인적사항'],
  },
  {
    id: 'housingBenefit', category: '월세지원', tier: 'deep', type: ['월세', '전세'],
    name: '주거급여 (임차급여)',
    easy: '소득이 아주 낮은 가구에 월세 일부를 나라가 매달 보태 주는 복지 제도예요.',
    money: '기준임대료 안에서 실제 임차료 지원 (가구원수·지역에 따라 달라요)',
    who: '소득인정액이 기준중위소득 48% 이하(2026 1인 월 약 123만원). 부양의무자 소득·재산은 보지 않음',
    how: '복지로 또는 행정복지센터',
    apply: PORTALS.bokjiro, sourceIds: ['molit_housing_benefit', 'bokjiro_median'], verified: 'official',
    caution: '소득인정액은 소득에 재산을 월 소득으로 바꾼 값을 더해요. 부모와 따로 사는 청년은 부모 가구와 별도로 신청(분리지급)할 수 있는 경우가 있어요.',
    checklist: ['임대차계약서', '소득·재산 조회 동의', '통장 사본', '주민등록등본'],
  },
  {
    id: 'depositGuaranteeFee', category: '비용지원', tier: 'deep', type: ['전세', '청년'],
    name: '세종 전세보증금반환보증 보증료 지원',
    easy: '전세 보증금을 지키는 반환보증 보험료를 세종시가 지원해 주는 사업이에요.',
    money: '보증료 최대 40만원 (정부24 공공서비스 원문)',
    who: '세종 거주 무주택 임차인 (나이 하한 19세, 상한 없음). 소득·보증금 기준은 정부24 원문에서 확인',
    how: '정부24 공공서비스 안내 · 세종시 주택과(☎044-300-5917) 문의',
    apply: { name: '정부24', url: 'https://www.gov.kr/portal/rcvfvrSvc/main' }, sourceIds: ['gov24_sejong_fee', 'guri_fee'], verified: 'official',
    caution: '세부 소득·보증금 기준을 확인하지 못해 "확인해 보면 좋아요"로만 안내해요. 반환보증에 먼저 가입하고 영수증을 보관해야 해요. 타 지자체(구리시) 사례는 비교용이에요.',
    checklist: ['전세보증금반환보증 가입 증서·보증료 납부 영수증', '임대차계약서', '주민등록등본(세종 거주 확인)'],
  },
]

/** 홈 다섯 가지 + 확장 제도. 결과 화면과 판정에 쓴다 */
export const ALL_POLICIES: PolicyInfo[] = [...POLICIES, ...MORE]
export const policyById = (id: string): PolicyInfo | undefined => ALL_POLICIES.find((p) => p.id === id)

// 핵심 다섯 제도의 심화용 준비 서류
const CORE_CHECK: Partial<Record<PolicyId, string[]>> = {
  sejongInterest: ['임대차계약서', '주민등록등본(세종 전입 확인)', '소득금액증명', '대출 약정 전 신청(잔금 전)'],
  sejongRent: ['임대차계약서(월세 이체 내역)', '주민등록등본', '건강보험 자격득실확인서', '재산 확인 서류'],
  molitRent: ['임대차계약서', '주민등록등본(부모와 주소 분리 확인)', '부모 가구 소득·재산 조회 동의', '월세 이체 내역'],
  youthButeemok: ['임대차계약서(계약금 5% 영수증)', '주민등록등본', '소득금액증명', '순자산 계산 서류'],
  newlywedButeemok: ['임대차계약서(계약금 5% 영수증)', '혼인관계증명서(예비부부는 청첩장 등)', '부부 소득금액증명', '순자산 계산 서류'],
}
for (const p of POLICIES) p.checklist = CORE_CHECK[p.id]
