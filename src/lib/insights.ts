// 관리자 자동 인사이트·개선 제안·수집 상태 진단 (순수 함수). 화면(Admin.tsx)은 이 결과를 그대로 보여 주기만 한다.
// 개인정보 원칙: 5 미만 소집단(k=5)은 어떤 문장에도 숫자로 드러내지 않고, 표본이 30 미만이면 '표본이 적어요'를 붙인다.
import type { EventRow, ResponseRow, SType } from './adminStats'
import { fmtDur, funnel, inRange, sectionAvg, summarize } from './adminStats'

export const MIN_K = 5 // 이보다 작은 집단은 표시하지 않는다
export const LOW_N = 30 // 이보다 표본이 적으면 경고한다

export interface InsightCtx {
  events: EventRow[]
  responses: ResponseRow[]
  /** 문항 순서 (간편/심화) */
  order: Record<SType, string[]>
  qTitle: (qid: string) => string
  /** 선택지 코드 → 글자 (없으면 코드 그대로) */
  optLabel: (qid: string, code: string) => string
  /** 행렬 문항의 행 이름 */
  rowLabel: (qid: string, row: string) => string
  sectionLabel: (name: string) => string
  clickLabel: (name: string) => string
}

export interface Insight {
  id: string
  title: string
  text: string
  /** 근거 표본 수 */
  n: number
  /** n < LOW_N */
  low: boolean
  /** 개선 제안이 쓸 수치 */
  facts?: Record<string, number | string>
}

export interface Suggestion {
  id: string
  /** 1 가장 먼저 · 2 · 3 */
  priority: 1 | 2 | 3
  title: string
  action: string
  evidence: string
  low: boolean
  from: string
}

const pct = (r: number) => `${Math.round(r * 100)}%`
const mk = (id: string, title: string, text: string, n: number, facts?: Insight['facts']): Insight => ({ id, title, text, n, low: n < LOW_N, facts })

const toCodes = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' || typeof v === 'number' ? [String(v)] : [])

/** 한 문항의 코드별 응답 수 */
function countCodes(rows: ResponseRow[], qid: string): { counts: Map<string, number>; answered: number } {
  const counts = new Map<string, number>()
  let answered = 0
  for (const r of rows) {
    const codes = toCodes(r.answers?.[qid])
    if (!codes.length) continue
    answered++
    for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  return { counts, answered }
}

/** 5 이상인 것 중 가장 많은 코드 (제외 코드 지정 가능) */
function topCode(rows: ResponseRow[], qid: string, exclude: string[] = []): { code: string; n: number; answered: number } | null {
  const { counts, answered } = countCodes(rows, qid)
  const best = [...counts].filter(([c]) => !exclude.includes(c)).sort((a, b) => b[1] - a[1])[0]
  return best && best[1] >= MIN_K ? { code: best[0], n: best[1], answered } : null
}

export function insightDropoff(ctx: InsightCtx): Insight[] {
  const out: Insight[] = []
  for (const st of ['simple', 'deep'] as SType[]) {
    const rows = funnel(ctx.events, ctx.order[st], st)
      .map((r) => ({ ...r, entered: r.answered + r.abandoned }))
      .filter((r) => r.abandoned >= MIN_K && r.entered >= MIN_K)
    if (!rows.length) continue
    const worst = rows.map((r) => ({ ...r, rate: r.abandoned / r.entered })).sort((a, b) => b.rate - a.rate || b.abandoned - a.abandoned)[0]
    const name = st === 'simple' ? '맛보기' : '심화'
    out.push(mk(`dropoff-${st}`, `${name} 설문 이탈`,
      `${name} 설문에서는 ${worst.id}(${ctx.qTitle(worst.id)})에서 가장 많이 그만둬요. 이 문항까지 온 ${worst.entered}명 중 ${worst.abandoned}명(${pct(worst.rate)})이 여기서 멈췄어요.`,
      worst.entered, { qid: worst.id, rate: worst.rate, abandoned: worst.abandoned, st }))
  }
  return out
}

/** 맛보기를 끝낸 세션 중 같은 세션에서 심화를 시작한 비율 */
export function insightConversion(ctx: InsightCtx): Insight[] {
  const set = (type: string, st: SType) => new Set(ctx.events.filter((e) => e.event_type === type && e.survey_type === st).map((e) => e.session_id))
  const done = set('survey_complete', 'simple')
  if (done.size < MIN_K) return []
  const deep = set('survey_start', 'deep')
  const moved = [...done].filter((s) => deep.has(s)).length
  if (moved < MIN_K) {
    return [mk('conversion', '맛보기 → 심화', `맛보기를 끝낸 ${done.size}명 중 심화 설문으로 이어간 사람은 ${MIN_K}명 미만이에요.`, done.size, { rate: 0, done: done.size })]
  }
  const rate = moved / done.size
  return [mk('conversion', '맛보기 → 심화', `맛보기를 끝낸 ${done.size}명 중 ${moved}명(${pct(rate)})이 같은 방문에서 심화 설문을 시작했어요.`, done.size, { rate, done: done.size })]
}

export function insightEngagement(ctx: InsightCtx): Insight[] {
  const out: Insight[] = []
  const clicks = new Map<string, number>()
  for (const e of ctx.events) if (e.event_type === 'click' && e.name) clicks.set(e.name, (clicks.get(e.name) ?? 0) + 1)
  const total = [...clicks.values()].reduce((a, b) => a + b, 0)
  const top = [...clicks].sort((a, b) => b[1] - a[1])[0]
  if (top && top[1] >= MIN_K) out.push(mk('top-click', '가장 많이 누른 버튼', `가장 많이 눌린 버튼은 '${ctx.clickLabel(top[0])}'로 ${top[1]}회(전체 클릭의 ${pct(top[1] / total)})예요.`, total, { name: top[0], count: top[1] }))
  const secs = sectionAvg(ctx.events).filter((s) => s.n >= MIN_K)
  if (secs.length) out.push(mk('top-section', '가장 오래 머문 구간', `홈에서 가장 오래 머문 곳은 '${ctx.sectionLabel(secs[0].name)}'로 평균 ${fmtDur(secs[0].value)}(${secs[0].n}회 관측)예요.`, secs[0].n, { name: secs[0].name }))
  return out
}

export function insightComposition(ctx: InsightCtx): Insight[] {
  const out: Insight[] = []
  const parts: [string, string, string][] = [['Q1', 'age', '연령대'], ['Q2', 'resid', '세종 거주 형태']]
  for (const [qid, id, label] of parts) {
    const t = topCode(ctx.responses, qid)
    if (t) out.push(mk(`comp-${id}`, `응답자 구성 · ${label}`, `${label}는 '${ctx.optLabel(qid, t.code)}'가 가장 많아요 (${t.n}명, 응답자의 ${pct(t.n / t.answered)}).`, t.answered, { qid, code: t.code }))
  }
  return out
}

/** 주거비 부담(Q9)이 '부담된다/매우 부담된다'인 응답자 비율 */
export function insightBurden(ctx: InsightCtx): Insight[] {
  const { counts, answered } = countCodes(ctx.responses, 'Q9')
  const heavy = (counts.get('4') ?? 0) + (counts.get('5') ?? 0)
  if (answered < MIN_K || heavy < MIN_K) return []
  const rate = heavy / answered
  return [mk('burden', '주거비 부담', `응답자의 ${pct(rate)}(${heavy}/${answered}명)가 소득 대비 주거비가 '부담된다' 이상이라고 답했어요.`, answered, { rate, heavy })]
}

/** 제도 인지(Q13): '몰랐다' 비율이 높은 제도 상위 3 */
export function awarenessRank(rows: ResponseRow[]): { row: string; unaware: number; total: number; rate: number }[] {
  const m = new Map<string, [number, number]>()
  for (const r of rows) {
    const q = r.answers?.Q13
    if (!q || typeof q !== 'object' || Array.isArray(q)) continue
    for (const [k, v] of Object.entries(q as Record<string, unknown>)) {
      const c = m.get(k) ?? [0, 0]
      c[1]++
      if (String(v) === '1') c[0]++
      m.set(k, c)
    }
  }
  return [...m].map(([row, [unaware, total]]) => ({ row, unaware, total, rate: unaware / total }))
    .filter((x) => x.unaware >= MIN_K && x.total >= MIN_K)
    .sort((a, b) => b.rate - a.rate || b.unaware - a.unaware)
}

export function insightAwareness(ctx: InsightCtx): Insight[] {
  const top = awarenessRank(ctx.responses).slice(0, 3)
  if (!top.length) return []
  const lines = top.map((x) => `'${ctx.rowLabel('Q13', x.row)}' ${pct(x.rate)}(${x.unaware}/${x.total}명)`).join(', ')
  return [mk('awareness', '인지도 낮은 제도', `'몰랐다'는 답이 많은 제도는 ${lines}예요.`, top[0].total, { row: top[0].row, rate: top[0].rate, unaware: top[0].unaware, total: top[0].total })]
}

/** Q14: 알지만 신청 못한 이유 (7번 '해당 없음' 제외) */
export function insightBarrier(ctx: InsightCtx): Insight[] {
  const { counts, answered } = countCodes(ctx.responses, 'Q14')
  const answeredReal = answered - (counts.get('7') ?? 0)
  const t = topCode(ctx.responses, 'Q14', ['7'])
  if (!t || answeredReal < MIN_K) return []
  return [mk('barrier', '신청 못한 가장 큰 이유', `제도를 알면서 신청하지 못한 가장 큰 이유는 '${ctx.optLabel('Q14', t.code)}'예요 (${t.n}/${answeredReal}명, ${pct(t.n / answeredReal)}).`, answeredReal, { code: t.code, rate: t.n / answeredReal })]
}

export function buildInsights(ctx: InsightCtx): Insight[] {
  return [
    ...insightDropoff(ctx), ...insightConversion(ctx), ...insightEngagement(ctx),
    ...insightComposition(ctx), ...insightBurden(ctx), ...insightAwareness(ctx), ...insightBarrier(ctx),
  ]
}

const BARRIER_ACTION: Record<string, string> = {
  '1': '결과 화면 첫 줄에 "내가 받을 수 있는 제도"만 먼저 보여 주고, 해당 없는 제도는 접어 두세요.',
  '2': '제도별 필요 서류 체크리스트와 "어디서 뗀다"를 한 화면에 묶어 보여 주세요(가이드북 연결).',
  '3': '내 계약 단계(N4)에 맞춰 "지금 신청 가능/잔금 후 신청" 시기 안내와 접수 일정 알림을 강조하세요.',
  '4': '탈락했을 때 다음으로 해볼 수 있는 대안 제도를 같이 추천해 주세요.',
  '5': '제도별 예상 절감액을 카드 상단에 숫자로 보여 주고, 여러 제도를 합친 금액도 안내하세요.',
}

/** 인사이트에서 파생된 구체적 액션. 근거 수치를 붙이고 우선순위순으로 정렬한다 */
export function buildSuggestions(insights: Insight[], ctx: Pick<InsightCtx, 'qTitle' | 'rowLabel' | 'clickLabel'>, events: EventRow[] = []): Suggestion[] {
  const out: Suggestion[] = []
  const by = (id: string) => insights.find((i) => i.id === id)
  const add = (s: Omit<Suggestion, 'low'>, i: Insight) => out.push({ ...s, low: i.low })

  for (const st of ['simple', 'deep']) {
    const i = by(`dropoff-${st}`)
    if (!i) continue
    const rate = Number(i.facts?.rate)
    if (rate >= 0.2) {
      const qid = String(i.facts?.qid)
      add({ id: `s-dropoff-${st}`, priority: rate >= 0.35 ? 1 : 2, from: i.id, title: `${qid} 문항 단순화`,
        action: `${qid}(${ctx.qTitle(qid)})의 문구를 짧게 줄이고 선택지 수를 줄이거나 '잘 모르겠어요'를 넣어 보세요. 안 되면 심화로 옮기는 것도 방법이에요.`,
        evidence: `${st === 'simple' ? '맛보기' : '심화'} 이탈률 ${pct(rate)} (${i.facts?.abandoned}명, 표본 ${i.n})` }, i)
    }
  }
  const conv = by('conversion')
  if (conv && Number(conv.facts?.rate) < 0.2) {
    add({ id: 's-conversion', priority: 2, from: 'conversion', title: '맛보기 끝에서 심화로 이어 주기',
      action: "맛보기 결과 화면 맨 위에 '소득 분위·자산을 넣으면 더 정확해져요' 안내와 심화 버튼을 눈에 띄게 두고, 심화가 늘려주는 제도 수를 숫자로 보여 주세요.",
      evidence: `전환율 ${pct(Number(conv.facts?.rate))} (맛보기 완료 ${conv.facts?.done}명)` }, conv)
  }
  const aw = by('awareness')
  if (aw && Number(aw.facts?.rate) >= 0.4) {
    const row = String(aw.facts?.row)
    add({ id: 's-awareness', priority: Number(aw.facts?.rate) >= 0.6 ? 1 : 2, from: 'awareness', title: '인지도 낮은 제도를 홈에서 먼저 보이기',
      action: `'${ctx.rowLabel('Q13', row)}'를 홈 지원 제도 카드 맨 앞에 두고, 한 줄 설명(누가·얼마)을 붙이세요.`,
      evidence: `'몰랐다' ${pct(Number(aw.facts?.rate))} (${aw.facts?.unaware}/${aw.facts?.total}명)` }, aw)
  }
  const bar = by('barrier')
  if (bar) {
    const code = String(bar.facts?.code)
    const action = BARRIER_ACTION[code]
    if (action) add({ id: 's-barrier', priority: Number(bar.facts?.rate) >= 0.4 ? 1 : 2, from: 'barrier', title: '신청 장벽 낮추기', action, evidence: `최다 이유 ${pct(Number(bar.facts?.rate))} (표본 ${bar.n})` }, bar)
  }
  const bu = by('burden')
  if (bu && Number(bu.facts?.rate) >= 0.5) {
    add({ id: 's-burden', priority: 2, from: 'burden', title: '월세 지원 안내를 앞쪽에',
      action: '월세 지원 계열 제도(세종 월세·청년월세)를 결과 화면 상단과 홈 첫 카드로 올리고, 월 예상 절감액을 강조하세요.',
      evidence: `주거비 부담 응답 ${pct(Number(bu.facts?.rate))} (${bu.facts?.heavy}/${bu.n}명)` }, bu)
  }
  // 첫 화면 CTA: 방문 대비 '내 상황 확인' 클릭
  const s = summarize(events)
  const cta = events.filter((e) => e.event_type === 'click' && e.name === 'hero_start_survey').length
  if (s.visitors >= LOW_N) {
    const r = Math.min(1, cta / s.visitors)
    if (r < 0.15) out.push({ id: 's-cta', priority: 3, from: 'cta', title: '첫 화면 시작 버튼 개선',
      action: "첫 화면 버튼 문구를 '3분이면 내 지원금 확인'처럼 구체적으로 바꾸거나 화면 스크롤 없이 보이게 고정해 보세요.",
      evidence: `방문 ${s.visitors}세션 중 '${ctx.clickLabel('hero_start_survey')}' 클릭 ${cta}회 (${pct(r)})`, low: false })
  }
  return out.sort((a, b) => a.priority - b.priority || Number(a.low) - Number(b.low))
}

/* ───────── 수집 상태 진단 ───────── */
export type FlowKind = 'ok' | 'no_config' | 'no_table' | 'no_permission' | 'error' | 'empty'
export interface FlowDiagnosis { kind: FlowKind; title: string; detail: string }

const ALL_EVENT_TYPES = ['page_view', 'section_view', 'click', 'survey_start', 'survey_answer', 'survey_complete', 'survey_abandon']

/** 오류 문자열(코드+메시지)로 원인을 가른다. 행이 0건이면 '빈 데이터' */
export function diagnoseFlow(p: { configured: boolean; error: string | null; events: number; responses: number }): FlowDiagnosis {
  if (!p.configured) return { kind: 'no_config', title: '연결 설정이 없어요', detail: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 비어 있어요. 배포 환경 변수를 확인해 주세요.' }
  if (p.error) {
    const e = p.error.toLowerCase()
    if (/42p01|pgrst205|does not exist|could not find the table|schema cache/.test(e))
      return { kind: 'no_table', title: '표가 아직 없어요', detail: 'events / survey_responses 표가 없어요. Supabase SQL Editor 에서 supabase/migrations/001_init.sql 을 한 번 실행해 주세요.' }
    if (/42501|permission denied|row-level security|jwt|pgrst301|pgrst302|401|403|not authorized|unauthorized/.test(e))
      return { kind: 'no_permission', title: '읽을 권한이 없어요', detail: '관리자 계정(profiles.role = admin 또는 app_metadata.role = admin)으로 로그인했는지, 이메일 인증을 마쳤는지 확인해 주세요.' }
    return { kind: 'error', title: '데이터를 읽는 중 오류가 났어요', detail: p.error }
  }
  if (p.events === 0 && p.responses === 0)
    return { kind: 'empty', title: '아직 데이터가 없어요', detail: '표와 권한은 문제없어 보이지만 기록이 0건이에요. 사이트를 한 번 열어 이벤트가 들어오는지 확인하세요. (관리자가 아닌 계정이면 RLS 때문에 0건으로 보일 수도 있어요.)' }
  return { kind: 'ok', title: '수집 중이에요', detail: '' }
}

export interface CollectionStatus { lastEventAt: string | null; last24h: number; seen: string[]; missing: string[]; responses: number; lastResponseAt: string | null }
/** 이벤트 수신 여부 체크: 마지막 수신 시각·최근 24시간 건수·아직 한 번도 안 들어온 이벤트 종류 */
export function collectionStatus(events: EventRow[], responses: ResponseRow[], now = Date.now()): CollectionStatus {
  const last = (rows: { created_at: string }[]) => rows.reduce<number>((m, r) => Math.max(m, Date.parse(r.created_at) || 0), 0)
  const le = last(events), lr = last(responses)
  const seen = ALL_EVENT_TYPES.filter((t) => events.some((e) => e.event_type === t))
  return {
    lastEventAt: le ? new Date(le).toISOString() : null,
    last24h: events.filter((e) => Date.parse(e.created_at) >= now - 86_400_000).length,
    seen, missing: ALL_EVENT_TYPES.filter((t) => !seen.includes(t)), responses: responses.length,
    lastResponseAt: lr ? new Date(lr).toISOString() : null,
  }
}

/* ───────── 주간 리포트 ───────── */
export function periodLabel(days: number | null): string { return days === null ? '전체 기간' : `최근 ${days}일` }

/** 한 장 요약 텍스트 (클립보드 복사용). events/responses 는 이미 기간 필터를 거친 것 */
export function buildReport(p: { days: number | null; events: EventRow[]; responses: ResponseRow[]; insights: Insight[]; suggestions: Suggestion[]; now?: Date }): string {
  const s = summarize(p.events)
  const d = (p.now ?? new Date()).toISOString().slice(0, 10)
  const L: string[] = [`[청정 세종] 사용 현황 리포트 · ${periodLabel(p.days)} (작성 ${d})`, '']
  L.push('■ 핵심 지표',
    `- 방문 세션 ${s.visitors} · 설문 시작 ${s.surveyStarts} · 설문 응답 ${p.responses.length}건`,
    `- 완료율: 맛보기 ${s.completeRate.simple === null ? '-' : pct(s.completeRate.simple)} / 심화 ${s.completeRate.deep === null ? '-' : pct(s.completeRate.deep)} · 평균 체류 ${fmtDur(s.avgStayMs)}`, '')
  L.push('■ 자동 인사이트')
  if (!p.insights.length) L.push('- 표시할 만큼 모인 데이터가 아직 없어요 (5명 미만 집단은 숨겨요).')
  for (const i of p.insights) L.push(`- ${i.text}${i.low ? ` (표본이 적어요: ${i.n})` : ''}`)
  L.push('', '■ 개선 제안 (우선순위순)')
  if (!p.suggestions.length) L.push('- 아직 제안할 만한 신호가 없어요.')
  p.suggestions.forEach((x, k) => L.push(`${k + 1}. [P${x.priority}] ${x.title}: ${x.action} (근거: ${x.evidence}${x.low ? ', 표본이 적어 참고용' : ''})`))
  L.push('', `※ 가명 세션 기준 집계이며 ${MIN_K}명 미만 집단은 표시하지 않아요.`)
  return L.join('\n')
}

/** 기간 필터 + 인사이트 + 제안을 한 번에 */
export function analyze(ctx: InsightCtx, days: number | null, now = Date.now()) {
  const events = inRange(ctx.events, days, now), responses = inRange(ctx.responses, days, now)
  const c = { ...ctx, events, responses }
  const insights = buildInsights(c)
  return { events, responses, insights, suggestions: buildSuggestions(insights, c, events) }
}
