import { describe, expect, it } from 'vitest'
import { buildReportDx, reportText, sectionOfClick, withinError } from './reportDx'
import type { EventRow } from './adminStats'

const NOW = Date.parse('2026-11-05T00:00:00Z')
const DAY = 86_400_000
let n = 0
const ev = (event_type: string, session: string, o: Partial<EventRow> = {}, daysAgo = 1): EventRow => ({
  session_id: session, event_type, name: null, survey_type: null, duration_ms: null, device: 'desktop',
  created_at: new Date(NOW - daysAgo * DAY - n++).toISOString(), ...o,
})
const views = (name: string, count: number, dur = 5000, daysAgo = 1) => Array.from({ length: count }, (_, i) => ev('section_view', `s${name}${i}`, { name, duration_ms: dur }, daysAgo))
const clicks = (name: string, count: number, daysAgo = 1) => Array.from({ length: count }, (_, i) => ev('click', `c${name}${i}`, { name }, daysAgo))

describe('sectionOfClick', () => {
  it('버튼 이름으로 섹션을 찾는다', () => {
    expect(sectionOfClick('hero_start_survey')).toBe('hero')
    expect(sectionOfClick('ask_policy:sejongRent')).toBe('ask')
    expect(sectionOfClick('apply:molitRent')).toBe('policies')
    expect(sectionOfClick('login_open')).toBeNull()
  })
})

describe('withinError', () => {
  it('표본이 작으면 오차 범위 안, 크고 차이가 크면 아니다', () => {
    expect(withinError(3, 10, 5, 10)).toBe(true)
    expect(withinError(10, 1000, 100, 1000)).toBe(false)
  })
  it('0 나눗셈이 없다', () => {
    expect(withinError(0, 0, 0, 0)).toBe(true)
    expect(withinError(0, 10, 0, 10)).toBe(true)
  })
})

describe('buildReportDx', () => {
  it('빈 데이터도 깨지지 않고 안내 문장을 낸다', () => {
    const dx = buildReportDx({ all: [], days: 7, now: NOW })
    expect(dx.hasData).toBe(false)
    expect(dx.insights).toEqual(['아직 보여 줄 만큼 모인 데이터가 없어요.'])
    expect(dx.sections).toHaveLength(7)
    expect(dx.sections.every((s) => s.kind === '자료 부족')).toBe(true)
    expect(dx.kpis.every((k) => k.value === null || k.value === 0)).toBe(true)
    expect(reportText(dx, [], new Date(NOW))).toContain('지표 정의')
  })

  it('표본이 부족하면(10회 미만) 성격을 정하지 않는다', () => {
    const dx = buildReportDx({ all: [...views('hero', 5), ...clicks('hero_start_survey', 2)], days: 7, now: NOW })
    const hero = dx.sections.find((s) => s.name === 'hero')!
    expect(hero.kind).toBe('자료 부족')
    expect(hero.index).toBeNull()
    expect(hero.why[0]).toContain('오차 범위')
  })

  it('방문 수가 아니라 클릭률로 순위를 매기고 성격을 나눈다', () => {
    const all = [
      ...views('hero', 100, 3000), ...clicks('hero_start_survey', 30),   // 클릭률 30%
      ...views('how', 200, 9000), ...clicks('policy_card_open', 0),        // 방문 많고 클릭 0, 체류 김
      ...views('policies', 50, 1000), ...clicks('policy_card_open', 2),    // 클릭률 4%, 체류 짧음
    ]
    const dx = buildReportDx({ all, days: 7, now: NOW })
    expect(dx.sections[0].name).toBe('hero')
    expect(dx.sections[0].kind).toBe('전환형')
    expect(dx.sections.find((s) => s.name === 'how')!.kind).toBe('탐색형')
    expect(dx.sections.find((s) => s.name === 'policies')!.kind).toBe('이탈형')
    expect(dx.sections[0].index).toBeGreaterThan(100)
    expect(dx.sections.find((s) => s.name === 'hero')!.topButton).toBe('hero_start_survey')
  })

  it('지표 식·전 기간 대비·AI 검색 횟수를 담는다', () => {
    const cur = [...Array.from({ length: 40 }, (_, i) => ev('page_view', `v${i}`)), ...Array.from({ length: 10 }, (_, i) => ev('survey_start', `v${i}`, { survey_type: 'simple' })), ...clicks('ask_submit', 3)]
    const old = [...Array.from({ length: 20 }, (_, i) => ev('page_view', `o${i}`, {}, 10))]
    const dx = buildReportDx({ all: [...cur, ...old], days: 7, now: NOW })
    const v = dx.kpis.find((k) => k.key === 'visitors')!
    expect(v.value).toBe(40)
    expect(v.prev).toBe(20)
    expect(v.delta).toBe(1)
    expect(dx.kpis.find((k) => k.key === 'startRate')!.value).toBeCloseTo(0.25)
    expect(dx.ask.submits).toBe(3)
    const text = reportText(dx, ['월세 의견이 많았어요.'], new Date(NOW))
    expect(text).toContain('설문 시작률 = 설문 시작 세션 ÷ 방문 세션')
    expect(text).toContain('의견 요약')
  })

  it('월간은 30일 범위를 본다', () => {
    const all = [ev('page_view', 'a', {}, 20)]
    expect(buildReportDx({ all, days: 7, now: NOW }).kpis[0].value).toBe(0)
    expect(buildReportDx({ all, days: 30, now: NOW }).kpis[0].value).toBe(1)
  })
})
