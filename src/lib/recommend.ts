// 진단 카드(직접 정리한 5개 제도)와 공공 API 제도를 한 줄로 세워 "먼저 할 일"을 고른다.
// 모두 브라우저에서만 계산하고 설문 답은 서버로 보내지 않는다. 설계: docs/recommendation-design.md
import { POLICIES, RULES } from '../data/policies'
import type { PolicyId } from '../data/policies'
import type { Benefit } from './api'
import { ymdLabel } from './api'
import { compareCost } from './eligibility'
import type { Answers, CostBasis, Verdict } from './eligibility'
import { coveredByVerdicts, phaseOf, policyOf, scheduleFor } from './live'
import type { Phase } from './live'

const SRC = { youthcenter: '온통청년', gov24: '정부24', bokjiro: '복지로' } as const
const ageText = (r: { min: number; max: number }) => (r.max >= 120 ? `만 ${r.min}세 이상` : `만 ${r.min}~${r.max}세`)

/* ───────── API 제도 판정 ───────── */

export interface Match { benefit: Benefit; status: 'maybe' | 'no'; reasons: string[] }

/** 나이(출처 중 온통청년 먼저)와 무주택만 본다. 소득·재산은 원문으로만 있어 "확인"으로 남긴다 */
export function matchBenefit(b: Benefit, a: Answers): Match {
  const age = b.ages?.[0]
  if (age && (a.age < age.min || a.age > age.max)) return { benefit: b, status: 'no', reasons: [`${ageText(age)} 대상이에요 (${SRC[age.source]} 기준).`] }
  if (a.ownsHome && /무주택/.test(`${b.name} ${b.summary} ${b.conditions ?? ''}`)) return { benefit: b, status: 'no', reasons: ['무주택자 대상이에요.'] }
  const reasons = [b.conditions ? `소득·재산 등 조건은 안내 페이지에서 확인하세요: ${b.conditions}` : '자세한 조건은 안내 페이지에서 확인하세요.']
  const other = b.ages?.find((x) => x.min !== age!.min || x.max !== age!.max)
  if (age && other) reasons.push(`출처마다 나이 기준이 달라요 (${SRC[age.source]} ${ageText(age)}, ${SRC[other.source]} ${ageText(other)}).`)
  return { benefit: b, status: 'maybe', reasons }
}

/* ───────── 진단 카드: 공공 API 나이와 어긋나면 "확인 필요" ───────── */

const RULE_AGE: Partial<Record<PolicyId, { ageMin: number; ageMax: number }>> = {
  sejongInterest: RULES.sejongInterest, sejongRent: RULES.sejongRent, molitRent: RULES.molitRent, youthButeemok: RULES.youthButeemok,
}

/** 판정은 우리 기준(RULES)대로 두고, 다른 출처 나이로는 결과가 달라지는 사람에게만 확인 필요를 붙인다 */
export function flagAgeConflicts(vs: Verdict[], items: Benefit[], a: Answers): Verdict[] {
  return vs.map((v) => {
    const rule = RULE_AGE[v.id]
    if (!rule) return v
    const inRule = a.age >= rule.ageMin && a.age <= rule.ageMax
    const other = items.filter((b) => policyOf(b.name) === v.id).flatMap((b) => b.ages ?? [])
      .find((r) => (r.min !== rule.ageMin || r.max !== rule.ageMax) && (a.age >= r.min && a.age <= r.max) !== inRule)
    if (!other) return v
    const msg = `${SRC[other.source]}에는 ${ageText(other)}로 올라 있어요. 여기서는 공고 원문 기준(${ageText({ min: rule.ageMin, max: rule.ageMax })})으로 판정했으니 신청 전에 원문을 확인하세요.`
    return { ...v, needCheck: true, reasons: [...v.reasons, msg] }
  })
}

/* ───────── 순위 ───────── */

export type Kind = 'loan' | 'rent' | 'other'
export interface Rec {
  key: string
  name: string
  status: 'ok' | 'maybe'
  phase: Phase
  kind: Kind
  /** 비교 기간 동안 받거나 아끼는 돈(만원). 모르면 undefined */
  amount?: number
  why: string[]
  url: string
  /** API 제도에 나이 기준이 있었는지 */
  ages?: boolean
  from: 'verdict' | 'api'
}

const KIND: Record<PolicyId, Kind> = { sejongInterest: 'loan', youthButeemok: 'loan', newlywedButeemok: 'loan', sejongRent: 'rent', molitRent: 'rent' }
const kindOf = (name: string): Kind => (/보증료|보증금|이자|대출|전세/.test(name) ? 'loan' : /월세|임대료/.test(name) ? 'rent' : 'other')

/** 비교 기간(basis.years) 동안 받거나 아끼는 돈. 대출은 은행 금리(bank)로 빌렸을 때보다 덜 내는 이자 */
export function amountOf(id: PolicyId, a: Answers, bank: number, basis: CostBasis): number | undefined {
  const months = basis.years * 12
  if (id === 'sejongRent') return RULES.sejongRent.monthlySupport * Math.min(RULES.sejongRent.months, months)
  if (id === 'molitRent') return RULES.molitRent.monthlySupport * Math.min(RULES.molitRent.months, months)
  const c = compareCost(a, bank, basis)
  if (!c) return undefined
  if (id === 'sejongInterest') return Math.round(c.loanInterest * (Math.min(bank, RULES.sejongInterest.maxSupportRate) / 100) * basis.years)
  return Math.round(c.loanButeemok * (Math.max(0, bank - c.buteemokRate) / 100) * basis.years)
}

const PHASE_ORDER: Record<Phase, number> = { open: 0, upcoming: 1, always: 2, unknown: 3, closed: 4 }
const stageFit = (k: Kind, a: Answers) =>
  (a.stage === 'explore' || a.stage === 'contract') ? k === 'loan' : (a.stage === 'paid' || a.stage === 'movedin') ? k === 'rent' : false

function phaseWhy(phase: Phase, s: { begin?: string } | null): string | undefined {
  if (phase === 'open') return '지금 접수 중이에요.'
  if (phase === 'upcoming') return s?.begin ? `${ymdLabel(s.begin)}에 접수가 시작돼요.` : '곧 접수가 시작돼요.'
  if (phase === 'always') return '언제든 신청할 수 있어요.'
  if (phase === 'closed') return '올해 접수는 끝났어요. 다음 공고를 기다려야 해요.'
}

/** 둘 중 하나만 받을 수 있는 짝에서 순위에 올리지 않을 쪽 */
function pickOneLosers(vs: Verdict[], a: Answers, bank: number, basis: CostBasis): Set<PolicyId> {
  const out = new Set<PolicyId>()
  const by = Object.fromEntries(vs.map((v) => [v.id, v])) as Record<PolicyId, Verdict>
  const both = (x: PolicyId, y: PolicyId) => by[x]?.codes.includes('EXCL_PICK_ONE') && by[y]?.codes.includes('EXCL_PICK_ONE')
  const butee: PolicyId = by.newlywedButeemok?.status !== 'no' ? 'newlywedButeemok' : 'youthButeemok'
  if (both(butee, 'sejongInterest')) {
    // 결과 화면의 이자 비교와 같은 기준: 기간 동안 내가 낼 이자가 적은 쪽
    const c = compareCost(a, bank, basis)
    if (c?.better === 'buteemok') out.add('sejongInterest')
    else if (c?.better === 'interest') out.add(butee)
  }
  if (both('sejongRent', 'molitRent')) {
    const r = amountOf('sejongRent', a, bank, basis) ?? 0
    const m = amountOf('molitRent', a, bank, basis) ?? 0
    if (r !== m) out.add(r > m ? 'molitRent' : 'sejongRent')
  }
  return out
}

export interface RankInput { verdicts: Verdict[]; items: Benefit[] | null; answers: Answers; today: string; bank: number; basis: CostBasis }

/** 정렬 키: 상태 → 지금 할 수 있나 → 계약 단계와 맞나 → 금액 → 진단 카드 먼저 */
export function rank({ verdicts, items, answers: a, today, bank, basis }: RankInput): Rec[] {
  const losers = pickOneLosers(verdicts, a, bank, basis)
  const recs: Rec[] = []
  for (const v of verdicts) {
    if (v.status === 'no' || losers.has(v.id)) continue
    const p = POLICIES.find((x) => x.id === v.id)!
    const s = items ? scheduleFor(v.id, items) : null
    // 버팀목은 은행 상품이라 상시 신청
    const phase: Phase = s ? phaseOf(s, today) : KIND[v.id] === 'loan' && v.id !== 'sejongInterest' ? 'always' : 'unknown'
    const amount = amountOf(v.id, a, bank, basis)
    recs.push({ key: v.id, name: p.name, status: v.status, phase, kind: KIND[v.id], amount, why: [], url: p.apply.url, from: 'verdict' })
  }
  for (const b of items ?? []) {
    if (coveredByVerdicts(b) || matchBenefit(b, a).status === 'no') continue
    const phase = phaseOf({ begin: b.begin, end: b.end, deadline: b.deadline, source: b.source }, today)
    recs.push({ key: `${b.source}-${b.id}`, name: b.name, status: 'maybe', phase, kind: kindOf(b.name), why: [], url: b.url, from: 'api', ages: !!b.ages?.length })
  }

  const k = (r: Rec) => [r.status === 'ok' ? 0 : 1, PHASE_ORDER[r.phase], stageFit(r.kind, a) ? 0 : 1, -(r.amount ?? -1), r.from === 'verdict' ? 0 : 1]
  recs.sort((x, y) => {
    const kx = k(x), ky = k(y)
    for (let i = 0; i < kx.length; i++) if (kx[i] !== ky[i]) return kx[i] - ky[i]
    return 0
  })

  for (const r of recs) {
    const s = r.from === 'verdict' && items ? scheduleFor(r.key as PolicyId, items) : null
    const w = phaseWhy(r.phase, s)
    if (w) r.why.push(w)
    if (stageFit(r.kind, a) && r.phase !== 'closed') r.why.push(r.kind === 'loan' ? '계약 전에 어떤 대출·지원을 쓸지 정해야 해요.' : '이사했다면 바로 신청할 수 있는 지원이에요.')
    if (r.amount) r.why.push(`${basis.years}년 기준 약 ${r.amount.toLocaleString('ko-KR')}만원을 ${r.kind === 'loan' ? '아껴요' : '받아요'}.`)
    if (losers.size && r.from === 'verdict' && verdicts.find((v) => v.id === r.key)?.codes.includes('EXCL_PICK_ONE')) r.why.push('함께 받을 수 없는 제도보다 이쪽이 더 이득이에요.')
    if (r.from === 'api') r.why.push(r.ages ? '공공 API 정보로 나이만 확인했어요. 소득 조건은 안내 페이지에서 확인하세요.' : '공공 API에 나이·소득 기준이 없어요. 조건은 안내 페이지에서 확인하세요.')
  }
  return recs
}
