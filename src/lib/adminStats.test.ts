import { describe, expect, it } from 'vitest'
import { clickRank, daily, distribution, funnel, inRange, sectionAvg, summarize } from './adminStats'
import type { EventRow } from './adminStats'

const ev = (session_id: string, event_type: string, t: string, o: Partial<EventRow> = {}): EventRow => ({
  session_id, event_type, name: null, survey_type: null, duration_ms: null, device: 'mobile', created_at: t, ...o,
})
const E: EventRow[] = [
  ev('a', 'page_view', '2026-11-01T10:00:00Z'),
  ev('a', 'survey_start', '2026-11-01T10:01:00Z', { survey_type: 'simple' }),
  ev('a', 'survey_answer', '2026-11-01T10:01:10Z', { survey_type: 'simple', name: 'Q1', duration_ms: 10000 }),
  ev('a', 'survey_complete', '2026-11-01T10:03:00Z', { survey_type: 'simple' }),
  ev('b', 'page_view', '2026-11-03T10:00:00Z'),
  ev('b', 'survey_start', '2026-11-03T10:00:30Z', { survey_type: 'simple' }),
  ev('b', 'survey_abandon', '2026-11-03T10:01:00Z', { survey_type: 'simple', name: 'Q2' }),
  ev('b', 'click', '2026-11-03T10:01:10Z', { name: 'glossary_fab' }),
  ev('c', 'page_view', '2026-11-03T11:00:00Z'),
  ev('c', 'section_view', '2026-11-03T11:00:05Z', { name: 'live', duration_ms: 4000 }),
  ev('c', 'section_view', '2026-11-03T11:00:09Z', { name: 'live', duration_ms: 2000 }),
]

describe('adminStats', () => {
  it('요약', () => {
    const s = summarize(E)
    expect(s.visitors).toBe(3)
    expect(s.surveyStarts).toBe(2)
    expect(s.completeRate.simple).toBe(0.5)
    expect(s.completeRate.deep).toBeNull()
    expect(s.avgStayMs).not.toBeNull()
  })
  it('빈 데이터', () => {
    const s = summarize([])
    expect(s.visitors).toBe(0)
    expect(s.avgStayMs).toBeNull()
    expect(daily([])).toEqual([])
  })
  it('섹션 평균·클릭 순위', () => {
    expect(sectionAvg(E)).toEqual([{ name: 'live', value: 3000, n: 2 }])
    expect(clickRank(E)[0]).toMatchObject({ name: 'glossary_fab', value: 1 })
  })
  it('퍼널', () => {
    expect(funnel(E, ['Q1', 'Q2', 'Q4'], 'simple')).toEqual([
      { id: 'Q1', answered: 1, abandoned: 0 }, { id: 'Q2', answered: 0, abandoned: 1 },
    ])
  })
  it('일별 추이는 빈 날을 채운다', () => {
    const d = daily(E)
    expect(d).toHaveLength(3)
    expect(d.reduce((a, x) => a + x.visitors, 0)).toBe(3)
  })
  it('기간 필터', () => {
    expect(inRange(E, 2, Date.parse('2026-11-04T00:00:00Z'))).toHaveLength(7)
    expect(inRange(E, null)).toHaveLength(E.length)
  })
  it('응답 분포: 코드를 문구로', () => {
    const rows = [
      { survey_type: 'simple' as const, answers: { Q1: '1' }, created_at: '' },
      { survey_type: 'deep' as const, answers: { Q1: '1', Q11: ['2', '3'] }, created_at: '' },
    ]
    expect(distribution(rows, 'Q1', { '1': '19~24세' })).toEqual([{ name: '19~24세', value: 2, n: 2 }])
    expect(distribution(rows, 'Q1', { '1': '19~24세' }, 'deep')[0].n).toBe(1)
    expect(distribution(rows, 'Q11', {}).length).toBe(2)
  })
})
