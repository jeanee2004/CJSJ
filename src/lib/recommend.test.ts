import { describe, expect, it } from 'vitest'
import { DEFAULT_ANSWERS, DEFAULT_BASIS, evaluate } from './eligibility'
import type { Answers } from './eligibility'
import type { Benefit } from './api'
import { amountOf, flagAgeConflicts, matchBenefit, rank } from './recommend'

const B = (x: Partial<Benefit>): Benefit => ({ source: 'gov24', id: '1', name: '', summary: '', org: '', apply: '', url: '', ...x })
const A = (x: Partial<Answers>): Answers => ({ ...DEFAULT_ANSWERS, ...x })
// 2026-10-29 /api/benefits 응답 모양 (나이는 온통청년 필드·정부24 지원조건)
const ITEMS: Benefit[] = [
  B({ source: 'youthcenter', id: 'y1', name: '청년월세 지원', begin: '20260302', end: '20260530', ages: [{ min: 19, max: 39, source: 'youthcenter' }, { min: 19, max: 34, source: 'gov24' }] }),
  B({ source: 'youthcenter', id: 'y2', name: '세종형 청년 주거 임대료 지원（월세지원）', begin: '20260601', end: '20260630', ages: [{ min: 19, max: 39, source: 'youthcenter' }] }),
  B({ source: 'gov24', id: 'g1', name: '세종 전세보증금반환보증 보증료 지원', deadline: '상시신청', ages: [{ min: 19, max: 120, source: 'gov24' }], conditions: '임차보증금 3억원 이하 무주택 임차인' }),
  B({ source: 'youthcenter', id: 'y3', name: '기초청년 주거급여(임차급여)', ages: [{ min: 19, max: 30, source: 'youthcenter' }] }),
]
const T = '20261029'

describe('API 제도 판정', () => {
  it('나이 밖이면 no, 아니면 maybe(소득은 원문 확인)', () => {
    expect(matchBenefit(ITEMS[3], A({ age: 32 })).status).toBe('no')
    const m = matchBenefit(ITEMS[2], A({ age: 32 }))
    expect(m.status).toBe('maybe')
    expect(m.reasons[0]).toContain('임차보증금 3억원 이하')
  })
  it('무주택 조건인데 집이 있으면 no', () => {
    expect(matchBenefit(ITEMS[2], A({ ownsHome: true })).status).toBe('no')
  })
  it('나이 기준이 없으면 걸러내지 않는다', () => {
    expect(matchBenefit(B({ name: '세종형 쉐어하우스' }), A({ age: 40 })).status).toBe('maybe')
  })
})

describe('나이 기준이 어긋날 때', () => {
  it('35~39세는 34세 기준으로 no 그대로, 확인 필요 표시', () => {
    const a = A({ age: 37, deal: 'wolse' })
    const v = flagAgeConflicts(evaluate(a), ITEMS, a).find((x) => x.id === 'molitRent')!
    expect(v.status).toBe('no')
    expect(v.needCheck).toBe(true)
    expect(v.reasons.at(-1)).toContain('만 19~39세')
  })
  it('두 기준 모두 맞는 나이면 아무것도 붙이지 않는다', () => {
    const a = A({ age: 27, deal: 'wolse' })
    const v = flagAgeConflicts(evaluate(a), ITEMS, a).find((x) => x.id === 'molitRent')!
    expect(v.needCheck).toBeFalsy()
  })
})

describe('순위', () => {
  it('둘 중 하나 제도는 이득인 쪽만 올리고, 진단 제도 다음 API 제도', () => {
    const a = A({ age: 32, deal: 'wolse', deposit: 1000, rent: 45, income: 1500, stage: 'movedin' })
    // 청년월세 접수 중(2026.03.02~05.30)인 날
    const r = rank({ verdicts: evaluate(a), items: ITEMS, answers: a, today: '20260415', bank: 4.5, basis: DEFAULT_BASIS })
    const keys = r.map((x) => x.key)
    // 국토부 청년월세(24개월 480만원) > 세종 임대료(10개월 200만원)
    expect(keys).toContain('molitRent')
    expect(keys).not.toContain('sejongRent')
    expect(keys).toContain('gov24-g1')
    expect(keys).not.toContain('youthcenter-y3') // 나이 밖
    expect(keys.indexOf('molitRent')).toBeLessThan(keys.indexOf('gov24-g1'))
  })
  it('비교 기간을 1년으로 바꾸면 금액이 줄어든다', () => {
    const a = A({ age: 27, deal: 'wolse' })
    expect(amountOf('molitRent', a, 4.5, { rate: 'est', years: 1 })).toBe(240)
    expect(amountOf('molitRent', a, 4.5, { rate: 'est', years: 6 })).toBe(480)
  })
  it('계약 전 전세면 대출·보증료 지원이 앞, API 를 못 불러와도 진단 제도로 순위를 낸다', () => {
    const a = A({ age: 27, deal: 'jeonse', deposit: 10000, rent: 0, income: 3000, stage: 'explore' })
    const r = rank({ verdicts: evaluate(a), items: null, answers: a, today: T, bank: 4.5, basis: DEFAULT_BASIS })
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].kind).toBe('loan')
    expect(r.every((x) => x.from === 'verdict')).toBe(true)
  })
  it('마감된 제도는 상시 제도보다 뒤', () => {
    const a = A({ age: 27, deal: 'jeonse', deposit: 10000, rent: 0, income: 3000, stage: 'explore' })
    const items = [B({ source: 'youthcenter', name: '청년 주택임차보증금 이자 지원', begin: '20260301', end: '20260331' }), ITEMS[2]]
    const r = rank({ verdicts: evaluate(a), items, answers: a, today: T, bank: 4.5, basis: DEFAULT_BASIS })
    const closed = r.findIndex((x) => x.phase === 'closed')
    if (closed >= 0) expect(r.slice(closed).every((x) => x.phase === 'closed')).toBe(true)
  })
})
