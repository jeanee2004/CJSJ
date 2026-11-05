import { describe, expect, it } from 'vitest'
import { matchFaq } from './askFaq'
import type { FaqEntry } from './askFaq'
import { SEEDS } from '../../scripts/askFaqSeeds'
import { normalizeQuery, looksPersonal, aiCooling, markAiFailure } from '../../api/_lib/askCore'

const e = (id: string, keys: string[]): FaqEntry => ({ id, q: id, keys, answer: 'a', followups: [], policies: [], terms: [], links: [], sections: [] })
const E = [e('deposit', ['보증금']), e('back', ['보증금안', '못돌려']), e('fee', ['복비', '중개수수료'])]

describe('matchFaq', () => {
  it('더 구체적인(긴) 말이 이긴다', () => {
    expect(matchFaq('보증금 안 돌려줘요', E)?.id).toBe('back')
    expect(matchFaq('보증금이 뭐예요?', E)?.id).toBe('deposit')
  })
  it('띄어쓰기·대소문자와 상관없다', () => { expect(matchFaq('복 비 얼마?', E)?.id).toBe('fee') })
  it('너무 긴 질문과 무관한 질문은 AI 로 넘긴다', () => {
    expect(matchFaq('세종 정부청사 근처 원룸에서 반려동물 키울 수 있는지 그리고 보증금 협의 방법', E)).toBeNull()
    expect(matchFaq('오늘 날씨', E)).toBeNull()
  })
})

describe('질문 씨앗', () => {
  it('id 가 겹치지 않고 모두 찾을 말이 있다', () => {
    expect(new Set(SEEDS.map((s) => s.id)).size).toBe(SEEDS.length)
    for (const s of SEEDS) expect(s.keys.length).toBeGreaterThan(0)
  })
  it('각 씨앗의 질문은 자기 자신에게 맞는다(다른 항목에 가로채이지 않음)', () => {
    const all = SEEDS.map((s) => e(s.id, s.keys))
    const miss = SEEDS.filter((s) => matchFaq(s.q, all)?.id !== s.id).map((s) => s.id)
    expect(miss).toEqual([])
  })
})

describe('서버 보호 장치', () => {
  it('질문을 같은 열쇠로 다듬는다', () => { expect(normalizeQuery('  집값이   궁금해요?? ')).toBe('집값이 궁금해요') })
  it('연락처가 섞인 질문을 걸러 낸다', () => {
    expect(looksPersonal('010-1234-5678 집 문의')).toBe(true)
    expect(looksPersonal('a@b.com')).toBe(true)
    expect(looksPersonal('보증금 1000만원이 뭐예요')).toBe(false)
  })
  it('연달아 실패하면 잠시 멈춘다', () => {
    const t = 5_000_000
    expect(aiCooling(t)).toBe(false)
    markAiFailure(t, 60_000)
    expect(aiCooling(t + 30_000)).toBe(true)
    expect(aiCooling(t + 61_000)).toBe(false)
  })
})

import { FAQ } from '../data/askFaq'
import { ALL_POLICIES } from '../data/policies'
import { TERM_MAP } from '../data/terms'

describe('저장된 FAQ 데이터', () => {
  it('씨앗과 1:1 이고 질문이 자기 자신에게 맞는다', () => {
    expect(FAQ.map((f) => f.id)).toEqual(SEEDS.map((s) => s.id))
    const miss = FAQ.filter((f) => matchFaq(f.q, FAQ)?.id !== f.id).map((f) => f.id)
    expect(miss).toEqual([])
  })
  it('가리키는 제도·용어가 실제로 있고, 링크는 공식 주소(https)다', () => {
    for (const f of FAQ) {
      for (const p of f.policies) expect(ALL_POLICIES.some((x) => x.id === p), `${f.id}:${p}`).toBe(true)
      for (const t of f.terms) expect(TERM_MAP[t], `${f.id}:${t}`).toBeTruthy()
      for (const l of f.links) expect(l.url.startsWith('https://')).toBe(true)
      expect(f.answer.length).toBeGreaterThan(30)
      expect(f.answer).not.toMatch(/https?:\/\//)
    }
  })
})
