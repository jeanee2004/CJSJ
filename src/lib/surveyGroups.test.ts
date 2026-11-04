import { describe, expect, it } from 'vitest'
import { SIMPLE_IDS } from '../data/survey'
import { SIMPLE_GROUPS, simpleScreens } from './surveyGroups'

describe('simpleScreens', () => {
  it('맛보기 12문항을 빠짐없이 한 번씩, 4화면 이하로 묶는다', () => {
    const sc = simpleScreens({})
    expect(sc.length).toBeLessThanOrEqual(4)
    const ids = sc.flatMap((x) => x.qs.map((q) => q.id))
    expect([...ids].sort()).toEqual([...SIMPLE_IDS].sort())
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('Q13 은 판정에 쓰는 4개 제도 행만 보여 준다', () => {
    const q13 = simpleScreens({}).flatMap((x) => x.qs).find((q) => q.id === 'Q13')
    expect(q13?.rows?.map((r) => r.k)).toEqual(['1', '2', '3', '4'])
  })
  it('묶음 정의의 모든 id 가 실제 맛보기 문항이다', () => {
    for (const g of SIMPLE_GROUPS) for (const id of g.ids) expect(SIMPLE_IDS).toContain(id)
  })
})
