import { describe, expect, it } from 'vitest'
import { DEFAULT_ANSWERS, evaluate, compareCost, lockedPolicies, warnings } from './eligibility'
import { ALL_POLICIES } from '../data/policies'
import type { Answers } from './eligibility'

const run = (o: Partial<Answers>) => {
  const vs = evaluate({ ...DEFAULT_ANSWERS, ...o })
  return Object.fromEntries(vs.map((v) => [v.id, v]))
}

describe('페르소나 판정', () => {
  it('P1 청년 월세 전입예정: 임대료는 조건부(접수 3일), 이자지원·버팀목 불가', () => {
    const r = run({ age: 26, income: 3000, deal: 'wolse', deposit: 1000, rent: 50, stage: 'explore' })
    expect(r.sejongRent.status).toBe('maybe')
    expect(r.sejongInterest.status).toBe('no')
    expect(r.sejongInterest.codes).toContain('EXCL_DEAL_TYPE')
    expect(r.youthButeemok.status).toBe('no')
  })

  it('P2 기존 버팀목 보유자: 이자지원 불가(중복대출)', () => {
    const r = run({ age: 31, income: 4000, deal: 'jeonse', deposit: 12000, hasLoan: true })
    expect(r.sejongInterest.codes).toContain('EXCL_DUP_LOAN')
    expect(r.youthButeemok.status).toBe('no')
  })

  it('P4 합산 8,500만 예비부부: 이자지원·신혼 버팀목 모두 소득 초과', () => {
    const r = run({ age: 33, marital: 'planning', income: 8500, deal: 'jeonse', deposit: 20000 })
    expect(r.sejongInterest.status).toBe('no')
    expect(r.sejongInterest.codes).toContain('EXCL_INCOME_COUPLE')
    expect(r.newlywedButeemok.status).toBe('no')
  })

  it('P6 대학생 원룸(다중주택): 임대료 지원 불가', () => {
    const r = run({ age: 23, income: 0, deal: 'wolse', houseType: 'multi', livesApart: false })
    expect(r.sejongRent.codes).toContain('EXCL_HOUSE_TYPE')
    expect(r.molitRent.codes).toContain('EXCL_RESIDENCE')
  })
})

describe('세종시 조사 반영', () => {
  it('세종 거주가 아니면 세종 지원은 조건부 + 전입 안내', () => {
    const r = run({ age: 26, income: 3000, deal: 'wolse', residence: 'outside' })
    expect(r.sejongRent.status).toBe('maybe')
    expect(r.sejongRent.todo.some((t) => t.includes('전입'))).toBe(true)
  })
})

describe('규칙', () => {
  it('택1: 신혼 버팀목과 세종 이자지원이 둘 다 가능하면 조건부 + 택1 코드', () => {
    const r = run({ age: 30, marital: 'newlywed', income: 6000, deal: 'jeonse', deposit: 20000 })
    expect(r.sejongInterest.status).toBe('maybe')
    expect(r.newlywedButeemok.status).toBe('maybe')
    expect(r.sejongInterest.codes).toContain('EXCL_PICK_ONE')
  })

  it('시점: 잔금 후에는 세종 이자지원 불가', () => {
    const r = run({ age: 28, income: 3000, deal: 'jeonse', deposit: 10000, stage: 'paid' })
    expect(r.sejongInterest.codes).toContain('EXCL_TIMING')
  })

  it('이력: 생애 1회', () => {
    const r = run({ deal: 'jeonse', usedBefore: true })
    expect(r.sejongInterest.codes).toContain('EXCL_ONCE')
  })

  it('잔금 전 계약 단계에서 stop 경고', () => {
    const w = warnings({ ...DEFAULT_ANSWERS, deal: 'jeonse', stage: 'contract' })
    expect(w.some((x) => x.tone === 'stop')).toBe(true)
  })

  it('택1 총비용 비교: 월세면 null', () => {
    expect(compareCost({ ...DEFAULT_ANSWERS, deal: 'wolse' }, 4.5)).toBeNull()
    const c = compareCost({ ...DEFAULT_ANSWERS, deal: 'jeonse', deposit: 10000, income: 3000 }, 4.5)
    expect(c).not.toBeNull()
    expect(c!.loanInterest).toBe(9000)
  })

  it('택1 비교 기준: 금리 하단·상단과 기간을 고를 수 있다', () => {
    const a = { ...DEFAULT_ANSWERS, deal: 'jeonse' as const, deposit: 10000, income: 3000 }
    const lo = compareCost(a, 4.5, { rate: 'min', years: 2 })!
    const hi = compareCost(a, 4.5, { rate: 'max', years: 2 })!
    expect(lo.buteemokRate).toBe(2.0)
    expect(hi.buteemokRate).toBe(3.1)
    expect(lo.buteemokPaid).toBe(Math.round(8000 * 0.02 * 2))
    expect(compareCost(a, 4.5)!.years).toBe(6)
  })
})

describe('확장 제도 (20개)', () => {
  it('제도 정의가 20개이고 모두 출처와 검증 상태, 분류가 있다', () => {
    expect(ALL_POLICIES.length).toBe(20)
    for (const p of ALL_POLICIES) {
      expect(p.sourceIds.length).toBeGreaterThan(0)
      expect(['official', 'secondary', 'unverified']).toContain(p.verified)
      expect(['월세지원', '대출', '공공임대', '청약', '비용지원']).toContain(p.category)
    }
    expect(run({}) ).toHaveProperty('rentTaxCredit')
    expect(Object.keys(run({})).length).toBe(20)
  })

  it('월세 세액공제: 근로소득 있는 월세 청년은 가능, 전세·소득 없는 대학생·총급여 8천 초과는 불가', () => {
    expect(run({ deal: 'wolse', rent: 50, income: 3000, survey: { Q3: '4' } }).rentTaxCredit.status).toBe('ok')
    expect(run({ deal: 'jeonse' }).rentTaxCredit.codes).toContain('EXCL_DEAL_TYPE')
    expect(run({ survey: { Q3: '1' } }).rentTaxCredit.codes).toContain('EXCL_EMPLOYER')
    expect(run({ income: 8500 }).rentTaxCredit.status).toBe('no')
  })

  it('일반 버팀목은 35세 이상에게만 열리고, 청년·신혼은 전용 상품 안내로 돌린다', () => {
    expect(run({ age: 40, deal: 'jeonse', income: 3000, deposit: 8000 }).generalButeemok.status).toBe('ok')
    expect(run({ age: 28, deal: 'jeonse' }).generalButeemok.codes).toContain('EXCL_PICK_ONE')
    expect(run({ age: 40, marital: 'newlywed', deal: 'jeonse' }).generalButeemok.status).toBe('no')
  })

  it('청년전용 보증부월세대출: 부모와 같은 세대면 불가, 월세 + 별도 세대면 가능', () => {
    expect(run({ deal: 'wolse', livesApart: false }).youthMonthlyLoan.codes).toContain('EXCL_RESIDENCE')
    expect(run({ deal: 'wolse', livesApart: true, income: 3000 }).youthMonthlyLoan.status).toBe('ok')
    expect(run({ deal: 'jeonse' }).youthMonthlyLoan.codes).toContain('EXCL_DEAL_TYPE')
  })

  it('청년주택드림 청약통장은 월세·전세와 상관없이 만 34세 이하 무주택 소득 5천 이하면 가입 가능', () => {
    expect(run({ age: 27, income: 3000 }).youthDreamAccount.status).toBe('ok')
    expect(run({ age: 27, income: 6000 }).youthDreamAccount.codes).toContain('EXCL_INCOME_SINGLE')
    expect(run({ age: 37 }).youthDreamAccount.codes).toContain('EXCL_AGE')
  })

  it('LH 전세임대는 계약 후에는 불가(선정 뒤 집을 찾는 구조)', () => {
    expect(run({ deal: 'jeonse', stage: 'contract' }).lhYouthJeonse.codes).toContain('EXCL_TIMING')
    expect(run({ deal: 'jeonse', stage: 'explore' }).lhYouthJeonse.status).toBe('maybe')
    expect(run({ marital: 'newlywed', deal: 'jeonse', income: 6000 }).lhNewlywedJeonse.status).toBe('maybe')
  })

  it('행복주택: 청년은 혼자 사는 소득 상한(연 약 5,491만원), 신혼은 별도 제도', () => {
    expect(run({ income: 3000 }).happyYouth.status).toBe('maybe')
    expect(run({ income: 6000 }).happyYouth.codes).toContain('EXCL_INCOME_SINGLE')
    expect(run({ marital: 'newlywed', income: 6000 }).happyYouth.codes).toContain('EXCL_DEAL_TYPE')
    expect(run({ marital: 'newlywed', income: 6000 }).happyNewlywed.status).toBe('maybe')
  })

  it('국민임대는 가구원수별 소득 70% 상한을 넘으면 불가', () => {
    expect(run({ income: 3000 }).nationalRental.status).toBe('maybe')
    expect(run({ income: 5000 }).nationalRental.codes).toContain('EXCL_INCOME_COUPLE')
  })

  it('세종 반환보증 보증료 지원은 월세면 불가, 전세면 확인 필요 + 상한 40만원', () => {
    expect(run({ deal: 'wolse' }).depositGuaranteeFee.status).toBe('no')
    expect(run({ deal: 'jeonse', deposit: 12000 }).depositGuaranteeFee.status).toBe('maybe')
  })

  it('주거급여는 소득이 아주 낮을 때만(1인 연 약 1,477만원)', () => {
    expect(run({ income: 1000 }).housingBenefit.status).toBe('maybe')
    expect(run({ income: 3000 }).housingBenefit.status).toBe('no')
  })
})

describe('맛보기와 심화의 차등', () => {
  const base = { ...DEFAULT_ANSWERS, deal: 'jeonse' as const, deposit: 12000, age: 27, income: 3000, usedBefore: true } // 이자지원을 이미 써서 택1이 겹치지 않게
  it('맛보기는 심화 전용 제도를 빼고, 잠긴 제도 목록을 따로 준다', () => {
    const simple = evaluate({ ...base, surveyType: 'simple' })
    const deep = evaluate({ ...base, surveyType: 'deep' })
    expect(simple.length).toBeLessThan(deep.length)
    expect(simple.some((v) => v.id === 'housingBenefit')).toBe(false)
    expect(deep.some((v) => v.id === 'housingBenefit')).toBe(true)
    const locked = lockedPolicies({ ...base, surveyType: 'simple' })
    expect(locked.length).toBeGreaterThan(0)
    expect(locked).not.toContain('newlywedSpecial') // 미혼이라 분명히 안 되는 제도는 미리보기에서 뺀다
    expect(lockedPolicies({ ...base, surveyType: 'deep' })).toEqual([])
  })

  it('맛보기는 자산을 모르면 "신청할 수 있어요"로 단정하지 않는다. 심화에서 자산이 기준 안이면 신청 가능', () => {
    const s = evaluate({ ...base, surveyType: 'simple' }).find((v) => v.id === 'youthButeemok')!
    expect(s.status).toBe('maybe')
    expect(s.reasons.join(' ')).toContain('자산')
    const d = evaluate({ ...base, surveyType: 'deep', assetBand: 1 }).find((v) => v.id === 'youthButeemok')!
    expect(d.status).toBe('ok')
  })

  it('심화에서 순자산이 기준을 넘으면 불가(EXCL_ASSET), 맛보기에선 알 수 없다', () => {
    const d = evaluate({ ...base, surveyType: 'deep', assetBand: 4 }).find((v) => v.id === 'youthButeemok')!
    expect(d.status).toBe('no')
    expect(d.codes).toContain('EXCL_ASSET')
    expect(d.fix?.length).toBeGreaterThan(0) // 심화는 "어떻게 해 볼 수 있는지"까지 보여 준다
  })

  it('소득 분위(D1)로 세종 임대료 지원과 청년월세를 가린다', () => {
    const w = { ...DEFAULT_ANSWERS, surveyType: 'deep' as const, deal: 'wolse' as const, income: 3000 }
    expect(evaluate({ ...w, medianBand: 4 }).find((v) => v.id === 'sejongRent')!.status).toBe('no')
    expect(evaluate({ ...w, medianBand: 3, assetBand: 1 }).find((v) => v.id === 'sejongRent')!.status).toBe('maybe')
    expect(evaluate({ ...w, medianBand: 3 }).find((v) => v.id === 'molitRent')!.status).toBe('no')
  })

  it('심화 결과에는 준비 서류가 붙고, 맛보기에는 붙지 않는다', () => {
    expect(evaluate({ ...base, surveyType: 'deep' }).find((v) => v.id === 'youthButeemok')!.need?.length).toBeGreaterThan(0)
    expect(evaluate({ ...base, surveyType: 'simple' }).find((v) => v.id === 'youthButeemok')!.need).toBeUndefined()
  })

  it('중소기업 취업 청년 대출은 대기업·공공 재직이면 불가', () => {
    const j = { ...base, surveyType: 'deep' as const }
    expect(evaluate({ ...j, employer: 'large' }).find((v) => v.id === 'smeYouthLoan')!.codes).toContain('EXCL_EMPLOYER')
    expect(evaluate({ ...j, employer: 'sme' }).find((v) => v.id === 'smeYouthLoan')!.status).toBe('maybe')
  })

  it('희망 보증금이 대출 한도로 모자라면 내 돈이 필요하다고 알린다', () => {
    const d = evaluate({ ...base, surveyType: 'deep', assetBand: 1, wishDeposit: 30000 }).find((v) => v.id === 'youthButeemok')!
    expect(d.todo.join(' ')).toContain('내 돈')
  })
})
