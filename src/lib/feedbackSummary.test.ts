import { describe, expect, it } from 'vitest'
import { summarizeFeedback } from './feedbackSummary'

const row = (choices: string[], comment: string | null = null) => ({ choices, comment, created_at: '2026-11-05T00:00:00Z' })

describe('summarizeFeedback', () => {
  it('비어 있으면 요약 문장이 없다', () => {
    expect(summarizeFeedback([])).toMatchObject({ total: 0, lines: [] })
  })
  it('많은 의견과 일부 의견을 나눠 말한다', () => {
    const rows = [row(['rent']), row(['rent', 'move']), row(['rent']), row(['agent']), row(['rent', 'guarantee'])]
    const s = summarizeFeedback(rows)
    expect(s.ranking[0]).toMatchObject({ id: 'rent', n: 4, pct: 80 })
    expect(s.lines[0]).toContain('매달 월세')
    expect(s.lines[1]).toContain('이사비')
  })
  it('한마디 수를 세고, 적으면 참고 문구를 붙인다', () => {
    const s = summarizeFeedback([row(['gap'], '기다리는 게 힘들어요'), row(['gap'])])
    expect(s.comments).toHaveLength(1)
    expect(s.lines.at(-1)).toContain('참고만')
  })
})
