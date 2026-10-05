import { DEFAULT_ANSWERS } from './eligibility'
import type { Answers, Deal, HouseType, Marital, Residence, Stage } from './eligibility'
import { QUESTIONS } from '../data/survey'
import type { Q, Survey } from '../data/survey'

const UNK = 'unk'
const str = (s: Survey, id: string) => (typeof s[id] === 'string' ? (s[id] as string) : undefined)
const obj = (s: Survey, id: string) => {
  const v = s[id]
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string | number>) : undefined
}
const arr = (s: Survey, id: string) => (Array.isArray(s[id]) ? (s[id] as string[]) : [])
const num = (v: string | number | undefined, d = 0) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v))

export const isUnk = (s: Survey, id: string) => s[id] === UNK || (Array.isArray(s[id]) && (s[id] as string[]).includes(UNK))

/** 화면에 보이는 문항(조건부 문항 제외) */
export const visibleQuestions = (s: Survey): Q[] => QUESTIONS.filter((q) => !q.show || q.show(s))

/** 조사 응답 → 지원 자격 판정용 답변 */
export function deriveAnswers(s: Survey): Answers {
  const unknown = new Set<string>()
  const a: Answers = { ...DEFAULT_ANSWERS }

  a.age = num(str(s, 'Q1'), DEFAULT_ANSWERS.age)
  a.residence = ({ '1': 'both', '2': 'regOnly', '3': 'liveOnly', '4': 'outside' } as Record<string, Residence>)[str(s, 'S2') ?? '1'] ?? 'both'
  a.marital = ({ '1': 'single', '2': 'newlywed', '3': 'planning', '4': 'single' } as Record<string, Marital>)[str(s, 'Q7') ?? '1'] ?? 'single'

  // 소득: 월 소득 × 12 (부부는 가구 합산)
  const inc = obj(s, 'Q9')
  if (isUnk(s, 'Q9') || !inc) {
    unknown.add('income')
  } else {
    const monthly = a.marital === 'single' ? num(inc.self) : Math.max(num(inc.house), num(inc.self))
    a.income = Math.round(monthly * 12)
  }

  // 부모와 주민등록 분리: 같이 산다고 답했거나 독립 여부를 모르면 확인 필요
  const home = str(s, 'Q3-1')
  const indep = str(s, 'Q32')
  if (home === '2' || home === '3') a.livesApart = false
  else if (indep === UNK) { a.livesApart = true; unknown.add('livesApart') }
  else a.livesApart = indep === '1'
  if (a.marital !== 'single') a.livesApart = true

  const own = str(s, 'Q18')
  a.ownsHome = own === '1'
  if (own === UNK) unknown.add('ownsHome')

  const fund = str(s, 'Q21')
  a.hasLoan = fund === '3' || arr(s, 'Q35-1').includes('5')
  if (fund === UNK && !a.hasLoan) unknown.add('hasLoan')

  const m = obj(s, 'Q34') ?? {}
  a.usedBefore = m['1'] === '3' || m['2'] === '3' || arr(s, 'Q35-1').some((x) => x === '1' || x === '2')

  // 이미 아는 제도 (결과에서 "몰랐던 지원"을 따로 짚기 위해)
  const known = (k: string) => m[k] === '1' || m[k] === '3'
  const aware = [known('1') && 'sejongRent', known('2') && 'sejongInterest', known('9') && 'molitRent', known('7') && 'buteemok'].filter(Boolean) as string[]
  a.aware = aware.length ? aware : ['none']

  // 새로 구하는 집
  const deal = str(s, 'N1')
  if (deal === UNK || !deal) { a.deal = 'wolse'; unknown.add('deal') } else a.deal = deal as Deal
  const money = obj(s, 'N2')
  if (isUnk(s, 'N2') || !money) {
    unknown.add('money')
    if (a.deal === 'jeonse') { a.deposit = 12000; a.rent = 0 } else { a.deposit = 1000; a.rent = 50 }
  } else {
    a.deposit = num(money.deposit, 1000)
    a.rent = a.deal === 'jeonse' ? 0 : num(money.rent, 50)
  }
  const ht = str(s, 'N3')
  if (ht === UNK || !ht) { a.houseType = 'normal'; unknown.add('houseType') } else a.houseType = ht as HouseType
  a.stage = (str(s, 'N4') as Stage | undefined) ?? 'explore'

  a.unknown = [...unknown]
  a.survey = s
  return a
}

const optText = (id: string, v: string | undefined): string | undefined => {
  if (!v) return undefined
  if (v === UNK) return '잘 모르겠어요'
  return QUESTIONS.find((q) => q.id === id)?.opts?.find((o) => o.v === v)?.t
}
export const optTexts = (id: string, vs: string[]): string[] => vs.map((v) => optText(id, v)).filter(Boolean) as string[]

export interface Summary {
  housingCost?: number // 월 주거비 합계(월세+관리비+대출상환)
  ratio?: number // 가구 월소득 대비 %
  burden?: string
  known: number
  used: number
  total: number
  topPolicy?: string
  barrier?: string
  barrierCode?: string
  channels: string[]
  paths: string[]
  wishes?: string
}

/** 결과 화면 "내 응답 요약"용 */
export function summarize(s: Survey): Summary {
  const m = obj(s, 'Q34') ?? {}
  const rows = Object.keys(m)
  const cost = obj(s, 'Q22')
  const inc = obj(s, 'Q9')
  let housingCost: number | undefined
  let ratio: number | undefined
  if (cost && !isUnk(s, 'Q22')) {
    housingCost = num(cost.rent) + num(cost.fee) + num(cost.loan)
    const base = inc && !isUnk(s, 'Q9') ? Math.max(num(inc.house), num(inc.self)) : 0
    if (base > 0) ratio = Math.round((housingCost / base) * 100)
  }
  return {
    housingCost,
    ratio,
    burden: optText('Q23', str(s, 'Q23')),
    known: rows.filter((k) => m[k] === '1' || m[k] === '3').length,
    used: rows.filter((k) => m[k] === '3').length,
    total: 10,
    topPolicy: optText('Q37', str(s, 'Q37')),
    barrier: optText('Q36', str(s, 'Q36')),
    barrierCode: str(s, 'Q36'),
    channels: optTexts('Q45-3', arr(s, 'Q45-3')),
    paths: optTexts('Q45-2', arr(s, 'Q45-2')),
    wishes: str(s, 'Q46-1')?.trim() || undefined,
  }
}
