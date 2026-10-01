import { describe, expect, it } from 'vitest'
import { DEFAULT_ANSWERS, evaluate, compareCost, warnings } from './eligibility'
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
})
