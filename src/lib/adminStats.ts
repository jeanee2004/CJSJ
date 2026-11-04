// 관리자 대시보드 집계 순수 함수 (Supabase 응답 행 → 화면용 숫자). 클라이언트에서 계산하므로 행 수가 많으면 근사치다.
export type SType = 'simple' | 'deep'
export interface EventRow {
  session_id: string; event_type: string; name: string | null; survey_type: SType | null
  duration_ms: number | null; device: string | null; created_at: string
}
export interface ResponseRow { survey_type: SType; answers: Record<string, unknown>; created_at: string }
export type SurveyFilter = 'all' | SType

const ms = (r: { created_at: string }) => Date.parse(r.created_at)

/** 기간 필터: days 일 이내 행만 (null 이면 전체) */
export function inRange<T extends { created_at: string }>(rows: T[], days: number | null, now = Date.now()): T[] {
  if (days === null) return rows
  const from = now - days * 86_400_000
  return rows.filter((r) => ms(r) >= from)
}

const sessionsOf = (rows: EventRow[], type: string, st?: SType) =>
  new Set(rows.filter((r) => r.event_type === type && (!st || r.survey_type === st)).map((r) => r.session_id))

export interface Summary {
  visitors: number; surveyStarts: number
  completeRate: { simple: number | null; deep: number | null }
  avgStayMs: number | null
}
/** 요약 카드. 평균 체류 = 세션별 첫 이벤트~마지막 이벤트 간격(이벤트가 2개 이상인 세션)의 평균 */
export function summarize(events: EventRow[]): Summary {
  const visitors = new Set(events.filter((e) => e.event_type === 'page_view').map((e) => e.session_id)).size
  const rate = (st: SType) => {
    const s = sessionsOf(events, 'survey_start', st).size
    const c = sessionsOf(events, 'survey_complete', st).size
    return s === 0 ? null : Math.min(1, c / s)
  }
  const span = new Map<string, [number, number, number]>()
  for (const e of events) {
    const t = ms(e)
    const cur = span.get(e.session_id)
    if (!cur) span.set(e.session_id, [t, t, 1])
    else { cur[0] = Math.min(cur[0], t); cur[1] = Math.max(cur[1], t); cur[2]++ }
  }
  const spans = [...span.values()].filter((v) => v[2] >= 2).map((v) => v[1] - v[0])
  return {
    visitors,
    surveyStarts: sessionsOf(events, 'survey_start').size,
    completeRate: { simple: rate('simple'), deep: rate('deep') },
    avgStayMs: spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : null,
  }
}

export interface Bar { name: string; value: number; n: number }

/** 섹션별 평균 보인 시간 (섹션 이름 → 평균 ms, 관측 횟수) */
export function sectionAvg(events: EventRow[]): Bar[] {
  const m = new Map<string, [number, number]>()
  for (const e of events) {
    if (e.event_type !== 'section_view' || !e.name || e.duration_ms == null) continue
    const c = m.get(e.name) ?? [0, 0]
    c[0] += e.duration_ms; c[1]++
    m.set(e.name, c)
  }
  return [...m].map(([name, [sum, n]]) => ({ name, value: sum / n, n })).sort((a, b) => b.value - a.value)
}

/** 클릭 순위 (이름별 횟수, 내림차순) */
export function clickRank(events: EventRow[], top = 10): Bar[] {
  const m = new Map<string, number>()
  for (const e of events) if (e.event_type === 'click' && e.name) m.set(e.name, (m.get(e.name) ?? 0) + 1)
  return [...m].map(([name, n]) => ({ name, value: n, n })).sort((a, b) => b.value - a.value).slice(0, top)
}

export interface FunnelRow { id: string; answered: number; abandoned: number }
/** 문항별 퍼널: 그 문항에 답하고 넘어간 세션 수 / 그 문항에서 그만둔 세션 수. order 는 문항 순서 */
export function funnel(events: EventRow[], order: string[], st: SType): FunnelRow[] {
  const ans = new Map<string, Set<string>>(), ab = new Map<string, Set<string>>()
  const add = (m: Map<string, Set<string>>, k: string, s: string) => { const x = m.get(k) ?? new Set<string>(); x.add(s); m.set(k, x) }
  for (const e of events) {
    if (e.survey_type !== st || !e.name) continue
    if (e.event_type === 'survey_answer') add(ans, e.name, e.session_id)
    else if (e.event_type === 'survey_abandon') add(ab, e.name, e.session_id)
  }
  return order.map((id) => ({ id, answered: ans.get(id)?.size ?? 0, abandoned: ab.get(id)?.size ?? 0 })).filter((r) => r.answered + r.abandoned > 0)
}

export interface DayPoint { day: string; visitors: number; starts: number }
const dayKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
/** 일별 방문 세션·설문 시작 세션. 데이터가 있는 첫날~마지막 날을 빈 날 없이 이어 준다 */
export function daily(events: EventRow[]): DayPoint[] {
  const v = new Map<string, Set<string>>(), s = new Map<string, Set<string>>()
  let lo = Infinity, hi = -Infinity
  for (const e of events) {
    const t = ms(e)
    if (Number.isNaN(t)) continue
    lo = Math.min(lo, t); hi = Math.max(hi, t)
    const target = e.event_type === 'page_view' ? v : e.event_type === 'survey_start' ? s : null
    if (!target) continue
    const k = dayKey(t)
    const x = target.get(k) ?? new Set<string>(); x.add(e.session_id); target.set(k, x)
  }
  if (!Number.isFinite(lo)) return []
  const out: DayPoint[] = []
  const end = new Date(hi); end.setHours(0, 0, 0, 0)
  for (const d = new Date(lo); ; d.setDate(d.getDate() + 1)) {
    d.setHours(0, 0, 0, 0)
    if (d.getTime() > end.getTime()) break
    const k = dayKey(d.getTime())
    out.push({ day: k, visitors: v.get(k)?.size ?? 0, starts: s.get(k)?.size ?? 0 })
    if (out.length > 400) break
  }
  return out
}

/** 설문 응답 분포: answers[qid] 의 코드를 labels 로 바꿔 센다 (복수 선택은 각각). 없는 코드는 그대로 둔다 */
export function distribution(rows: ResponseRow[], qid: string, labels: Record<string, string>, st: SurveyFilter = 'all'): Bar[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    if (st !== 'all' && r.survey_type !== st) continue
    const v = r.answers?.[qid]
    const codes = Array.isArray(v) ? v : typeof v === 'string' || typeof v === 'number' ? [String(v)] : []
    for (const c of codes) { const l = labels[c] ?? c; m.set(l, (m.get(l) ?? 0) + 1) }
  }
  return [...m].map(([name, n]) => ({ name, value: n, n }))
}

export const fmtDur = (msv: number | null): string => {
  if (msv === null || !Number.isFinite(msv)) return '-'
  const s = Math.round(msv / 1000)
  return s < 60 ? `${s}초` : `${Math.floor(s / 60)}분 ${s % 60}초`
}
export const fmtPct = (r: number | null): string => (r === null ? '-' : `${Math.round(r * 100)}%`)
