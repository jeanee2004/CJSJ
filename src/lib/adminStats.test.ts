import { describe, expect, it } from 'vitest'
import { ALL_TIME, clickRank, daily, dailyInPeriod, distribution, funnel, inPeriod, inRange, parseDay, periodFromDates, periodFromDays, periodText, prevPeriod, sectionAvg, shiftYears, summarize } from './adminStats'
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

import { change as chg, prevRange as prev } from './adminStats'
describe('전 기간 대비', () => {
  const now = Date.parse('2026-11-15T00:00:00Z')
  const at = (d: number) => ({ created_at: new Date(now - d * 86_400_000).toISOString() })
  it('직전 같은 길이의 기간만 고른다', () => {
    expect(prev([at(1), at(8), at(13), at(20)], 7, now)).toHaveLength(2)
    expect(prev([at(1)], null, now)).toEqual([])
  })
  it('증감률: 이전이 0이거나 값이 없으면 null', () => {
    expect(chg(150, 100)).toBeCloseTo(0.5)
    expect(chg(50, 100)).toBeCloseTo(-0.5)
    expect(chg(5, 0)).toBeNull()
    expect(chg(null, 3)).toBeNull()
  })
})

describe('기간(Period) 도구', () => {
  const d = (y: number, m: number, day: number, h = 0) => new Date(y, m - 1, day, h).getTime()
  const row = (t: number) => ({ created_at: new Date(t).toISOString() })

  it('parseDay: 올바른 날짜만 받는다', () => {
    expect(parseDay('2026-03-05')).toBe(d(2026, 3, 5))
    expect(parseDay('2026-02-30')).toBeNull()
    expect(parseDay('2026-3-5')).toBeNull()
    expect(parseDay('')).toBeNull()
  })
  it('periodFromDates: 종료일을 포함하고, 거꾸로면 null', () => {
    const p = periodFromDates('2026-03-01', '2026-03-31')!
    expect(p).toEqual({ from: d(2026, 3, 1), to: d(2026, 4, 1) })
    expect(periodFromDates('2026-03-31', '2026-03-01')).toBeNull()
    expect(periodFromDates('2026-03-01', '2026-03-01')).toEqual({ from: d(2026, 3, 1), to: d(2026, 3, 2) })
  })
  it('inPeriod: 시작 이상 끝 미만', () => {
    const p = periodFromDates('2026-03-01', '2026-03-02')!
    const rows = [row(d(2026, 2, 28, 23)), row(d(2026, 3, 1)), row(d(2026, 3, 2, 23)), row(d(2026, 3, 3))]
    expect(inPeriod(rows, p)).toHaveLength(2)
    expect(inPeriod(rows, ALL_TIME)).toHaveLength(4)
  })
  it('prevPeriod: 직전 같은 길이, 전체 기간은 null', () => {
    const p = periodFromDates('2026-03-08', '2026-03-14')!
    expect(prevPeriod(p)).toEqual({ from: d(2026, 3, 1), to: d(2026, 3, 8) })
    expect(prevPeriod(ALL_TIME)).toBeNull()
    const now = Date.now()
    expect(prevPeriod(periodFromDays(7, now), now)).toEqual({ from: now - 14 * 86_400_000, to: now - 7 * 86_400_000 })
  })
  it('shiftYears: 같은 달·일로 n년 전, 전체 기간은 그대로', () => {
    const p = periodFromDates('2026-03-01', '2026-03-31')!
    expect(shiftYears(p, 1)).toEqual({ from: d(2025, 3, 1), to: d(2025, 4, 1) })
    expect(shiftYears(p, 2)).toEqual({ from: d(2024, 3, 1), to: d(2024, 4, 1) })
    expect(shiftYears(ALL_TIME, 1)).toEqual(ALL_TIME)
  })
  it('periodText: 끝은 포함하는 날로 보여 준다', () => {
    expect(periodText(periodFromDates('2026-03-01', '2026-03-31')!)).toBe('2026-03-01 ~ 2026-03-31')
    expect(periodText(ALL_TIME)).toBe('전체 기간')
  })
  it('dailyInPeriod: 빈 날도 0으로 채워 기간 길이만큼 돌려준다', () => {
    const p = periodFromDates('2026-03-01', '2026-03-04')!
    const e = (s: string, t: number, type = 'page_view'): EventRow => ({ session_id: s, event_type: type, name: null, survey_type: null, duration_ms: null, device: null, created_at: new Date(t).toISOString() })
    const out = dailyInPeriod([e('a', d(2026, 3, 1, 9)), e('b', d(2026, 3, 1, 10)), e('a', d(2026, 3, 1, 11)), e('c', d(2026, 3, 3, 9)), e('z', d(2026, 3, 9))], p)
    expect(out.map((x) => x.visitors)).toEqual([2, 0, 1, 0])
    expect(out[0].day).toBe('2026-03-01')
    expect(dailyInPeriod([], ALL_TIME)).toEqual([])
  })
})
