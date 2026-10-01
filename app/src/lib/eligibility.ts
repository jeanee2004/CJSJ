import { RULES } from '../data/policies'
import type { PolicyId } from '../data/policies'

export type Marital = 'single' | 'newlywed' | 'planning'
export type Deal = 'jeonse' | 'banjeonse' | 'wolse'
export type Stage = 'explore' | 'contract' | 'paid' | 'movedin'
export type HouseType = 'normal' | 'multi'

export interface Answers {
  age: number
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
}

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

export interface Verdict {
  id: PolicyId
  status: Status
  reasons: string[]
  codes: ReasonCode[]
  todo: string[]
  needCheck?: boolean // 확인 필요 항목이 판정에 영향
}

const isCouple = (a: Answers) => a.marital !== 'single'
const isJeonseLike = (a: Answers) => a.deal === 'jeonse'

function make(id: PolicyId): Verdict {
  return { id, status: 'ok', reasons: [], codes: [], todo: [] }
}
function fail(v: Verdict, code: ReasonCode, reason: string) {
  v.status = 'no'
  v.codes.push(code)
  v.reasons.push(reason)
}
function warn(v: Verdict, reason: string, todo?: string) {
  if (v.status === 'ok') v.status = 'maybe'
  v.reasons.push(reason)
  if (todo) v.todo.push(todo)
}
const fmt = (n: number) => n.toLocaleString('ko-KR')

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
  if (a.hasLoan) fail(v, 'EXCL_DUP_LOAN', '이미 전세대출이 있으면 받을 수 없어요. 대출을 갈아타는 것도 안 돼요.')
  if (a.usedBefore) fail(v, 'EXCL_ONCE', '평생 한 번만 받을 수 있는데, 이미 받은 적이 있어요.')
  if (a.deal === 'wolse') fail(v, 'EXCL_DEAL_TYPE', '전세 대출 이자를 도와주는 제도예요. 월세(보증금 대출 없음)는 대상이 아니에요.')
  else if (a.deal === 'banjeonse' && v.status !== 'no')
    warn(v, '반전세(보증금+월세)가 "전세계약"으로 인정되는지 공식 기준이 확인되지 않았어요.', '세종시 청년지원팀(☎1533-1934)에 반전세도 되는지 먼저 물어보세요.')
  if (v.status !== 'no') {
    if (a.stage === 'paid' || a.stage === 'movedin')
      fail(v, 'EXCL_TIMING', '잔금을 이미 치렀어요. 이 지원은 잔금 치르기 전에 신청해야 해서 지금은 받을 수 없어요.')
    else if (a.stage === 'contract') {
      v.todo.push('잔금 치르기 전에 먼저 신청하세요. 신청이 늦으면 탈락해요.')
      warn(v, '아직 잔금 전이라 신청할 수 있어요. 단, 서두르세요.')
    } else {
      warn(v, '자격은 맞아요. 계약 후 잔금 전에 신청하면 돼요.')
    }
    if (a.marital === 'planning' && v.status !== 'no')
      v.todo.push('예비부부는 혼인 예정일 증명 서류가 필요할 수 있어요. 공고문을 확인하세요.')
  }
  if (v.status === 'maybe' && v.reasons.length === 1 && a.stage === 'explore') v.status = 'ok'
  return v
}

function sejongRent(a: Answers): Verdict {
  const r = RULES.sejongRent
  const v = make('sejongRent')
  if (a.age < r.ageMin || a.age > r.ageMax) fail(v, 'EXCL_AGE', `만 ${r.ageMin}~${r.ageMax}세만 받을 수 있어요.`)
  if (isCouple(a)) fail(v, 'EXCL_DEAL_TYPE', '혼자 사는 청년(1인 가구)만 받을 수 있어요. 신혼 월세를 도와주는 제도는 따로 없어요.')
  if (a.ownsHome) fail(v, 'EXCL_OWN_HOME', '집이 없는 사람(무주택)만 받을 수 있어요.')
  if (a.deal === 'jeonse') fail(v, 'EXCL_DEAL_TYPE', '월세를 내는 사람을 위한 제도예요. 전세는 대상이 아니에요.')
  if (a.income > r.incomeYear)
    fail(v, 'EXCL_INCOME_SINGLE', `연소득이 약 ${fmt(r.incomeYear)}만원(월 384만원) 이하여야 해요.`)
  if (a.houseType === 'multi') fail(v, 'EXCL_HOUSE_TYPE', '원룸·고시원 같은 다중주택은 대상에서 빠져요.')
  if (a.deal !== 'jeonse' && a.deposit > r.maxDeposit) fail(v, 'EXCL_HOUSE_TYPE', `보증금이 ${fmt(r.maxDeposit)}만원 이하여야 해요.`)
  if (a.deal !== 'jeonse' && a.rent > r.maxRent) fail(v, 'EXCL_HOUSE_TYPE', `월세가 ${r.maxRent}만원 이하여야 해요.`)
  if (a.usedBefore) fail(v, 'EXCL_ONCE', '평생 한 번만 받을 수 있는데, 이미 받은 적이 있어요.')
  if (v.status !== 'no') {
    if (a.stage === 'movedin') warn(v, '자격은 맞아요. 다만 1년에 사흘만 접수해요(2026년은 3월 3~5일).', '다음 접수 공고(보통 2~3월)를 알림으로 챙기세요.')
    else warn(v, '자격은 맞아요. 세종에 전입(주소 이전)한 뒤에야 신청할 수 있어요. 접수는 1년에 사흘뿐이에요.', '전입 후 다음 접수 시기를 확인하세요. 그동안은 월세 부담을 직접 져야 해요.')
  }
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
  else if (a.income > r.incomeYearApprox)
    fail(v, 'EXCL_INCOME_SINGLE', `소득이 낮은 청년을 위한 제도예요(청년가구 중위소득 60% 이하, 대략 연 ${fmt(r.incomeYearApprox)}만원 이하).`)
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
  return v
}

export function evaluate(a: Answers): Verdict[] {
  const vs = [sejongInterest(a), newlywedButeemok(a), youthButeemok(a), sejongRent(a), molitRent(a)]
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
  return vs
}

// "지금 하면 안 되는 일" — 계약 단계 기반 시점 경고 (PRD M4)
export interface Warning {
  tone: 'stop' | 'todo'
  text: string
}
export function warnings(a: Answers): Warning[] {
  const w: Warning[] = []
  const wantsLoan = a.deal === 'jeonse' || a.deal === 'banjeonse'
  switch (a.stage) {
    case 'explore':
      if (wantsLoan) w.push({ tone: 'todo', text: '집을 보러 다니는 중이라면 아직 괜찮아요. 계약을 하면 "잔금 치르기 전"이 신청 마감선이 돼요. 날짜를 달력에 적어두세요.' })
      w.push({ tone: 'todo', text: '계약하기 전에 안심전세앱(HUG)에서 이 집의 보증금 반환 위험을 확인하세요. 반환보증이 안 되면 대출이 막힐 수 있어요.' })
      break
    case 'contract':
      if (wantsLoan) w.push({ tone: 'stop', text: '지금 잔금을 먼저 치르지 마세요. 세종 이자지원은 잔금 전에 신청해야 해요. 치르면 탈락해요.' })
      w.push({ tone: 'todo', text: '버팀목은 보증금의 5%를 낸 뒤 신청할 수 있어요. 계약금 영수증을 챙기세요.' })
      break
    case 'paid':
      if (wantsLoan) w.push({ tone: 'stop', text: '잔금을 이미 치렀다면 세종 이자지원은 받을 수 없어요. 버팀목은 신청 기한이 남았는지 오늘 바로 확인하세요.' })
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
export interface CostCompare {
  loan: number
  buteemokRate: number
  buteemok6y: number
  interestSelf: number
  interest6y: number
  better: 'buteemok' | 'interest' | 'same'
  loanInterest: number
  loanButeemok: number
}
export function compareCost(a: Answers, bankRate: number): CostCompare | null {
  if (a.deal !== 'jeonse') return null
  const isNew = a.marital !== 'single'
  const b = isNew ? RULES.newlywedButeemok : RULES.youthButeemok
  const maxB = isNew ? RULES.newlywedButeemok.maxLoanNonCapital : RULES.youthButeemok.maxLoan
  const loanButeemok = Math.min(a.deposit * b.ratio, maxB)
  const loanInterest = Math.min(a.deposit * RULES.sejongInterest.loanRatio, RULES.sejongInterest.maxLoan)
  // 소득 구간별 금리를 단순화: 소득이 낮을수록 하단, 높을수록 상단으로 선형 보간
  const cap = isNew ? RULES.newlywedButeemok.income : RULES.youthButeemok.income
  const t = Math.min(1, Math.max(0, a.income / cap))
  const buteemokRate = +(b.rateMin + (b.rateMax - b.rateMin) * t).toFixed(2)
  const buteemok6y = Math.round(loanButeemok * (buteemokRate / 100) * 6)
  const selfRate = Math.max(0, bankRate - RULES.sejongInterest.maxSupportRate)
  const interest6y = Math.round(loanInterest * (selfRate / 100) * 6)
  const better = Math.abs(buteemok6y - interest6y) < 10 ? 'same' : buteemok6y < interest6y ? 'buteemok' : 'interest'
  return { loan: loanButeemok, buteemokRate, buteemok6y, interestSelf: +selfRate.toFixed(2), interest6y, better, loanInterest, loanButeemok }
}

// 진입비용: 월세 몇 개월치? (Should S3)
export function entryCostMonths(costs: number, monthlyRent: number): number {
  return monthlyRent > 0 ? +(costs / monthlyRent).toFixed(1) : 0
}

export const DEFAULT_ANSWERS: Answers = {
  age: 26,
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
