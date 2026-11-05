import { describe, expect, it } from 'vitest'
import { ALL_POLICIES } from '../data/policies'
import { TERMS } from '../data/terms'
import { ASK_POLICIES, ASK_TERMS } from '../../api/_lib/askCatalog'
import { allow, sanitize } from '../../api/_lib/askCore'
import { localAnswer } from './ask'

describe('AI 검색 목록(api 복제본)이 원본과 같다', () => {
  it('제도 id·이름', () => expect(ASK_POLICIES).toEqual(Object.fromEntries(ALL_POLICIES.map((p) => [p.id, p.name]))))
  it('용어 id·단어', () => expect(ASK_TERMS).toEqual(Object.fromEntries(TERMS.map((t) => [t.id, t.word]))))
})

describe('sanitize: 모델 응답을 믿지 않는다', () => {
  it('목록에 없는 키와 주소는 버린다', () => {
    const r = sanitize({ answer: '확인하세요 https://evil.example <b>x</b>', followups: ['a?'], policies: ['sejongRent', 'hack'], terms: ['deposit', 'zzz'], links: ['molit_price', 'http://evil'], sections: ['live', 'x'] })!
    expect(r.answer).not.toContain('http')
    expect(r.answer).not.toContain('<b>')
    expect(r.policies).toEqual(['sejongRent'])
    expect(r.terms).toEqual(['deposit'])
    expect(r.links).toEqual(['molit_price'])
    expect(r.sections).toEqual(['live'])
  })
  it('답이 없으면 null', () => { expect(sanitize({ answer: '' })).toBeNull(); expect(sanitize(null)).toBeNull() })
})

describe('allow: 호출 제한', () => {
  it('1분에 8번을 넘으면 막는다', () => {
    const t = 1_000_000
    const ok = Array.from({ length: 10 }, () => allow('1.1.1.1', t))
    expect(ok.filter(Boolean)).toHaveLength(8)
    expect(allow('1.1.1.1', t + 61_000)).toBe(true)
  })
})

describe('localAnswer: AI 없이도 답한다', () => {
  it('집값 질문은 실거래가 링크와 실시간 섹션을 준다', () => {
    const a = localAnswer('집값이 궁금해')
    expect(a.links[0].key).toBe('molit_price')
    expect(a.sections[0].key).toBe('live')
  })
  it('용어를 찾는다', () => { expect(localAnswer('보증금').terms).toContain('deposit') })
  it('못 찾아도 빈 화면이 아니다', () => { expect(localAnswer('ㅋㅋㅋㅋ').answer.length).toBeGreaterThan(0) })
})
