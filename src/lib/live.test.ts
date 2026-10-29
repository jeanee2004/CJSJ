import { describe, expect, it } from 'vitest'
import { DEFAULT_ANSWERS, evaluate } from './eligibility'
import type { Answers } from './eligibility'
import type { Benefit, Notice } from './api'
import { applySchedules, coveredByVerdicts, fitsNotice, phaseOf, policyOf, scheduleFor } from './live'

const B = (x: Partial<Benefit>): Benefit => ({ source: 'gov24', id: '1', name: '', summary: '', org: '', apply: '', url: '', ...x })
// 2026-10-28 /api/benefits 실제 응답에서 일정 관련 항목만 옮김
const ITEMS: Benefit[] = [
  B({ source: 'youthcenter', name: '청년 주택임차보증금 이자 지원', begin: '20260301', end: '20260331', deadline: '금년 접수 마감' }),
  B({ source: 'youthcenter', name: '청년월세 지원', begin: '20260302', end: '20260530' }),
  B({ source: 'youthcenter', name: '세종형 청년 주거 임대료 지원（월세지원）', begin: '20260601', end: '20260630' }),
  B({ source: 'gov24', name: '세종 전세보증금반환보증 보증료 지원', deadline: '상시신청' }),
]
const N = (title: string): Notice => ({ id: title, title, status: '', supplier: 'LH', supplyType: '', houseType: '', complex: '', address: '', noticeDate: '', begin: '', end: '', winnerDate: '', units: '', url: '', open: true })
const A = (x: Partial<Answers>): Answers => ({ ...DEFAULT_ANSWERS, ...x })

describe('제도 이름 매칭', () => {
  it('API 이름을 진단 카드 id로', () => {
    expect(policyOf('세종시 청년 주택임차보증금 이자지원')).toBe('sejongInterest')
    expect(policyOf('청년 주거임대료 지원사업')).toBe('sejongRent')
    expect(policyOf('세종형 청년 주거 임대료 지원（월세지원）')).toBe('sejongRent')
    expect(policyOf('청년월세 지원')).toBe('molitRent')
    expect(policyOf('기초청년 주거급여(임차급여)')).toBeUndefined()
    expect(coveredByVerdicts(ITEMS[3])).toBe(false)
  })
})

describe('접수 일정', () => {
  it('온통청년 날짜를 정부24 문구보다 먼저 쓴다', () => {
    const s = scheduleFor('sejongInterest', [B({ source: 'gov24', name: '세종시 청년 주택임차보증금 이자지원', deadline: '상시신청' }), ...ITEMS])!
    expect(s).toMatchObject({ source: 'youthcenter', begin: '20260301', end: '20260331' })
  })
  it('기간 앞·안·뒤와 문구를 구분한다', () => {
    const s = { begin: '20260601', end: '20260630', source: 'youthcenter' as const }
    expect(phaseOf(s, '20260520')).toBe('upcoming')
    expect(phaseOf(s, '20260615')).toBe('open')
    expect(phaseOf(s, '20261029')).toBe('closed')
    expect(phaseOf({ deadline: '금년 접수 마감', source: 'gov24' }, '20261029')).toBe('closed')
    expect(phaseOf({ deadline: '상시신청', source: 'gov24' }, '20261029')).toBe('always')
  })
  it('마감이면 "신청할 수 있어요"를 "확인해 보면 좋아요"로 낮추고 이유를 붙인다', () => {
    const a = A({ age: 28, deal: 'wolse', deposit: 1000, rent: 45, income: 3000, livesApart: true, stage: 'contract', residence: 'both' })
    const before = evaluate(a).find((v) => v.id === 'sejongRent')!
    expect(before.status).not.toBe('no')
    const after = applySchedules(evaluate(a), ITEMS, '20261029').find((v) => v.id === 'sejongRent')!
    expect(after.status).toBe('maybe')
    expect(after.reasons[0]).toContain('2026.06.01~2026.06.30')
    expect(after.reasons[0]).toContain('온통청년')
    // 하드코딩된 "3월 3~5일 / 사흘" 문장은 빠진다
    expect([...after.reasons, ...after.todo].some((x) => /사흘|3월 3~5일/.test(x))).toBe(false)
  })
  it('자격이 안 되는 제도는 그대로 둔다', () => {
    const a = A({ age: 45 })
    const v = applySchedules(evaluate(a), ITEMS, '20261029').find((x) => x.id === 'sejongInterest')!
    expect(v.status).toBe('no')
    expect(v.reasons.some((r) => r.includes('온통청년'))).toBe(false)
  })
  it('접수 중이면 상태를 바꾸지 않는다', () => {
    const a = A({ age: 28, deal: 'wolse', deposit: 1000, rent: 45, income: 3000, stage: 'explore' })
    const before = evaluate(a).find((v) => v.id === 'sejongRent')!.status
    const after = applySchedules(evaluate(a), ITEMS, '20260615').find((v) => v.id === 'sejongRent')!
    expect(after.status).toBe(before)
    expect(after.reasons[0]).toContain('지금 접수 중')
  })
})

describe('공공임대 공고 맞춤', () => {
  const single = A({ age: 28, marital: 'single', survey: { Q4: '1' } })
  const couple = A({ age: 31, marital: 'newlywed', survey: { Q4: '5' } })
  const parent = A({ age: 35, marital: 'newlywed', survey: { Q4: '6' } })
  it('미혼 청년에게는 청년 공고만', () => {
    expect(fitsNotice(N('2026년 청년 전세임대 1순위 입주자 수시모집'), single)).toBe(true)
    expect(fitsNotice(N('2026년 신혼·신생아 전세임대 I 입주자 수시모집 공고'), single)).toBe(false)
    expect(fitsNotice(N('2026 다자녀 전세임대 입주자 수시모집 공고'), single)).toBe(false)
  })
  it('신혼부부에게는 신혼 공고, 자녀가 있으면 다자녀도', () => {
    expect(fitsNotice(N('2026년 신혼·신생아 전세임대 I 입주자 수시모집 공고'), couple)).toBe(true)
    expect(fitsNotice(N('2026 다자녀 전세임대 입주자 수시모집 공고'), couple)).toBe(false)
    expect(fitsNotice(N('2026 다자녀 전세임대 입주자 수시모집 공고'), parent)).toBe(true)
  })
  it('대상이 이름에 없으면 보여준다', () => {
    expect(fitsNotice(N('세종 행복주택 입주자 모집'), single)).toBe(true)
  })
})

it('정적 문구 끝의 날짜 괄호만 지운다', async () => {
  const { stripDates, isStaleCaution } = await import('./live')
  expect(stripDates('세종 일자리 종합 플랫폼 온라인 신청 (2026년은 3.3~3.5 사흘만 접수)')).toBe('세종 일자리 종합 플랫폼 온라인 신청')
  expect(stripDates('기금e든든 / 취급 은행')).toBe('기금e든든 / 취급 은행')
  expect(isStaleCaution('sejongRent', '1년에 사흘만 접수해요. 놓치면 다음 해를 기다려야 해서')).toBe(true)
  expect(isStaleCaution('molitRent', '세종시 임대료 지원과 같은 기간에는 둘 중 하나만 받을 수 있어요.')).toBe(false)
})
