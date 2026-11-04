import { describe, expect, it } from 'vitest'
import { QUESTIONS, SIMPLE_IDS } from '../data/survey'
import { deriveAnswers, summarize, visibleQuestions } from './survey'

describe('청년 주거 경험 설문 → 판정 답변', () => {
  it('문항 id 가 중복되지 않는다', () => {
    const ids = QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('폼 24문항 + 새로 구하는 집 4문항 + 심화 전용 7문항(총 35). 회사 규모(D6)는 민간 재직일 때만 보인다', () => {
    expect(QUESTIONS.length).toBe(35)
    expect(visibleQuestions({}).length).toBe(QUESTIONS.length - 1)
    expect(visibleQuestions({ Q3: '4' }).some((q) => q.id === 'D6')).toBe(true)
    expect(visibleQuestions({ Q3: '1' }).some((q) => q.id === 'D6')).toBe(false)
  })

  it('심화 전용 문항(D1~D7)은 맛보기에 나오지 않고, 기존 문항 순서는 그대로다', () => {
    const deepOnly = QUESTIONS.filter((q) => /^D\d/.test(q.id)).map((q) => q.id)
    expect(deepOnly).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'])
    expect(visibleQuestions({ Q3: '4' }, 'simple').some((q) => deepOnly.includes(q.id))).toBe(false)
    expect(QUESTIONS.slice(0, 28).map((q) => q.id).filter((id) => !id.startsWith('D'))).toHaveLength(28)
  })

  it('맛보기 설문은 12문항이고 모두 실제 문항이며, 심화 설문은 전체다', () => {
    expect(SIMPLE_IDS.length).toBe(12)
    expect(SIMPLE_IDS.every((id) => QUESTIONS.some((q) => q.id === id))).toBe(true)
    expect(visibleQuestions({}, 'simple').map((q) => q.id)).toEqual(SIMPLE_IDS)
    expect(visibleQuestions({}, 'deep').length).toBe(QUESTIONS.length - 1) // D6(회사 규모)는 민간 재직일 때만
    expect(deriveAnswers({}, 'simple').surveyType).toBe('simple')
  })

  it('연령대·거주 형태·가구 형태를 판정 값으로 바꾼다', () => {
    const a = deriveAnswers({ Q1: '3', Q2: '2', Q4: '5' })
    expect(a.age).toBe(32)
    expect(a.residence).toBe('liveOnly')
    expect(a.marital).toBe('newlywed')
    expect(deriveAnswers({ Q2: '3' }).residence).toBe('outside')
  })

  it('만 34세 상한에 걸치는 30대 연령대는 나이를 확인 항목에 넣는다', () => {
    expect(deriveAnswers({ Q1: '3' }).unknown).toContain('age')
    expect(deriveAnswers({ Q1: '4' }).unknown).toContain('age')
    expect(deriveAnswers({ Q1: '2' }).unknown).not.toContain('age')
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

  it('심화 문항 → 판정 답변: 소득 분위·자산·세대 분리·무주택 기간·부채·회사 규모·희망 금액', () => {
    const a = deriveAnswers({ Q3: '4', Q4: '2', D1: '2', D2: '1', D3: '3', D4: '3', D5: 'small', D6: 'sme', D7: { maxDeposit: 8000, maxRent: 50 }, N1: 'wolse' }, 'deep')
    expect(a.medianBand).toBe(2)
    expect(a.assetBand).toBe(3)
    expect(a.separateHousehold).toBe(true)
    expect(a.livesApart).toBe(true) // 부모와 살지만 등본상 별도 세대
    expect(a.homelessYears).toBe(3)
    expect(a.debt).toBe('small')
    expect(a.employer).toBe('sme')
    expect(a.wishDeposit).toBe(8000)
    expect(a.wishRent).toBe(50)
  })

  it('심화 문항에서 모르겠어요를 고르면 확인 항목에 남고 값은 비운다', () => {
    const a = deriveAnswers({ D1: 'unk', D4: 'unk', D2: 'unk', D7: 'unk' }, 'deep')
    expect(a.medianBand).toBeUndefined()
    expect(a.assetBand).toBeUndefined()
    expect(a.unknown).toEqual(expect.arrayContaining(['medianBand', 'assets', 'separateHousehold', 'wish']))
  })

  it('맛보기로는 심화 값을 채우지 않는다', () => {
    const a = deriveAnswers({ D1: '1', D4: '1' }, 'simple')
    expect(a.medianBand).toBeUndefined()
    expect(a.assetBand).toBeUndefined()
  })
})
