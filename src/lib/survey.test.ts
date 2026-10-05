import { describe, expect, it } from 'vitest'
import { QUESTIONS } from '../data/survey'
import { deriveAnswers, summarize, visibleQuestions } from './survey'

describe('세종시 조사 문항 → 판정 답변', () => {
  it('문항 id 가 중복되지 않는다', () => {
    const ids = QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('임차가구가 아니면 임대차(Q19~24)를 건너뛴다', () => {
    const ids = visibleQuestions({ Q18: '1' }).map((q) => q.id)
    expect(ids).not.toContain('Q22')
    expect(visibleQuestions({ Q18: '3' }).map((q) => q.id)).toContain('Q22')
  })

  it('월 소득×12, 모르면 확인 필요로 표시', () => {
    expect(deriveAnswers({ Q1: '27', Q7: '1', Q9: { self: 250, house: 250, spend: 150 } }).income).toBe(3000)
    expect(deriveAnswers({ Q9: 'unk' }).unknown).toContain('income')
  })

  it('부모와 동거면 주소 분리 아님, 무주택·전세대출·이용 이력 추출', () => {
    const a = deriveAnswers({ 'Q3-1': '2', Q18: '1', Q21: '3', Q34: { '1': '3', '9': '1' } })
    expect(a.livesApart).toBe(false)
    expect(a.ownsHome).toBe(true)
    expect(a.hasLoan).toBe(true)
    expect(a.usedBefore).toBe(true)
    expect(a.aware).toEqual(['sejongRent', 'molitRent'])
  })

  it('요약: 월 주거비와 소득 대비 비율', () => {
    const s = summarize({ Q9: { self: 200, house: 200, spend: 100 }, Q22: { deposit: 1000, rent: 40, fee: 5, loan: 15 }, Q34: { '1': '1', '2': '2', '3': '3' } })
    expect(s.housingCost).toBe(60)
    expect(s.ratio).toBe(30)
    expect(s.known).toBe(2)
  })
})
