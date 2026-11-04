import { ALL_POLICIES, RULES } from '../data/policies'
import type { PolicyId } from '../data/policies'

export type Marital = 'single' | 'newlywed' | 'planning'
export type Deal = 'jeonse' | 'banjeonse' | 'wolse'
export type Stage = 'explore' | 'contract' | 'paid' | 'movedin'
export type HouseType = 'normal' | 'multi'
// 세종시 청년 주거실태조사(2026) S2 거주 형태와 같은 구분
export type Residence = 'both' | 'regOnly' | 'liveOnly' | 'outside'

export interface Answers {
  age: number
  residence: Residence // 주민등록·실거주 지역
  marital: Marital
  income: number // 만원, 연 (부부면 합산)
  livesApart: boolean // 부모와 주소 분리
  ownsHome: boolean
  hasLoan: boolean // 기존 전세대출(버팀목 등) 보유
  usedBefore: boolean // 세종 이자지원·임대료 사용 이력
  deal: Deal
  deposit: number // 만원
  rent: number // 만원/월
  houseType: HouseType
  stage: Stage
  aware?: string[] // 이미 알고 있던 제도 id (하나도 몰랐으면 ['none'])
  surveyType?: 'simple' | 'deep' // 간편(로그인 전) / 심화(로그인 후) 설문 구분
  survey?: Record<string, unknown> // 세종시 조사 문항 응답 원본 (결과 요약용)
  unknown?: string[] // "모름"이라고 답한 항목 (결과에서 다시 확인하도록 안내)
  // ── 심화 설문 전용 (맛보기에는 없다. 모두 선택 값이라 없어도 판정은 동작) ──
  medianBand?: Band // 1인 기준중위소득 대비: 1 ≤50% / 2 50~100% / 3 100~150% / 4 150% 초과
  separateHousehold?: boolean // 부모와 주민등록상 별도 세대
  homelessYears?: number // 무주택 기간 하한(년): 0, 1, 3, 5
  assetBand?: Band // 부채를 뺀 순자산: 1 ≤1.22억 / 2 ~2.51억 / 3 ~3.45억 / 4 3.45억 초과
  debt?: 'none' | 'small' | 'mid' | 'large'
  employer?: 'sme' | 'large' | 'public' | 'none' // 재직 회사 성격
  wishDeposit?: number // 감당 가능한 최대 보증금 (만원)
  wishRent?: number // 감당 가능한 최대 월세 (만원)
}
export type Band = 1 | 2 | 3 | 4

export type Status = 'ok' | 'maybe' | 'no'
// 내부 집계용 사유 코드 (PRD §7). 화면에는 쉬운 말로만 보여준다.
export type ReasonCode =
  | 'EXCL_DUP_LOAN'
  | 'EXCL_INCOME_COUPLE'
  | 'EXCL_INCOME_SINGLE'
  | 'EXCL_AGE'
  | 'EXCL_RESIDENCE'
  | 'EXCL_HOUSE_TYPE'
  | 'EXCL_DEAL_TYPE'
  | 'EXCL_TIMING'
  | 'EXCL_ONCE'
  | 'EXCL_OWN_HOME'
  | 'EXCL_PICK_ONE'
  | 'EXCL_ASSET'
  | 'EXCL_EMPLOYER'

export interface Verdict {
  id: PolicyId
  status: Status
  reasons: string[]
  codes: ReasonCode[]
  todo: string[]
  needCheck?: boolean // 확인 필요 항목이 판정에 영향
  need?: string[] // (심화) 준비 서류·확인 항목
  fix?: string[] // (심화) 지금 안 될 때 어떻게 해 볼 수 있는지
}

const isCouple = (a: Answers) => a.marital !== 'single'

// 세종시 지원은 세종에 주민등록 + 실거주가 모두 있어야 해서, 아닌 경우 해야 할 일을 알려 준다
function residenceTodo(a: Answers, v: Verdict) {
  if (v.status === 'no' || a.residence === 'both') return
  const msg: Record<Exclude<Residence, 'both'>, string> = {
    regOnly: '주민등록은 세종인데 실제로는 다른 곳에 살고 있어요. 실제 거주지가 세종이어야 해서 이사 후 신청하세요.',
    liveOnly: '세종에 살지만 주민등록은 다른 곳이에요. 전입신고(주소 옮기기)를 먼저 해야 신청할 수 있어요.',
    outside: '아직 세종에 살지 않아요. 세종으로 이사하고 전입신고를 한 뒤에 신청할 수 있어요.',
  }
  v.todo.push(msg[a.residence])
  if (v.status === 'ok') v.status = 'maybe'
  v.reasons.push(a.residence === 'outside' ? '아직 세종에 살지 않아서 지금은 신청할 수 없고, 이사 후에 가능해요.' : '세종 주민등록과 실거주가 모두 필요한데 지금은 하나가 빠져 있어요.')
}

function make(id: PolicyId): Verdict {
  return { id, status: 'ok', reasons: [], codes: [], todo: [] }
}
function fail(v: Verdict, code: ReasonCode, reason: string) {
  v.status = 'no'
  v.codes.push(code)
  v.reasons.push(reason)
}
const blocked = (v: Verdict): boolean => v.status === 'no'
function warn(v: Verdict, reason: string, todo?: string) {
  if (v.status === 'ok') v.status = 'maybe'
  v.reasons.push(reason)
  if (todo) v.todo.push(todo)
}
const fmt = (n: number) => n.toLocaleString('ko-KR')

const isDeep = (a: Answers) => a.surveyType === 'deep'
// 설문을 거친 답이면(맛보기·심화) 확인하지 못한 자산·소득은 "신청 가능"으로 단정하지 않는다. 설문 구분이 없으면(직접 입력) 예전처럼 둔다
const strict = (a: Answers) => a.surveyType !== undefined

type Fit = 'ok' | 'maybe' | 'no' | 'unknown'
const ASSET_BANDS: [number, number][] = [[0, 12200], [12200, 25100], [25100, 34500], [34500, Infinity]] // 만원
const MEDIAN_BANDS: [number, number][] = [[0, 50], [50, 100], [100, 150], [150, Infinity]] // 기준중위소득 %
function bandFit(band: Band | undefined, table: [number, number][], limit: number): Fit {
  if (!band) return 'unknown'
  const [lo, hi] = table[band - 1]
  return hi <= limit ? 'ok' : lo >= limit ? 'no' : 'maybe'
}
const assetFit = (a: Answers, limit: number) => bandFit(a.assetBand, ASSET_BANDS, limit)
const medianFit = (a: Answers, pct: number) => bandFit(a.medianBand, MEDIAN_BANDS, pct)

/** 순자산(부동산·자동차·예금 − 부채) 기준을 본다. 구간이 기준에 걸치거나 모르면 확인 항목으로 남긴다 */
function assetStep(a: Answers, v: Verdict, limit: number, who = '내') {
  if (blocked(v)) return
  const r = assetFit(a, limit)
  if (r === 'no') fail(v, 'EXCL_ASSET', `${who} 순자산(부채를 뺀 재산)이 ${fmt(limit)}만원 이하여야 해요. 고르신 구간은 그보다 많아요.`)
  else if (r === 'maybe') {
    v.needCheck = true
    warn(v, `순자산 기준(${fmt(limit)}만원 이하)에 걸치는 구간이에요.${a.debt && a.debt !== 'none' ? ' 빚이 있다면 그만큼 빼서 계산하니 기준 안에 들 수도 있어요.' : ''}`, '부동산·자동차·예금에서 부채를 뺀 정확한 순자산을 계산해 보세요.')
  } else if (r === 'unknown') {
    v.todo.push(`순자산이 ${fmt(limit)}만원 이하인지 확인하세요.${isDeep(a) ? '' : ' 심화 설문에서 자산 구간을 알려 주시면 더 정확해져요.'}`)
    if (strict(a) && v.status === 'ok') { v.status = 'maybe'; v.reasons.push(`자산 기준(${fmt(limit)}만원 이하)을 아직 확인하지 못해 "확인해 보면 좋아요"로 두었어요.`) }
  }
}
// 희망 보증금이 대출 한도(필요 자금 비율)보다 크면 모자란 만큼은 내 돈이 필요하다
function budgetStep(a: Answers, v: Verdict, loanMax: number, ratio: number) {
  if (!isDeep(a) || !a.wishDeposit || blocked(v)) return
  const cap = Math.round(loanMax / ratio)
  if (a.wishDeposit > cap) v.todo.push(`전세금이 약 ${fmt(cap)}만원을 넘으면 대출 한도(${fmt(loanMax)}만원)가 모자라요. 희망 ${fmt(a.wishDeposit)}만원이면 나머지는 내 돈이 필요해요.`)
}

function sejongInterest(a: Answers): Verdict {
  const r = RULES.sejongInterest
  const v = make('sejongInterest')
  if (a.age < r.ageMin || a.age > r.ageMax)
    fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 받을 수 있어요. 지금 나이로는 대상이 아니에요.`)
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  const limit = isCouple(a) ? r.incomeNewlywed : r.incomeSingle
  if (a.income > limit)
    fail(
      v,
      isCouple(a) ? 'EXCL_INCOME_COUPLE' : 'EXCL_INCOME_SINGLE',
      `${isCouple(a) ? '부부 합산' : '내'} 연소득이 ${fmt(limit)}만원 이하여야 해요. 지금 입력한 금액(${fmt(a.income)}만원)이 ${fmt(a.income - limit)}만원 많아요.`,
    )
  if (a.hasLoan) fail(v, 'EXCL_DUP_LOAN', '이미 전세대출이 있으면 받을 수 없어요. 대출을 갈아타는 것도 어려워요.')
  if (a.usedBefore) fail(v, 'EXCL_ONCE', '평생 한 번만 받을 수 있는데, 이미 받으신 적이 있어요.')
  if (a.deal === 'wolse') fail(v, 'EXCL_DEAL_TYPE', '전세 대출 이자를 도와주는 제도예요. 월세(보증금 대출 없음)는 대상이 아니에요.')
  else if (a.deal === 'banjeonse' && !blocked(v))
    warn(v, '반전세(보증금+월세)가 "전세계약"으로 인정되는지 공식 기준이 확인되지 않았어요.', '세종시 청년지원팀(☎1533-1934)에 반전세도 되는지 먼저 물어보세요.')
  if (blocked(v) === false) {
    if (a.stage === 'paid' || a.stage === 'movedin')
      fail(v, 'EXCL_TIMING', '잔금을 이미 치렀어요. 이 지원은 잔금 치르기 전에 신청해야 해서 지금은 받을 수 없어요.')
    else if (a.stage === 'contract') {
      v.todo.push('잔금을 치르기 전에 먼저 신청해 주세요. 늦으면 신청할 수 없게 돼요.')
      warn(v, '아직 잔금 전이라 신청할 수 있어요. 조금만 서둘러 주세요.')
    } else {
      warn(v, '자격은 맞아요. 계약 후 잔금 전에 신청하면 돼요.')
    }
    if (a.marital === 'planning' && v.status !== 'no')
      v.todo.push('예비부부는 혼인 예정일 증명 서류가 필요할 수 있어요. 공고문을 확인하세요.')
  }
  if (v.status === 'maybe' && v.reasons.length === 1 && a.stage === 'explore') v.status = 'ok'
  residenceTodo(a, v)
  return v
}

function sejongRent(a: Answers): Verdict {
  const r = RULES.sejongRent
  const v = make('sejongRent')
  if (a.age < r.ageMin || a.age > r.ageMax) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 받을 수 있어요.`)
  if (isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼자 사는 청년(1인 가구)만 받을 수 있어요. 신혼 월세를 도와주는 제도는 따로 없어요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (a.deal === 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '월세를 내는 사람을 위한 제도예요. 전세는 대상이 아니에요.')
  if (a.medianBand && isDeep(a)) {
    const f = medianFit(a, 150)
    if (f === 'no') fail(v, 'EXCL_INCOME_SINGLE', '기준중위소득 150%(1인 월 384만원) 이하여야 해요. 고르신 소득 구간은 그보다 높아요.')
  } else if (a.income > r.incomeYear)
    fail(v, 'EXCL_INCOME_SINGLE', `연소득이 약 ${fmt(r.incomeYear)}만원(월 384만원) 이하여야 해요.`)
  if (a.houseType === 'multi') fail(v, 'EXCL_HOUSE_TYPE', '원룸·고시원 같은 다중주택은 대상에서 빠져요.')
  if (a.deal !== 'jeonse' && a.deposit > r.maxDeposit) fail(v, 'EXCL_HOUSE_TYPE', `보증금이 ${fmt(r.maxDeposit)}만원 이하여야 해요.`)
  if (a.deal !== 'jeonse' && a.rent > r.maxRent) fail(v, 'EXCL_HOUSE_TYPE', `월세가 ${r.maxRent}만원 이하여야 해요.`)
  if (a.usedBefore) fail(v, 'EXCL_ONCE', '평생 한 번만 받을 수 있는데, 이미 받으신 적이 있어요.')
  if (v.status !== 'no') {
    if (a.stage === 'movedin') warn(v, '자격은 맞아요. 다만 1년에 사흘만 접수해요(2026년은 3월 3~5일).', '다음 접수 공고(보통 2~3월)를 알림으로 챙기세요.')
    else warn(v, '자격은 맞아요. 세종에 전입(주소 이전)한 뒤에야 신청할 수 있어요. 접수는 1년에 사흘뿐이에요.', '전입 후 다음 접수 시기를 확인하세요. 그동안은 월세 부담을 직접 져야 해요.')
  }
  assetStep(a, v, 12200)
  residenceTodo(a, v)
  return v
}

function molitRent(a: Answers): Verdict {
  const r = RULES.molitRent
  const v = make('molitRent')
  if (a.age < r.ageMin || a.age > r.ageMax) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 받을 수 있어요.`)
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (!a.livesApart) fail(v, 'EXCL_RESIDENCE', '부모님과 따로 살아야(주소 분리) 해요.')
  if (a.deal === 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '월세를 내는 사람을 위한 제도예요. 전세는 대상이 아니에요.')
  if (isCouple(a) && a.marital === 'newlywed') fail(v, 'EXCL_INCOME_COUPLE', '이 제도는 청년 개인 기준이라 부부합산 소득이 높으면 대상이 되기 어려워요.')
  else if (a.medianBand && isDeep(a)) {
    const f = medianFit(a, 60)
    if (f === 'no') fail(v, 'EXCL_INCOME_SINGLE', '소득이 낮은 청년을 위한 제도예요(청년가구 기준중위소득 60% 이하). 고르신 소득 구간은 그보다 높아요.')
    else if (f === 'maybe') v.todo.push('소득이 기준중위소득 50~100% 구간이라 60% 이하인지 복지로 모의계산으로 확인하세요.')
  } else if (a.income > r.incomeYearApprox)
    fail(v, 'EXCL_INCOME_SINGLE', `소득이 낮은 청년을 위한 제도예요(청년가구 중위소득 60% 이하, 대략 연 ${fmt(r.incomeYearApprox)}만원 이하).`)
  assetStep(a, v, 12200, '청년 본인')
  if (v.status !== 'no') {
    v.needCheck = true
    warn(v, '자격은 될 수 있어요. 부모님 가구 소득(중위소득 100% 이하)과 재산도 함께 심사해요.', '복지로에서 "청년월세지원"을 검색해 모의계산을 해보세요.')
  }
  return v
}

function youthButeemok(a: Answers): Verdict {
  const r = RULES.youthButeemok
  const v = make('youthButeemok')
  if (a.age < r.ageMin || a.age > r.ageMax) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 받을 수 있어요.`)
  if (isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼자 사는 청년용이에요. 신혼·예비부부는 아래 "신혼부부전용 버팀목"을 확인하세요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (a.deal !== 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '전세 대출이에요. 월세·반전세(월세가 있는 경우)는 대상이 아니에요.')
  if (a.income > r.income) fail(v, 'EXCL_INCOME_SINGLE', `연소득이 ${fmt(r.income)}만원 이하여야 해요.`)
  if (a.hasLoan) fail(v, 'EXCL_DUP_LOAN', '이미 전세대출이 있으면 새로 받기 어려워요.')
  if (v.status !== 'no') {
    if (a.stage === 'paid' || a.stage === 'movedin') {
      warn(v, '잔금 뒤에도 신청 기한이 있지만 이미 늦었을 수 있어요.', '기금e든든에서 신청 가능 기한을 바로 확인하세요.')
    } else {
      warn(v, '자격은 맞아요. 계약금(보증금의 5%)을 낸 뒤부터 신청해요.', '계약서에 보증금 5%를 낸 기록이 있어야 해요.')
    }
  }
  if (v.status === 'maybe' && a.stage === 'explore') v.status = 'ok'
  assetStep(a, v, 34500)
  budgetStep(a, v, r.maxLoan, r.ratio)
  return v
}

function newlywedButeemok(a: Answers): Verdict {
  const r = RULES.newlywedButeemok
  const v = make('newlywedButeemok')
  if (!isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '신혼부부(혼인 7년 이내)나 예비부부만 받을 수 있어요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (a.deal !== 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '전세 대출이에요. 월세는 대상이 아니에요.')
  if (a.income > r.income)
    fail(v, 'EXCL_INCOME_COUPLE', `부부 합산 연소득이 ${fmt(r.income)}만원 이하여야 해요. 지금 입력한 금액(${fmt(a.income)}만원)이 ${fmt(a.income - r.income)}만원 많아요.`)
  if (a.hasLoan) fail(v, 'EXCL_DUP_LOAN', '이미 전세대출이 있으면 새로 받기 어려워요.')
  if (v.status !== 'no') {
    if (a.stage === 'paid' || a.stage === 'movedin') warn(v, '잔금 뒤에도 신청 기한이 있지만 이미 늦었을 수 있어요.', '기금e든든에서 신청 가능 기한을 바로 확인하세요.')
    else warn(v, '자격은 맞아요. 계약금(보증금의 5%)을 낸 뒤부터 신청해요.', '계약서에 보증금 5%를 낸 기록이 있어야 해요.')
    if (a.marital === 'planning') v.todo.push('예비부부는 결혼 예정을 증명하는 서류(청첩장 등)가 필요해요.')
  }
  if (v.status === 'maybe' && a.stage === 'explore') v.status = 'ok'
  assetStep(a, v, 34500, '부부 합산')
  budgetStep(a, v, r.maxLoanNonCapital, r.ratio)
  return v
}

// ───────── 확장 제도 (RULES·출처는 data/policies.ts) ─────────

const ageOut = (a: Answers, min: number, max: number) => a.age < min || a.age > max
const survey = (a: Answers, k: string) => (a.survey as Record<string, unknown> | undefined)?.[k]
/** 가구원수 추정: 혼자 1, 부부 2, 자녀 있는 가구(설문 Q4=6)는 3 */
const hhSize = (a: Answers): 1 | 2 | 3 => (survey(a, 'Q4') === '6' ? 3 : isCouple(a) ? 2 : 1)
/** 부모와 함께 사는 사람은 가구원수를 알 수 없다 */
const familyKnown = (a: Answers) => a.livesApart

function generalButeemok(a: Answers): Verdict {
  const r = RULES.generalButeemok
  const v = make('generalButeemok')
  if (a.age < 19) fail(v, 'EXCL_AGE', '성년(만 19세 이상)이어야 해요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (a.deal !== 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '전세 대출이에요. 월세는 대상이 아니에요.')
  if (a.hasLoan) fail(v, 'EXCL_DUP_LOAN', '이미 전세대출이 있으면 새로 받기 어려워요.')
  const limit = isCouple(a) ? r.incomeNewlywed : r.income
  if (a.income > limit) fail(v, isCouple(a) ? 'EXCL_INCOME_COUPLE' : 'EXCL_INCOME_SINGLE', `부부 합산 연소득이 ${fmt(limit)}만원 이하여야 해요. 입력하신 ${fmt(a.income)}만원이 ${fmt(a.income - limit)}만원 많아요.`)
  if (isCouple(a) && !blocked(v)) fail(v, 'EXCL_PICK_ONE', '신혼부부는 "신혼부부전용 버팀목"이 한도와 금리가 더 좋아서 그쪽을 먼저 보세요.')
  else if (a.age <= RULES.youthButeemok.ageMax && !blocked(v)) fail(v, 'EXCL_PICK_ONE', '만 34세 이하 청년은 "청년전용 버팀목"이 금리가 더 낮아서 그쪽을 먼저 보세요.')
  if (!blocked(v)) {
    warn(v, '만 35세 이상 무주택 세대주라면 일반 버팀목으로 받을 수 있어요. 수도권 외 최대 8,000만원, 필요 자금의 70% 이내예요.', '계약금(보증금의 5%)을 낸 뒤 기금e든든·은행에서 신청하세요.')
    if (a.stage === 'paid' || a.stage === 'movedin') v.todo.push('잔금 뒤에도 신청 기한이 있지만 이미 늦었을 수 있어요. 은행에 먼저 확인하세요.')
    if (a.stage === 'explore') v.status = 'ok'
  }
  assetStep(a, v, r.asset)
  budgetStep(a, v, r.maxLoan, r.ratio)
  return v
}

function youthMonthlyLoan(a: Answers): Verdict {
  const r = RULES.youthMonthlyLoan
  const v = make('youthMonthlyLoan')
  if (ageOut(a, r.ageMin, r.ageMax)) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 받을 수 있어요.`)
  if (isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼자 사는 청년(단독세대주)용이에요. 신혼·예비부부는 신혼부부전용 상품을 보세요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (!a.livesApart) fail(v, 'EXCL_RESIDENCE', '부모님과 같은 세대면 단독세대주가 아니에요. 세대를 분리(독립)해야 해요.')
  if (a.deal === 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '월세(보증부월세)용 대출이에요. 전세는 청년전용 버팀목을 보세요.')
  if (a.income > r.income) fail(v, 'EXCL_INCOME_SINGLE', `연소득이 ${fmt(r.income)}만원 이하여야 해요. 입력하신 ${fmt(a.income)}만원이 ${fmt(a.income - r.income)}만원 많아요.`)
  if (a.houseType === 'multi') fail(v, 'EXCL_HOUSE_TYPE', '원룸·고시원 같은 다중주택은 건축물대장 용도에 따라 어려울 수 있어요.')
  if (!blocked(v)) {
    warn(v, '자격은 될 수 있어요. 전용 60㎡ 이하 주택이어야 하고, 월세금 한도·금리는 해마다 달라 은행에서 확인해야 해요.', '취급 은행에서 이번 해 한도·금리를 먼저 확인하세요.')
    v.needCheck = true
    if (a.stage === 'explore') v.status = 'ok'
  }
  assetStep(a, v, r.asset)
  return v
}

function smeYouthLoan(a: Answers): Verdict {
  const r = RULES.smeYouthLoan
  const v = make('smeYouthLoan')
  if (ageOut(a, r.ageMin, r.ageMax)) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 해당돼요.`)
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (a.deal === 'wolse') fail(v, 'EXCL_DEAL_TYPE', '전월세 보증금을 빌리는 대출이에요. 월세 위주(보증금이 작은) 계약은 보증부월세대출을 보세요.')
  if (a.employer === 'large') fail(v, 'EXCL_EMPLOYER', '중소·중견기업에 다니는 청년용이에요. 대기업 재직은 대상이 아니에요.')
  else if (a.employer === 'public' || survey(a, 'Q3') === '3') fail(v, 'EXCL_EMPLOYER', '공무원·공공기관 재직자는 대상에서 빠져요.')
  else if (a.employer === 'none') fail(v, 'EXCL_EMPLOYER', '중소·중견기업에 재직 중이어야 해요.')
  if (!blocked(v)) {
    v.needCheck = true
    warn(v, a.employer === 'sme' ? '중소·중견기업 재직이라 해당 가능성이 있어요. 다만 이 상품이 지금도 따로 있는지 확인하지 못했어요.' : '재직 회사가 중소·중견기업인지에 따라 달라요. 이 상품이 지금도 따로 있는지도 확인하지 못했어요.', '청년전용 버팀목 신청 시 중소기업 재직 우대금리가 있는지 은행에 물어보세요.')
  }
  return v
}

function youthDreamAccount(a: Answers): Verdict {
  const r = RULES.youthDreamAccount
  const v = make('youthDreamAccount')
  if (ageOut(a, r.ageMin, r.ageMax)) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 가입할 수 있어요. (병역을 마쳤다면 그 기간만큼 나이에서 빼 줘요)`)
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 가입할 수 있어요.')
  if (isCouple(a) && a.marital === 'newlywed') v.todo.push('가입 소득은 본인 소득 기준(연 5,000만원 이하)이에요. 부부합산이 아니라 내 소득으로 확인하세요.')
  else if (a.income > r.income) fail(v, 'EXCL_INCOME_SINGLE', `연소득 ${fmt(r.income)}만원 이하만 가입할 수 있어요. 입력하신 ${fmt(a.income)}만원이 더 많아요.`)
  if (!blocked(v)) {
    warn(v, `자격이 돼요. 금리는 연 2.0~${r.maxRate}%이고 최고 금리는 조건을 채워야 받아요. 전월세 지원이 아니라 나중에 집을 사려는 준비예요.`, '취급 은행 앱에서 가입하고, 무주택을 유지하세요.')
    v.status = 'ok'
  }
  return v
}

function youthDreamLoan(a: Answers): Verdict {
  const r = RULES.youthDreamLoan
  const v = make('youthDreamLoan')
  if (ageOut(a, r.ageMin, r.ageMax)) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 해당돼요.`)
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  const limit = isCouple(a) ? r.incomeNewlywed : r.incomeSingle
  if (a.income > limit) fail(v, isCouple(a) ? 'EXCL_INCOME_COUPLE' : 'EXCL_INCOME_SINGLE', `연소득이 ${fmt(limit)}만원 이하여야 해요. 입력하신 ${fmt(a.income)}만원이 ${fmt(a.income - limit)}만원 많아요.`)
  if (!blocked(v)) {
    warn(v, '집을 사는 계획이 있을 때 쓰는 대출이에요. 청약통장에 1년 이상, 1,000만원 이상 모은 뒤 청약에 당첨돼야 신청할 수 있어요.', '지금 전월세를 구한다면 먼저 "청년주택드림 청약통장"부터 가입해 두세요.')
  }
  return v
}

function newlywedSpecial(a: Answers): Verdict {
  const r = RULES.newlywedSpecial
  const v = make('newlywedSpecial')
  if (!isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼인 7년 이내 신혼부부(예비신혼 포함)만 신청할 수 있어요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 신청할 수 있어요.')
  if (!blocked(v)) {
    const lowTier = a.income <= r.incomeBase
    warn(v, lowTier
      ? `부부 합산 연소득 ${fmt(a.income)}만원이면 우선공급(도시근로자 월평균소득 ${r.priorityPct}%, 맞벌이 ${r.dualPct}%) 기준에 들 가능성이 있어요 (3인 이하 월 약 753만원, 2025년 청약홈 표).`
      : `소득이 높아 우선공급(${r.priorityPct}%)에서는 어려울 수 있어요. 맞벌이라면 ${r.dualPct}%, 일반공급은 ${r.generalPct}%(맞벌이 ${r.dualGeneralPct}%)까지 보고 추첨 공급도 있어요.`,
    '청약통장이 있어야 하고, 단지별 입주자 모집공고의 소득·자산 기준이 최종이에요.')
    v.needCheck = true
    if (a.homelessYears !== undefined) v.reasons.push(`무주택 기간 ${a.homelessYears >= 5 ? '5년 이상' : `${a.homelessYears}년 이상`} 기준으로 가점·순위가 달라질 수 있어요.`)
    if (a.marital === 'planning') v.todo.push('예비신혼부부는 입주 전까지 혼인신고를 해야 하는 단지가 많아요. 공고문을 확인하세요.')
  }
  return v
}

function lhYouthJeonse(a: Answers): Verdict {
  const r = RULES.lhYouthJeonse
  const v = make('lhYouthJeonse')
  if (ageOut(a, r.ageMin, r.ageMax)) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 신청할 수 있어요.`)
  if (isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '미혼 청년용이에요. 신혼·예비부부는 "LH 신혼부부 전세임대"를 보세요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 신청할 수 있어요.')
  if (a.deal === 'wolse') fail(v, 'EXCL_DEAL_TYPE', 'LH가 전세 계약을 맺어 주는 방식이라 월세 위주 계약은 대상이 아니에요.')
  if (a.stage !== 'explore') fail(v, 'EXCL_TIMING', '입주자로 선정된 뒤에 집을 찾아 LH가 계약하는 구조라, 이미 계약했거나 이사한 집에는 쓸 수 없어요.')
  if (!blocked(v)) {
    v.needCheck = true
    const first = a.medianBand === 1
    warn(v, first ? '소득이 아주 낮은 구간이라 1순위(수급자·차상위 등) 가능성이 있어요. 해당 증빙이 있는지 확인하세요.' : '자격은 될 수 있어요. 순위(1순위 수급자·한부모·차상위 등)와 소득·자산 기준은 LH 공고문에서 확인해야 해요.', 'LH청약플러스·마이홈의 전세임대 수시모집 공고를 확인하세요.')
  }
  return v
}

function lhNewlywedJeonse(a: Answers): Verdict {
  const r = RULES.lhNewlywedJeonse
  const v = make('lhNewlywedJeonse')
  if (!isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼인 7년 이내 신혼부부(예비 포함)만 신청할 수 있어요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 신청할 수 있어요.')
  if (a.deal === 'wolse') fail(v, 'EXCL_DEAL_TYPE', 'LH가 전세 계약을 맺어 주는 방식이라 월세 위주 계약은 대상이 아니에요.')
  if (a.stage !== 'explore') fail(v, 'EXCL_TIMING', '입주자로 선정된 뒤에 집을 찾아 LH가 계약하는 구조라, 이미 계약했거나 이사한 집에는 쓸 수 없어요.')
  if (a.income > r.income120) fail(v, 'EXCL_INCOME_COUPLE', `부부 합산 소득이 맞벌이 기준(도시근로자 120%, 연 약 ${fmt(r.income120)}만원)보다 높아요.`)
  if (!blocked(v)) {
    v.needCheck = true
    warn(v, a.income <= r.income100 ? 'Ⅱ형(소득 100% 이하)에 들 가능성이 있어요. 더 낮으면 Ⅰ형(70% 이하)도 볼 수 있어요.' : '맞벌이라면 Ⅱ형(120% 이하)에 들 수 있어요. 한 명만 벌면 100%를 넘어 어려울 수 있어요.', 'LH 전세임대포털 공고에서 이번 해 소득표와 지원 한도를 확인하세요.')
  }
  assetStep(a, v, r.asset, '부부 합산')
  return v
}

function happyYouth(a: Answers): Verdict {
  const r = RULES.happyYouth
  const v = make('happyYouth')
  const student = survey(a, 'Q3') === '1'
  if (ageOut(a, r.ageMin, r.ageMax)) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 청년 계층으로 신청할 수 있어요.`)
  if (isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼인 중이 아닌 청년용이에요. 신혼부부는 "행복주택 (신혼부부)"을 보세요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 신청할 수 있어요.')
  if (!blocked(v)) {
    if (a.livesApart && !student && a.income > r.income1p) fail(v, 'EXCL_INCOME_SINGLE', `혼자 사는 청년은 월 소득 약 458만원(연 ${fmt(r.income1p)}만원) 이하여야 해요(도시근로자 100%에 1인 가구 20%p 가산). 입력하신 ${fmt(a.income)}만원이 더 많아요.`)
    else if (!a.livesApart) v.todo.push('부모님과 같이 사는 세대원 청년은 본인 소득만 봐요. 본인 소득이 기준 이하인지 확인하세요.')
  }
  if (!blocked(v)) {
    v.needCheck = true
    warn(v, '자격은 될 수 있어요. 행복주택은 모집공고가 날 때만 신청할 수 있고 경쟁이 있어요.', '세종 공고는 마이홈 "지금 신청 가능한 공공임대"에서 확인하세요.')
    if (student) v.todo.push('대학생은 본인과 부모 소득을 합쳐서 보고, 자동차는 가지고 있으면 안 돼요.')
  }
  assetStep(a, v, student ? r.assetStudent : r.asset)
  return v
}

function happyNewlywed(a: Answers): Verdict {
  const r = RULES.happyNewlywed
  const v = make('happyNewlywed')
  if (!isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼인 7년 이내 신혼부부(또는 만 6세 이하 자녀 가구)만 신청할 수 있어요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 신청할 수 있어요.')
  if (a.income > r.incomeMax) fail(v, 'EXCL_INCOME_COUPLE', `부부 합산 소득이 맞벌이 기준(100%의 120%, 연 약 ${fmt(r.incomeMax)}만원)보다 높아요.`)
  if (!blocked(v)) {
    v.needCheck = true
    warn(v, a.income <= r.income2p ? '소득이 100% 기준(2인 가구 연 약 7,740만원) 안이에요. 자산·공고 조건이 맞으면 신청할 수 있어요.' : '맞벌이라면 120% 기준까지 볼 수 있어요. 한 명만 벌면 100%를 넘을 수 있어요.', '세종 공고는 마이홈 "지금 신청 가능한 공공임대"에서 확인하세요.')
    if (a.marital === 'planning') v.todo.push('예비신혼부부는 입주 전 혼인신고가 필요해요. 공고문을 확인하세요.')
  }
  assetStep(a, v, r.asset, '부부 합산')
  return v
}

function youthMaeip(a: Answers): Verdict {
  const r = RULES.youthMaeip
  const v = make('youthMaeip')
  if (ageOut(a, r.ageMin, r.ageMax)) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 신청할 수 있어요.`)
  if (isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼인 중이 아닌 청년용이에요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 신청할 수 있어요.')
  if (!blocked(v)) {
    v.needCheck = true
    if (a.medianBand === 1) warn(v, '소득이 아주 낮은 구간이라 1순위(수급자·차상위·한부모)에 해당할 수 있어요. 임대료는 시세의 40%예요.')
    else if (a.livesApart && a.income > r.income1p) warn(v, `본인 소득이 3순위 기준(연 약 ${fmt(r.income1p)}만원)을 넘을 수 있어요. 부모 소득까지 합친 2순위 기준(도시근로자 100%)으로 볼 수 있어요.`)
    else warn(v, '자격은 될 수 있어요. 순위(1순위 수급자 등 → 2순위 부모 합산 소득 → 3순위 본인 소득)에 따라 임대료가 시세의 40~50%예요.')
    v.todo.push('분기별(3·6·9·12월) 모집공고에 맞춰 신청하세요.')
  }
  assetStep(a, v, r.asset)
  return v
}

function nationalRental(a: Answers): Verdict {
  const r = RULES.nationalRental
  const v = make('nationalRental')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택 세대구성원)만 신청할 수 있어요.')
  if (!blocked(v)) {
    if (!familyKnown(a)) {
      v.needCheck = true
      warn(v, '부모님과 함께 산다면 세대 전원의 소득을 합쳐서 봐요. 가구원수를 알아야 정확해요.', '주민등록등본으로 세대원 수와 전체 월 소득을 확인하세요.')
    } else {
      const n = hhSize(a)
      const l70 = r.income70[n]
      const l50 = r.income50[n]
      if (a.income > l70) fail(v, 'EXCL_INCOME_COUPLE', `${n}인 가구 월 소득이 도시근로자 70% 이하(연 약 ${fmt(l70)}만원)여야 해요. 입력하신 ${fmt(a.income)}만원이 더 많아요.`)
      else {
        v.needCheck = true
        warn(v, a.income <= l50 ? `소득이 50% 기준(연 약 ${fmt(l50)}만원) 안이라 전용 50㎡ 미만 주택에서 우선 공급 대상이 될 수 있어요.` : `소득이 70% 기준(연 약 ${fmt(l70)}만원) 안이에요. 전용 50㎡ 이상 주택에 지원할 수 있어요.`, '세대원 전원의 자산·자동차 기준도 있어요. 공고문을 확인하세요.')
      }
    }
  }
  assetStep(a, v, r.asset, '세대 전원 합산')
  return v
}

function rentTaxCredit(a: Answers): Verdict {
  const r = RULES.rentTaxCredit
  const v = make('rentTaxCredit')
  const job = String(survey(a, 'Q3') ?? '')
  if (a.deal === 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '월세를 내는 사람만 받을 수 있어요. 전세는 대상이 아니에요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택 세대의 세대주 또는 세대원)만 받을 수 있어요.')
  if (job === '1' || job === '2') fail(v, 'EXCL_EMPLOYER', '월급을 받는 근로소득이 있어야 연말정산으로 돌려받아요. 지금은 소득이 없다면 취업 후 그 해 월세부터 받을 수 있어요.')
  if (a.income > r.salaryMax) fail(v, 'EXCL_INCOME_SINGLE', `총급여 ${fmt(r.salaryMax)}만원 이하여야 해요. 입력하신 소득(${fmt(a.income)}만원)이 더 높아요.`)
  if (!blocked(v)) {
    const rate = a.income <= r.salaryHigh ? r.rateHigh : r.rateLow
    const annualRent = a.rent * 12
    const back = Math.round((Math.min(annualRent, r.rentCap) * rate) / 100)
    warn(v, `자격이 될 수 있어요. 공제율은 ${rate}%이고, 월세 ${a.rent}만원이면 1년에 약 ${fmt(back)}만원을 세금에서 돌려받아요 (연 ${fmt(r.rentCap)}만원 한도).`, '임대차계약서의 주소와 주민등록 주소가 같아야 해요. 전입신고를 확인하세요.')
    if (isCouple(a)) v.todo.push('입력하신 소득은 부부 합산이에요. 공제는 월세를 낸 근로자 본인의 총급여로 판단해요.')
    if (job === '6') v.todo.push('자영업·프리랜서는 5월 종합소득세 신고 때 월세 공제를 받을 수 있는지 확인하세요.')
    if (job !== '6' && job !== '') v.status = 'ok'
  }
  return v
}

function housingBenefit(a: Answers): Verdict {
  const r = RULES.housingBenefit
  const v = make('housingBenefit')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '내 집이 아니라 빌려 사는 가구에 주는 임차급여예요.')
  if (!blocked(v)) {
    if (a.medianBand && isDeep(a)) {
      const f = medianFit(a, 48)
      if (f === 'no') fail(v, 'EXCL_INCOME_SINGLE', '소득인정액이 기준중위소득 48% 이하여야 해요(1인 월 약 123만원). 고르신 소득 구간은 그보다 높아요.')
      else v.todo.push('고르신 구간(기준중위소득 50% 이하)이 48% 기준에 걸쳐요. 복지로 모의계산으로 소득인정액을 확인하세요.')
    } else if (!familyKnown(a)) {
      v.todo.push('부모님과 같이 살면 그 가구 소득으로 봐요. 부모 가구의 소득인정액을 확인하세요.')
    } else {
      const n = hhSize(a)
      const l = r.income[n]
      if (a.income > l) fail(v, 'EXCL_INCOME_SINGLE', `${n}인 가구 소득인정액이 월 ${fmt(Math.round(l / 12))}만원(연 약 ${fmt(l)}만원) 이하여야 해요. 입력하신 소득(${fmt(a.income)}만원)이 더 많아요.`)
    }
  }
  if (!blocked(v)) {
    v.needCheck = true
    warn(v, '소득이 아주 낮은 편이라 해당할 수 있어요. 소득인정액은 소득에 재산을 월 소득으로 바꾼 값을 더해서 계산해요.', '복지로의 모의계산이나 행정복지센터에서 소득인정액을 확인하세요.')
    if (!a.livesApart || a.separateHousehold === false) v.todo.push('부모님과 따로 사는 청년이면 부모 가구와 별도로 신청(분리지급)하는 방법이 있는지 확인하세요.')
  }
  return v
}

function depositGuaranteeFee(a: Answers): Verdict {
  const v = make('depositGuaranteeFee')
  if (a.deal === 'wolse') fail(v, 'EXCL_DEAL_TYPE', '전세·반전세처럼 큰 보증금에 반환보증을 드는 경우의 지원이에요. 보증금이 작은 월세는 대상이 아니에요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 해당돼요.')
  if (!blocked(v)) {
    v.needCheck = true
    warn(v, `세종시가 반환보증 보증료를 최대 ${RULES.depositGuaranteeFee.feeCap}만원까지 지원해요(정부24 원문). 소득·보증금 세부 기준은 확인하지 못했어요.`, '반환보증에 가입한 뒤 보증료 납부 영수증을 보관하고, 세종시 청년지원팀(☎1533-1934)에 신청 방법을 물어보세요.')
    if (a.stage === 'explore') v.todo.push('계약 전에 안심전세앱(HUG)으로 이 집이 반환보증에 가입 가능한지 먼저 확인하세요.')
  }
  residenceTodo(a, v)
  return v
}

// ───────── 판정 ─────────

const FNS: Record<PolicyId, (a: Answers) => Verdict> = {
  sejongInterest, newlywedButeemok, youthButeemok, generalButeemok, youthMonthlyLoan, smeYouthLoan,
  sejongRent, molitRent, housingBenefit, rentTaxCredit,
  happyYouth, happyNewlywed, youthMaeip, lhYouthJeonse, lhNewlywedJeonse, nationalRental,
  newlywedSpecial, youthDreamAccount, youthDreamLoan, depositGuaranteeFee,
}
const TIER = Object.fromEntries(ALL_POLICIES.map((p) => [p.id, p.tier])) as Record<PolicyId, 'simple' | 'deep'>
const CHECKLIST = Object.fromEntries(ALL_POLICIES.map((p) => [p.id, p.checklist])) as Record<PolicyId, string[] | undefined>

// 안 될 때 해 볼 수 있는 일 (심화 결과에서만)
const FIX: Partial<Record<ReasonCode, string>> = {
  EXCL_INCOME_SINGLE: '소득 기준은 해마다 바뀌어요. 건강보험 납부확인서나 홈택스 소득금액증명으로 정확한 소득을 확인하고, 이직·퇴사로 소득이 달라지면 그때 다시 확인하세요.',
  EXCL_INCOME_COUPLE: '부부 합산 소득 기준이에요. 혼인신고 시점·맞벌이 여부에 따라 기준이 달라지는 제도가 있어 공고문을 확인하세요.',
  EXCL_AGE: '제도마다 나이 기준이 달라요. 나이가 맞는 비슷한 제도를 아래 목록에서 찾아보세요.',
  EXCL_OWN_HOME: '무주택 요건이에요. 본인과 세대원 이름의 주택이 없어야 해요.',
  EXCL_DEAL_TYPE: '계약 방식(전세/월세)이나 가구 형태가 맞지 않아요. 같은 목적의 다른 제도를 확인하세요.',
  EXCL_TIMING: '신청 순서가 중요한 제도예요. 다음 계약부터는 계약 전에 신청 가능 시점을 먼저 확인하세요.',
  EXCL_ASSET: '순자산은 부동산·자동차·예금에서 학자금·신용대출 같은 부채를 뺀 금액이에요. 부채 증빙을 정확히 반영하면 기준 안에 들 수도 있어요.',
  EXCL_RESIDENCE: '부모님과 세대를 분리(독립)하면 대상이 되는 제도가 많아요. 주민등록등본의 세대 구성을 확인하세요.',
  EXCL_HOUSE_TYPE: '건축물대장의 용도·면적을 확인해 다중주택이나 면적 기준에서 벗어나는 집을 피하세요.',
  EXCL_EMPLOYER: '재직 형태나 회사 규모 조건이에요. 재직증명서와 회사 규모를 확인하세요.',
  EXCL_DUP_LOAN: '이미 받은 전세대출이 있으면 새 대출은 어려워요. 대출 갈아타기가 가능한지 은행에 먼저 물어보세요.',
  EXCL_ONCE: '평생 한 번만 받는 제도라 다시 받을 수 없어요. 다른 월세 지원을 알아보세요.',
}

function evaluateAll(a: Answers): Verdict[] {
  const vs = (Object.keys(FNS) as PolicyId[]).map((id) => FNS[id](a))
  const by = Object.fromEntries(vs.map((v) => [v.id, v])) as Record<PolicyId, Verdict>

  const pick = (x: Verdict, y: Verdict, msg: string) => {
    if (x.status === 'no' || y.status === 'no') return
    for (const v of [x, y]) {
      v.status = 'maybe'
      v.codes.push('EXCL_PICK_ONE')
      v.reasons.unshift(msg)
    }
  }
  const butee = by.newlywedButeemok.status !== 'no' ? by.newlywedButeemok : by.youthButeemok
  pick(butee, by.sejongInterest, '자격은 되지만 "세종 이자지원"과 "버팀목" 중 하나만 받을 수 있어요. 아래 비교로 더 이득인 쪽을 고르세요.')
  pick(by.sejongRent, by.molitRent, '자격은 되지만 같은 기간에 "세종 임대료 지원"과 "국토부 청년월세" 중 하나만 받을 수 있어요.')

  if (isDeep(a)) {
    for (const v of vs) {
      v.need = CHECKLIST[v.id]
      if (v.status === 'no') {
        const fixes = [...new Set(v.codes.map((c) => FIX[c]).filter(Boolean) as string[])]
        if (fixes.length) v.fix = fixes
      }
    }
  }
  return vs
}

/** 이 답으로 판정하는 제도. 맛보기 설문은 심화 설문이 있어야 판정되는 제도를 뺀다(잠금) */
export function evaluate(a: Answers): Verdict[] {
  const vs = evaluateAll(a)
  return a.surveyType === 'simple' ? vs.filter((v) => TIER[v.id] === 'simple') : vs
}

/** 맛보기 설문에서 잠겨 있는 제도 중 지금 답으로 분명히 안 되는 것은 뺀 목록 (심화에서 정밀 확인) */
export function lockedPolicies(a: Answers): PolicyId[] {
  if (a.surveyType !== 'simple') return []
  return evaluateAll(a).filter((v) => TIER[v.id] === 'deep' && v.status !== 'no').map((v) => v.id)
}

// "지금 하면 안 되는 일" — 계약 단계 기반 시점 경고 (PRD M4)
export interface Warning {
  tone: 'stop' | 'todo'
  text: string
}
export function warnings(a: Answers): Warning[] {
  const w: Warning[] = []
  const wantsLoan = a.deal === 'jeonse' || a.deal === 'banjeonse'
  // 시점 경고는 해당 제도를 실제로 받을 수 있을 때만 의미가 있다 (이미 불가인데 경고하면 혼란)
  const vs = evaluate(a)
  const alive = (id: PolicyId) => vs.find((v) => v.id === id)?.status !== 'no'
  const interestAlive = alive('sejongInterest')
  const buteemokAlive = alive('youthButeemok') || alive('newlywedButeemok')
  switch (a.stage) {
    case 'explore':
      if (wantsLoan) w.push({ tone: 'todo', text: '집을 보러 다니는 중이라면 아직 괜찮아요. 계약을 하면 "잔금 치르기 전"이 신청 마감선이 돼요. 날짜를 달력에 적어 두세요.' })
      w.push({ tone: 'todo', text: '계약하기 전에 안심전세앱(HUG)에서 이 집의 보증금 반환 위험을 확인하세요. 반환보증이 안 되면 대출이 막힐 수 있어요.' })
      break
    case 'contract':
      if (interestAlive) w.push({ tone: 'stop', text: '집값의 마지막 큰 금액(잔금)은 조금만 기다려 주세요. 세종 이자지원은 잔금을 치르기 전에 신청해야 하고, 치르고 나면 신청할 수 없어요.' })
      if (buteemokAlive) w.push({ tone: 'todo', text: '버팀목은 보증금의 5%를 낸 뒤 신청할 수 있어요. 계약금 영수증을 챙기세요.' })
      break
    case 'paid':
      if (wantsLoan && (interestAlive || buteemokAlive || a.deal === 'jeonse'))
        w.push({ tone: 'stop', text: '잔금을 이미 치렀다면 세종 이자지원은 받을 수 없어요. 버팀목은 신청 기한이 남았는지 오늘 바로 확인해 보세요.' })
      w.push({ tone: 'todo', text: '전입신고와 확정일자는 오늘 하세요. 그래야 보증금을 지킬 수 있어요.' })
      break
    case 'movedin':
      w.push({ tone: 'todo', text: '전입은 끝났어요. 월세 지원(세종 임대료·국토부)은 전입 후에 신청하는 제도라 지금이 신청 시기예요.' })
      break
  }
  if (a.deal === 'wolse' || a.deal === 'banjeonse')
    w.push({ tone: 'todo', text: '세종 임대료 지원은 1년에 사흘만 접수해요(2026년은 3.3~3.5). 접수가 끝났다면 국토부 청년월세(상시)를 먼저 보세요.' })
  return w
}

// 택1 총비용 비교 (Should S1) — 예시 계산
/** 버팀목 금리를 어디에 둘지: 범위 하단 / 소득으로 추정 / 범위 상단 */
export type RateBasis = 'min' | 'est' | 'max'
export interface CostBasis { rate: RateBasis; years: number }
export const DEFAULT_BASIS: CostBasis = { rate: 'est', years: 6 }

export interface CostCompare {
  loan: number
  years: number
  buteemokRate: number
  buteemokPaid: number // 기간 동안 버팀목으로 낼 이자
  interestSelf: number
  interestPaid: number // 기간 동안 세종 이자지원을 받고도 낼 이자
  better: 'buteemok' | 'interest' | 'same'
  loanInterest: number
  loanButeemok: number
}
export function compareCost(a: Answers, bankRate: number, basis: CostBasis = DEFAULT_BASIS): CostCompare | null {
  if (a.deal !== 'jeonse') return null
  const isNew = a.marital !== 'single'
  const b = isNew ? RULES.newlywedButeemok : RULES.youthButeemok
  const maxB = isNew ? RULES.newlywedButeemok.maxLoanNonCapital : RULES.youthButeemok.maxLoan
  const loanButeemok = Math.min(a.deposit * b.ratio, maxB)
  const loanInterest = Math.min(a.deposit * RULES.sejongInterest.loanRatio, RULES.sejongInterest.maxLoan)
  // 소득으로 추정: 소득이 낮을수록 하단, 높을수록 상단으로 선형 보간
  const cap = isNew ? RULES.newlywedButeemok.income : RULES.youthButeemok.income
  const t = basis.rate === 'min' ? 0 : basis.rate === 'max' ? 1 : Math.min(1, Math.max(0, a.income / cap))
  const buteemokRate = +(b.rateMin + (b.rateMax - b.rateMin) * t).toFixed(2)
  const y = basis.years
  const buteemokPaid = Math.round(loanButeemok * (buteemokRate / 100) * y)
  const selfRate = Math.max(0, bankRate - RULES.sejongInterest.maxSupportRate)
  const interestPaid = Math.round(loanInterest * (selfRate / 100) * y)
  const better = Math.abs(buteemokPaid - interestPaid) < 10 ? 'same' : buteemokPaid < interestPaid ? 'buteemok' : 'interest'
  return { loan: loanButeemok, years: y, buteemokRate, buteemokPaid, interestSelf: +selfRate.toFixed(2), interestPaid, better, loanInterest, loanButeemok }
}

// 진입비용: 월세 몇 개월치? (Should S3)
export function entryCostMonths(costs: number, monthlyRent: number): number {
  return monthlyRent > 0 ? +(costs / monthlyRent).toFixed(1) : 0
}

export const DEFAULT_ANSWERS: Answers = {
  age: 26,
  residence: 'both',
  marital: 'single',
  income: 3000,
  livesApart: true,
  ownsHome: false,
  hasLoan: false,
  usedBefore: false,
  deal: 'wolse',
  deposit: 1000,
  rent: 50,
  houseType: 'normal',
  stage: 'explore',
}
