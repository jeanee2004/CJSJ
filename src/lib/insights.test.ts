import { describe, expect, it } from 'vitest'
import type { EventRow, ResponseRow } from './adminStats'
import { analyze, awarenessRank, buildInsights, buildReport, buildSuggestions, collectionStatus, diagnoseFlow } from './insights'
import type { InsightCtx } from './insights'

const T = '2026-11-03T10:00:00Z'
const ev = (s: string, type: string, o: Partial<EventRow> = {}): EventRow => ({ session_id: s, event_type: type, name: null, survey_type: null, duration_ms: null, device: 'mobile', created_at: T, ...o })
const rr = (answers: Record<string, unknown>, st: 'simple' | 'deep' = 'simple'): ResponseRow => ({ survey_type: st, answers, created_at: T })

const base = (events: EventRow[], responses: ResponseRow[]): InsightCtx => ({
  events, responses, order: { simple: ['Q1', 'Q2', 'Q3'], deep: ['Q1', 'D1'] },
  qTitle: (q) => `제목${q}`, optLabel: (q, c) => `${q}:${c}`, rowLabel: (_q, r) => `제도${r}`, sectionLabel: (n) => n, clickLabel: (n) => n,
})

// 40 세션: Q2 에서 10명 이탈, 30명 진행
function sample() {
  const events: EventRow[] = []
  for (let i = 0; i < 40; i++) {
    const s = `s${i}`
    events.push(ev(s, 'page_view'), ev(s, 'survey_start', { survey_type: 'simple' }), ev(s, 'survey_answer', { survey_type: 'simple', name: 'Q1' }))
    if (i < 10) events.push(ev(s, 'survey_abandon', { survey_type: 'simple', name: 'Q2' }))
    else events.push(ev(s, 'survey_answer', { survey_type: 'simple', name: 'Q2' }), ev(s, 'survey_complete', { survey_type: 'simple' }))
    if (i >= 10 && i < 14) events.push(ev(s, 'survey_start', { survey_type: 'deep' })) // 4명 -> k 미만
    if (i % 2 === 0) events.push(ev(s, 'click', { name: 'hero_start_survey' }))
  }
  for (let i = 0; i < 6; i++) events.push(ev(`s${i}`, 'section_view', { name: 'live', duration_ms: 9000 }))
  const responses: ResponseRow[] = []
  for (let i = 0; i < 40; i++) {
    responses.push(rr({ Q1: i < 25 ? '2' : '3', Q2: '1', Q9: i < 28 ? '5' : '2', Q13: { '1': i < 30 ? '1' : '2', '2': i < 8 ? '1' : '2' }, Q14: i < 20 ? '2' : i < 22 ? '1' : '7' }))
  }
  return { events, responses }
}

describe('insights', () => {
  it('규칙 기반 인사이트를 만든다', () => {
    const { events, responses } = sample()
    const ins = buildInsights(base(events, responses))
    const id = (x: string) => ins.find((i) => i.id === x)
    expect(id('dropoff-simple')?.text).toContain('Q2')
    expect(id('dropoff-simple')?.text).toContain('25%') // 10/40
    expect(id('conversion')?.text).toContain('5명 미만') // 4명은 숫자 비노출
    expect(id('top-click')?.text).toContain('hero_start_survey')
    expect(id('top-section')?.text).toContain('live')
    expect(id('comp-age')?.text).toContain('Q1:2')
    expect(id('burden')?.text).toContain('70%')
    expect(id('awareness')?.text).toContain('제도1')
    expect(id('barrier')?.text).toContain('Q14:2')
    expect(id('barrier')?.n).toBe(22)
  })
  it('표본 30 미만이면 low, 5 미만 소집단은 숨긴다', () => {
    const responses = Array.from({ length: 20 }, (_, i) => rr({ Q1: i < 4 ? '1' : '2', Q9: i < 4 ? '5' : '1' }))
    const ins = buildInsights(base([], responses))
    expect(ins.find((i) => i.id === 'comp-age')?.low).toBe(true)
    expect(ins.find((i) => i.id === 'burden')).toBeUndefined() // 4명 < k
    const few = buildInsights(base([], [rr({ Q1: '1' }), rr({ Q1: '1' })]))
    expect(few).toHaveLength(0)
  })
  it('인지 순위는 k 미만 제도를 뺀다', () => {
    const rows = Array.from({ length: 10 }, (_, i) => rr({ Q13: { '1': '1', '2': i < 3 ? '1' : '2' } }))
    expect(awarenessRank(rows).map((x) => x.row)).toEqual(['1'])
  })
  it('제안은 근거와 우선순위순으로 나온다', () => {
    const { events, responses } = sample()
    const c = base(events, responses)
    const s = buildSuggestions(buildInsights(c), c, events)
    expect(s.length).toBeGreaterThan(2)
    expect(s.every((x) => x.evidence.length > 0)).toBe(true)
    const pr = s.map((x) => x.priority)
    expect(pr).toEqual([...pr].sort())
    expect(s.find((x) => x.id === 's-awareness')?.priority).toBe(1)
    expect(s.find((x) => x.id === 's-barrier')?.action).toContain('서류')
  })
  it('빈 데이터는 인사이트·제안이 없다', () => {
    const r = analyze(base([], []), 7)
    expect(r.insights).toEqual([])
    expect(r.suggestions).toEqual([])
  })
  it('리포트 텍스트', () => {
    const { events, responses } = sample()
    const r = analyze(base(events, responses), null, Date.parse(T) + 1000)
    const txt = buildReport({ days: null, ...r, now: new Date(T) })
    expect(txt).toContain('전체 기간')
    expect(txt).toContain('핵심 지표')
    expect(txt).toContain('개선 제안')
  })
})

describe('diagnoseFlow / collectionStatus', () => {
  it('원인을 구분한다', () => {
    const d = (error: string | null, e = 0, r = 0, configured = true) => diagnoseFlow({ configured, error, events: e, responses: r }).kind
    expect(d(null, 0, 0, false)).toBe('no_config')
    expect(d('relation "public.events" does not exist')).toBe('no_table')
    expect(d('Could not find the table public.events in the schema cache')).toBe('no_table')
    expect(d('permission denied for table events')).toBe('no_permission')
    expect(d('new row violates row-level security policy')).toBe('no_permission')
    expect(d('network down')).toBe('error')
    expect(d(null, 0, 0)).toBe('empty')
    expect(d(null, 3, 0)).toBe('ok')
  })
  it('수신 상태', () => {
    const now = Date.parse(T) + 3600_000
    const st = collectionStatus([ev('a', 'page_view'), ev('a', 'click', { created_at: '2026-10-01T00:00:00Z' })], [], now)
    expect(st.last24h).toBe(1)
    expect(st.seen).toEqual(['page_view', 'click'])
    expect(st.missing).toContain('survey_complete')
    expect(collectionStatus([], []).lastEventAt).toBeNull()
  })
})
