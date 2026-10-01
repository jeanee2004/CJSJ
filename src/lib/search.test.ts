import { describe, expect, it } from 'vitest'
import { approxSubstring, choseong, rank, toJamo } from './search'
import { TERMS } from '../data/terms'

const items = TERMS.map((t) => ({ id: t.id, fields: [t.word, ...(t.alias ?? [])], long: t.easy }))
const run = (q: string) => rank(items, q)

describe('한글 자모 처리', () => {
  it('자모로 풀고 초성을 뽑는다', () => {
    expect(toJamo('금')).toBe('ㄱㅡㅁ')
    expect(choseong('보증금')).toBe('ㅂㅈㄱ')
  })
  it('부분 문자열 편집 거리', () => {
    expect(approxSubstring('ㅈㅓㄴㅅㅐ', 'ㅈㅓㄴㅅㅔ')).toBe(1)
    expect(approxSubstring('ㅈㅓㄴ', 'ㅈㅓㄴㅅㅔ')).toBe(0)
  })
})

describe('용어 검색', () => {
  it('정확히 입력하면 바로 결과', () => {
    expect(run('보증금').hits[0]).toBe('deposit')
    expect(run('전세').hits).toContain('jeonse')
  })
  it('공백이 있어도 찾는다', () => {
    expect(run('보 증 금').hits[0]).toBe('deposit')
  })
  it('빈 검색어는 전체', () => {
    expect(run('').hits.length).toBe(TERMS.length)
  })
  it('초성 검색', () => {
    expect(run('ㅂㅈㄱ').hits).toContain('deposit')
    expect(run('ㅈㄱ').hits).toContain('jan')
  })
  it('다 치지 않은 글자도 찾는다', () => {
    expect(run('잔그').hits).toContain('jan')
  })
  it('오타는 "혹시 이걸 찾으셨나요?"로 추천한다', () => {
    const r1 = run('보증굼')
    expect(r1.hits).toEqual([])
    expect(r1.suggestions[0]).toBe('deposit')
    expect(run('전새').suggestions).toContain('jeonse')
    expect(run('월새').suggestions).toContain('wolse')
    expect(run('버팀묵').suggestions).toContain('buteemok')
  })
  it('추천은 정말 비슷한 말만 보여준다', () => {
    expect(run('보증굼').suggestions).toEqual(['deposit'])
  })
  it('비슷한 뜻의 말(동의어)도 찾는다', () => {
    expect(run('집세').hits).toContain('wolse')
    expect(run('복비').hits).toContain('entry')
    expect(run('원룸').hits).toContain('multihouse')
  })
  it('전혀 관련 없는 말은 추천도 하지 않는다', () => {
    const r = run('우주여행선')
    expect(r.hits).toEqual([])
    expect(r.suggestions).toEqual([])
  })
})
