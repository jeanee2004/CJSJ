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

// 구간으로 받은 응답을 판정용 숫자로 바꿀 때 쓰는 대표값(만원)
const INCOME_MID = [150, 250, 350, 450, 600, 800] // Q5 월 가구소득
const COST_MID = [0, 10, 25, 35, 45, 60, 80] // Q8-2 월 주거비
const AGE_MID = [22, 27, 32, 37, 40] // Q1 연령대

/** 설문 응답 → 지원 자격 판정용 답변 */
export function deriveAnswers(s: Survey): Answers {
  const unknown = new Set<string>()
  const a: Answers = { ...DEFAULT_ANSWERS }

  const band = num(str(s, 'Q1'), 0)
  a.age = AGE_MID[band - 1] ?? DEFAULT_ANSWERS.age
  // 30~34, 35~39 는 만 34세 상한이 걸리는 구간이라 대표값으로는 가를 수 없다
  if (band === 3 || band === 4) unknown.add('age')
  a.residence = ({ '1': 'both', '2': 'liveOnly', '3': 'outside', '4': 'outside' } as Record<string, Residence>)[str(s, 'Q2') ?? '1'] ?? 'both'

  const hh = str(s, 'Q4')
  a.marital = ({ '4': 'planning', '5': 'newlywed' } as Record<string, Marital>)[hh ?? ''] ?? 'single'

  // 소득: 가구 월소득 구간의 대표값 × 12
  const inc = str(s, 'Q5')
  if (isUnk(s, 'Q5') || !inc) unknown.add('income')
  else a.income = (INCOME_MID[num(inc) - 1] ?? 0) * 12

  // 부모와 함께 살면 주소 분리가 아니다. 그 외에는 실제로 따로 사는 것으로 보고 주소는 결과에서 확인하도록 한다
  a.livesApart = hh !== '2'

  a.ownsHome = str(s, 'Q7') === '1'

  // 이미 아는 제도 (결과에서 "몰랐던 지원"을 따로 짚기 위해)
  const m = obj(s, 'Q13') ?? {}
  const known = (k: string) => m[k] !== undefined && m[k] !== '1'
  a.hasLoan = m['4'] === '4'
  a.usedBefore = m['1'] === '4' || m['2'] === '4'
  const aware = [known('1') && 'sejongRent', known('2') && 'sejongInterest', known('3') && 'molitRent', known('4') && 'buteemok'].filter(Boolean) as string[]
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
  housingCost?: number // 월 주거비(월세+관리비) 구간 대표값
  ratio?: number // 가구 월소득 대비 %
  burden?: string
  known: number
  used: number
  total: number
  topPolicy?: string
  barrier?: string
  barrierCode?: string
  channels: string[]
  wishes?: string
}

/** 결과 화면 "내 응답 요약"용 */
export function summarize(s: Survey): Summary {
  const m = obj(s, 'Q13') ?? {}
  const rows = Object.keys(m)
  const cost = str(s, 'Q8-2')
  const inc = str(s, 'Q5')
  let housingCost: number | undefined
  let ratio: number | undefined
  if (cost) {
    housingCost = COST_MID[num(cost) - 1]
    const base = inc && !isUnk(s, 'Q5') ? INCOME_MID[num(inc) - 1] : 0
    if (housingCost !== undefined && base > 0) ratio = Math.round((housingCost / base) * 100)
  }
  return {
    housingCost,
    ratio,
    burden: optText('Q9', str(s, 'Q9')),
    known: rows.filter((k) => m[k] !== '1').length,
    used: rows.filter((k) => m[k] === '4').length,
    total: 7,
    topPolicy: optText('Q17', str(s, 'Q17')),
    barrier: optText('Q14', str(s, 'Q14')),
    barrierCode: str(s, 'Q14'),
    channels: optTexts('Q12', arr(s, 'Q12')),
    wishes: str(s, 'Q21')?.trim() || undefined,
  }
}
