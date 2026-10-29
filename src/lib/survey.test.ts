import { describe, expect, it } from 'vitest'
import { QUESTIONS } from '../data/survey'
import { deriveAnswers, summarize, visibleQuestions } from './survey'

describe('청년 주거 경험 설문 → 판정 답변', () => {
  it('문항 id 가 중복되지 않는다', () => {
    const ids = QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('폼 24문항 + 새로 구하는 집 4문항(총 28), 건너뛰는 문항은 없다', () => {
    expect(QUESTIONS.length).toBe(28)
    expect(visibleQuestions({}).length).toBe(QUESTIONS.length)
  })

  it('연령대·거주 형태·가구 형태를 판정 값으로 바꾼다', () => {
    const a = deriveAnswers({ Q1: '3', Q2: '2', Q4: '5' })
    expect(a.age).toBe(32)
    expect(a.residence).toBe('liveOnly')
    expect(a.marital).toBe('newlywed')
    expect(deriveAnswers({ Q2: '3' }).residence).toBe('outside')
  })

  it('월 소득 구간 대표값×12, 모르면 확인 필요로 표시', () => {
    expect(deriveAnswers({ Q5: '2' }).income).toBe(3000)
    expect(deriveAnswers({ Q5: 'unk' }).unknown).toContain('income')
  })

  it('부모와 동거면 주소 분리 아님, 자가는 유주택, 제도 이용 이력 추출', () => {
    const a = deriveAnswers({ Q4: '2', Q7: '1', Q13: { '1': '4', '3': '2', '4': '4', '2': '1' } })
    expect(a.livesApart).toBe(false)
    expect(a.ownsHome).toBe(true)
    expect(a.hasLoan).toBe(true)
    expect(a.usedBefore).toBe(true)
    expect(a.aware).toEqual(['sejongRent', 'molitRent', 'buteemok'])
  })

  it('요약: 월 주거비와 소득 대비 비율, 아는 제도 수', () => {
    const s = summarize({ Q5: '2', 'Q8-2': '4', Q13: { '1': '1', '2': '2', '3': '4' } } as never)
    expect(s.housingCost).toBe(35)
    expect(s.ratio).toBe(14)
    expect(s.known).toBe(2)
    expect(s.used).toBe(1)
  })
})
