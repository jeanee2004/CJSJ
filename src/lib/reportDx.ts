// 주간·월간 리포트(report_ex.pdf 구조): 지표 정의 → 한 장 요약 → 섹션별 진단 → 종합 인사이트 → 의견·AI 검색.
// 순수 함수만 둔다(화면은 pages/AdminReport.tsx). 순위는 방문 수가 아니라 행동률(클릭률)로 매긴다.
import { change, fmtDur, inRange, prevRange, summarize } from './adminStats'
import type { EventRow } from './adminStats'
import { LOW_N } from './insights'

export const SEC_ORDER = ['hero', 'ask', 'intro', 'how', 'live', 'policies', 'data'] as const
export const SEC_NAME: Record<string, string> = { hero: '히어로(첫 화면)', ask: 'AI 검색', intro: '인트로', how: '이용 방법', live: '실시간 정보', policies: '지원 제도', data: '숫자로 보기' }
const MIN_VIEWS = 10 // 섹션 노출 횟수가 이보다 적으면 성격을 정하지 않는다

/** 클릭 이름 → 그 버튼이 있는 홈 섹션 (모르면 null) */
export function sectionOfClick(name: string): string | null {
  if (/^hero_/.test(name)) return 'hero'
  if (/^ask_/.test(name)) return 'ask'
  if (/^intro_/.test(name)) return 'intro'
  if (/^(policy_|apply:)/.test(name)) return 'policies'
  if (/^live_|^address/.test(name)) return 'live'
  return null
}

/** 두 비율(c1/n1, c2/n2)이 오차 범위 안에서 같은지 (95%, 합동 비율 z 검정). 표본이 없으면 같다고 본다 */
export function withinError(c1: number, n1: number, c2: number, n2: number): boolean {
  if (n1 <= 0 || n2 <= 0) return true
  const p = (c1 + c2) / (n1 + n2)
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
  if (se === 0) return true
  return Math.abs(c1 / n1 - c2 / n2) / se < 1.96
}

export type Kind = '전환형' | '탐색형' | '이탈형' | '자료 부족'
export interface SectionDx {
  name: string; label: string
  views: number; sessions: number
  reach: number | null // 도달률 = 그 섹션을 본 세션 ÷ 방문 세션
  avgStayMs: number | null
  clicks: number
  clickRate: number | null // 클릭률 = 섹션 안 버튼 클릭 ÷ 노출 횟수
  index: number | null // 평균 대비 지수 (전체 평균 클릭률 = 100)
  kind: Kind
  low: boolean
  topButton: string | null
  summary: string; why: string[]; keep: string; change: string
}
export interface Kpi { key: string; label: string; formula: string; unit: 'count' | 'pct' | 'ms'; value: number | null; prev: number | null; delta: number | null; low: boolean }
export interface ReportDx {
  periodLabel: string
  hasData: boolean
  kpis: Kpi[]
  sections: SectionDx[] // 클릭률 순위순
  avgClickRate: number | null
  insights: string[]
  ask: { submits: number; prev: number | null; rate: number | null }
}

const rate = (a: number, b: number): number | null => (b > 0 ? Math.min(1, a / b) : null)
const sessSet = (rows: EventRow[], type: string, st?: string) => new Set(rows.filter((r) => r.event_type === type && (!st || r.survey_type === st)).map((r) => r.session_id))
export const fmtPctDx = (r: number | null, digits = 1): string => (r === null ? '-' : `${(r * 100).toFixed(digits).replace(/\.0$/, '')}%`)
export const fmtVal = (k: { unit: Kpi['unit'] }, v: number | null): string => (v === null ? '-' : k.unit === 'pct' ? fmtPctDx(v) : k.unit === 'ms' ? fmtDur(v) : String(Math.round(v)))

function kpisOf(ev: EventRow[], prev: EventRow[] | null, label: (k: string) => string): Kpi[] {
  const calc = (rows: EventRow[]) => {
    const s = summarize(rows)
    const startS = sessSet(rows, 'survey_start').size
    return {
      visitors: s.visitors, startRate: rate(startS, s.visitors), simple: s.completeRate.simple, deep: s.completeRate.deep, stay: s.avgStayMs,
      startsN: startS, applyRate: rate(sessSet(rows.filter((e) => e.event_type === 'click' && e.name?.startsWith('apply:')), 'click').size, s.visitors),
    }
  }
  const c = calc(ev), p = prev ? calc(prev) : null
  const mk = (key: string, lbl: string, formula: string, unit: Kpi['unit'], cur: number | null, old: number | null | undefined, lowN: number): Kpi =>
    ({ key, label: lbl, formula, unit, value: cur, prev: old ?? null, delta: change(cur, old ?? null), low: lowN < LOW_N })
  void label
  return [
    mk('visitors', '방문 세션', '페이지를 연 가명 세션 수', 'count', c.visitors, p?.visitors, c.visitors),
    mk('startRate', '설문 시작률', '설문 시작 세션 ÷ 방문 세션', 'pct', c.startRate, p?.startRate, c.visitors),
    mk('simple', '맛보기 완료율', '맛보기 완료 세션 ÷ 맛보기 시작 세션', 'pct', c.simple, p?.simple, c.startsN),
    mk('deep', '심화 완료율', '심화 완료 세션 ÷ 심화 시작 세션', 'pct', c.deep, p?.deep, c.startsN),
    mk('applyRate', '신청 링크 클릭률', '신청 링크를 누른 세션 ÷ 방문 세션', 'pct', c.applyRate, p?.applyRate, c.visitors),
    mk('stay', '평균 체류', '세션별 첫~마지막 이벤트 간격의 평균', 'ms', c.stay, p?.stay, c.visitors),
  ]
}

/** 섹션별 원자료 → 지표. 순위·지수·성격은 buildReportDx 에서 정한다 */
function rawSections(ev: EventRow[], visitors: number, clickLabel: (n: string) => string) {
  return SEC_ORDER.map((name) => {
    const views = ev.filter((e) => e.event_type === 'section_view' && e.name === name)
    const sessions = new Set(views.map((e) => e.session_id)).size
    const durs = views.filter((e) => e.duration_ms != null).map((e) => e.duration_ms as number)
    const clickRows = ev.filter((e) => e.event_type === 'click' && e.name && sectionOfClick(e.name) === name)
    const byName = new Map<string, number>()
    for (const c of clickRows) byName.set(c.name!, (byName.get(c.name!) ?? 0) + 1)
    const top = [...byName].sort((a, b) => b[1] - a[1])[0]
    return {
      name, label: SEC_NAME[name] ?? name, views: views.length, sessions,
      reach: rate(sessions, visitors), avgStayMs: durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null,
      clicks: clickRows.length, clickRate: views.length ? clickRows.length / views.length : null,
      topButton: top ? clickLabel(top[0]) : null,
    }
  })
}

const classify = (s: { views: number; clickRate: number | null; avgStayMs: number | null }, avgRate: number | null, avgStay: number | null): Kind => {
  if (s.views < MIN_VIEWS || s.clickRate === null || avgRate === null) return '자료 부족'
  if (s.clickRate >= avgRate && s.clickRate > 0) return '전환형'
  return avgStay !== null && s.avgStayMs !== null && s.avgStayMs >= avgStay ? '탐색형' : '이탈형'
}

function diagnose(s: Omit<SectionDx, 'summary' | 'why' | 'keep' | 'change'>, avgRate: number | null, avgStay: number | null): Pick<SectionDx, 'summary' | 'why' | 'keep' | 'change'> {
  if (s.kind === '자료 부족') {
    return {
      summary: s.views === 0 ? `이 기간에 '${s.label}'이(가) 화면에 보인 기록이 없어요.` : `노출 ${s.views}회뿐이라(기준 ${MIN_VIEWS}회) 성격을 정하기 어려워요.`,
      why: ['표본이 작아 순위나 차이를 단정하기 어렵다(오차 범위 안).'], keep: '지금 구성은 그대로 두고 데이터가 쌓일 때까지 지켜봐요.', change: '변경은 보류해요. 방문이 늘면 다시 비교해요.',
    }
  }
  const why: string[] = []
  if (s.avgStayMs !== null && avgStay !== null) why.push(`평균 체류 ${fmtDur(s.avgStayMs)}로 전체 평균(${fmtDur(avgStay)})의 ${Math.round((s.avgStayMs / avgStay) * 100)}% 수준이에요.`)
  if (s.reach !== null) why.push(`방문자의 ${fmtPctDx(s.reach, 0)}가 이 구간까지 내려왔어요${s.reach < 0.5 ? ' — 절반 미만이라 앞 구간에서 빠져나가요.' : '.'}`)
  if (s.topButton) why.push(`가장 많이 눌린 버튼은 '${s.topButton}'예요.`)
  else if (s.clicks === 0) why.push('이 구간 버튼은 한 번도 눌리지 않았어요.')
  const rateTxt = `클릭률 ${fmtPctDx(s.clickRate)}${avgRate !== null ? `(전체 평균 ${fmtPctDx(avgRate)}, 지수 ${s.index ?? '-'})` : ''}`
  const summary = `노출 ${s.views}회, ${rateTxt}, ${s.kind}이에요.`
  const base = { summary, why: why.slice(0, 3) }
  if (s.kind === '전환형') return { ...base, keep: '머물게 하고 누르게 만드는 구성이라 그대로 유지해요.', change: s.reach !== null && s.reach < 0.5 ? '도달률이 낮으니 이 구간을 더 위로 올리거나 앞에서 링크로 끌어 와요.' : '다른 섹션이 참고할 기준 구간으로 삼아요.' }
  if (s.kind === '탐색형') return { ...base, keep: '오래 읽히는 내용과 설명은 유지해요.', change: '읽은 뒤 다음 행동(설문·신청 링크) 버튼을 구간 끝에 눈에 띄게 두어요.' }
  return { ...base, keep: '제목과 핵심 문장은 다른 구간과 비교해 보기 전까지 유지해요.', change: '첫 화면 높이 안에 핵심 문장과 버튼을 두고, 길이를 줄이는 쪽으로 손봐요.' }
}

const NO_DATA = '아직 보여 줄 만큼 모인 데이터가 없어요.'

/** 리포트 계산. all 은 기간 필터 전 전체 이벤트, days 는 7(주간)·30(월간). clickLabel 은 버튼 이름 → 화면 글자 */
export function buildReportDx(p: { all: EventRow[]; days: 7 | 30; clickLabel?: (n: string) => string; now?: number }): ReportDx {
  const now = p.now ?? Date.now()
  const clickLabel = p.clickLabel ?? ((n: string) => n)
  const ev = inRange(p.all, p.days, now)
  const pv = prevRange(p.all, p.days, now)
  const kpis = kpisOf(ev, pv, clickLabel)
  const visitors = kpis[0].value ?? 0
  const raw = rawSections(ev, visitors, clickLabel)
  const measured = raw.filter((s) => s.views >= MIN_VIEWS && s.clickRate !== null)
  const avgRate = measured.length ? measured.reduce((a, s) => a + (s.clickRate as number), 0) / measured.length : null
  const stays = measured.filter((s) => s.avgStayMs !== null)
  const avgStay = stays.length ? stays.reduce((a, s) => a + (s.avgStayMs as number), 0) / stays.length : null
  const sections: SectionDx[] = raw.map((s) => {
    const kind = classify(s, avgRate, avgStay)
    const index = avgRate && s.clickRate !== null && s.views >= MIN_VIEWS ? Math.round((s.clickRate / avgRate) * 100) : null
    const part = { ...s, index, kind, low: s.views < LOW_N }
    return { ...part, ...diagnose(part, avgRate, avgStay) }
  }).sort((a, b) => (b.clickRate ?? -1) - (a.clickRate ?? -1) || b.views - a.views)

  const submits = ev.filter((e) => e.event_type === 'click' && e.name === 'ask_submit').length
  const prevSubmits = pv.length ? pv.filter((e) => e.event_type === 'click' && e.name === 'ask_submit').length : null
  const ask = { submits, prev: prevSubmits, rate: rate(sessSet(ev.filter((e) => e.event_type === 'click' && e.name === 'ask_submit'), 'click').size, visitors) }

  const insights: string[] = []
  const hasData = ev.length > 0
  if (hasData) {
    const rank = sections.filter((s) => s.kind !== '자료 부족')
    if (rank.length >= 2) {
      const top = rank[0], bot = rank[rank.length - 1]
      const same = withinError(Math.round((top.clickRate ?? 0) * top.views), top.views, Math.round((bot.clickRate ?? 0) * bot.views), bot.views)
      insights.push(`행동률 1위는 '${top.label}'(${fmtPctDx(top.clickRate)}), 최하위는 '${bot.label}'(${fmtPctDx(bot.clickRate)})예요. ${same ? '표본이 작아 오차 범위 안이라 차이를 단정하기 어려워요.' : '두 구간의 차이는 오차 범위를 넘어 우연으로 보기 어려워요.'}`)
    } else insights.push(`섹션을 비교할 만큼(노출 ${MIN_VIEWS}회 이상) 모인 구간이 ${rank.length}개뿐이라 순위는 아직 정하지 않아요.`)
    const sr = kpis[1], cs = kpis[2]
    if (sr.value !== null) insights.push(`방문 세션 ${Math.round(kpis[0].value ?? 0)}개 중 ${fmtPctDx(sr.value)}가 설문을 시작했고${cs.value !== null ? `, 맛보기 완료율은 ${fmtPctDx(cs.value)}예요` : ''}. ${sr.low ? `방문이 ${LOW_N}개 미만이라 오차 범위 안이라 차이를 단정하기 어려워요.` : '방문 규모는 비교할 만해요.'}`)
    const reached = sections.filter((s) => s.reach !== null && s.views >= MIN_VIEWS).sort((a, b) => (a.reach as number) - (b.reach as number))[0]
    if (reached && (reached.reach as number) < 0.5) insights.push(`'${reached.label}'까지 내려온 방문자는 ${fmtPctDx(reached.reach, 0)}뿐이에요. 앞 구간에서 빠져나가는 것이 이 구간의 성과보다 먼저예요.`)
    const moved = kpis.filter((k) => k.delta !== null && !k.low).sort((a, b) => Math.abs(b.delta as number) - Math.abs(a.delta as number))[0]
    if (moved) insights.push(`전 기간 대비 가장 크게 움직인 지표는 ${moved.label}(${(moved.delta as number) > 0 ? '▲' : '▼'}${Math.abs(Math.round((moved.delta as number) * 100))}%)예요.`)
    if (submits > 0) insights.push(`AI 검색 질문은 ${submits}회예요. 저장된 답과 AI 답의 구분은 아직 수집하지 않아요.`)
  }
  if (!insights.length) insights.push(NO_DATA)
  return { periodLabel: p.days === 7 ? '주간(최근 7일)' : '월간(최근 30일)', hasData, kpis, sections, avgClickRate: avgRate, insights: insights.slice(0, 4), ask }
}

/** 복사·AI 다듬기 입력용 텍스트(규칙 기반 문장 그대로) */
export function reportText(dx: ReportDx, feedbackLines: string[] = [], now = new Date()): string {
  const L: string[] = [`[청정 세종] ${dx.periodLabel} 리포트 (작성 ${now.toISOString().slice(0, 10)})`, '', '■ 지표 정의']
  for (const k of dx.kpis) L.push(`- ${k.label} = ${k.formula}`)
  L.push('- 섹션 클릭률 = 섹션 안 버튼 클릭 ÷ 섹션 노출 횟수 · 평균 대비 지수 = 전체 평균 클릭률을 100으로 환산', '', '■ 한 장 요약')
  for (const k of dx.kpis) L.push(`- ${k.label} ${fmtVal(k, k.value)}${k.delta === null ? '' : ` (전 기간 대비 ${k.delta > 0 ? '▲' : '▼'}${Math.abs(Math.round(k.delta * 100))}%)`}${k.low ? ' · 표본 적음' : ''}`)
  L.push('', '■ 섹션 순위 (행동률 기준)')
  dx.sections.forEach((s, i) => L.push(`${i + 1}. ${s.label} · 노출 ${s.views} · 클릭률 ${fmtPctDx(s.clickRate)} · 지수 ${s.index ?? '-'} · ${s.kind}`))
  L.push('', '■ 섹션별 진단')
  for (const s of dx.sections) L.push(`[${s.label}] ${s.summary}`, ...s.why.map((w) => `  · ${w}`), `  유지: ${s.keep}`, `  변경: ${s.change}`)
  L.push('', '■ 종합 인사이트', ...dx.insights.map((x) => `- ${x}`))
  if (feedbackLines.length) L.push('', '■ 의견 요약', ...feedbackLines.map((x) => `- ${x}`))
  L.push('', '※ 가명 세션 기준 집계예요. 표본이 작은 구간의 차이는 단정하지 않아요.')
  return L.join('\n')
}
