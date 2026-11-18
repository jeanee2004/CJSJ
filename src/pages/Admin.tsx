import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { QUESTIONS, SIMPLE_IDS } from '../data/survey'
import { ALL_TIME, change, clickRank, daily, dailyInPeriod, distribution, fmtDay, fmtDur, fmtPct, funnel, inPeriod, parseDay, periodFromDates, periodFromDays, periodText, prevPeriod, sectionAvg, shiftYears, summarize } from '../lib/adminStats'
import type { Bar, EventRow, Period, ResponseRow, SurveyFilter } from '../lib/adminStats'
import { analyze, collectionStatus, diagnoseFlow } from '../lib/insights'
import type { Insight, Suggestion } from '../lib/insights'
import { FeedbackPanel, useFeedback } from './AdminFeedback'
import { ReportView } from './AdminReport'
import './Admin.css'

const PAGE = 1000
const MAX_ROWS = 50_000

const SECTION_LABEL: Record<string, string> = { hero: '히어로(첫 화면)', intro: '인트로', ask: 'AI 검색', how: '이용 방법', live: '실시간 정보', policies: '지원 제도', data: '숫자로 보기' }
const CLICK_LABEL: Record<string, string> = {
  hero_start_survey: '첫 화면 · 내 상황 확인', hero_search: '첫 화면 · 검색하기', intro_policies: '인트로 · 지원 제도 둘러보기', intro_past_result: '인트로 · 지난 결과 보기',
  policy_card_open: '지원 제도 카드 열기', policy_filter: '지원 제도 필터', glossary_fab: '돋보기(용어 사전)', glossary_terms: '돋보기 · 용어 사전',
  guidebook_open: '돋보기 · 가이드북', login_open: '로그인 열기', nav_diagnose: '메뉴 · 내 상황 확인', nav_survey: '메뉴 · 내 상황 확인', nav_feedback: '메뉴 · 의견 남기기', ask_submit: 'AI 검색 · 질문하기',
}
const nameOf = (m: Record<string, string>) => (k: string) => m[k] ?? (k.startsWith('apply:') ? `신청 링크 · ${k.slice(6)}` : k.startsWith('feedback:') ? `의견 · ${k.slice(9)}` : k.startsWith('ask_policy:') ? `AI 검색 · 제도 ${k.slice(11)}` : k.startsWith('ask_link:') ? `AI 검색 · 공식 링크 ${k.slice(9)}` : k.startsWith('ask_section:') ? `AI 검색 · 화면 ${k.slice(12)}` : k)

type Table = 'events' | 'survey_responses'
const TOTAL_CAP = 200_000

/** 한 테이블을 1000행씩 최대 MAX_ROWS 까지 읽는다(최신순). bounds 로 [gte, lt) 범위만 읽을 수 있다. 막히면 지금까지 읽은 행과 오류를 돌려준다 */
async function fetchAll<T extends { created_at: string }>(table: Table, cols: string, signal: { stop: boolean }, bounds: { gte?: string; lt?: string } = {}): Promise<{ rows: T[]; truncated: boolean; error: string | null }> {
  const rows: T[] = []
  if (!supabase) return { rows, truncated: false, error: '연결 설정이 없어요' }
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    if (signal.stop) break
    let q = supabase.from(table).select(cols)
    if (bounds.gte) q = q.gte('created_at', bounds.gte)
    if (bounds.lt) q = q.lt('created_at', bounds.lt)
    const { data, error } = await q.order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    if (error) return { rows, truncated: false, error: `${error.code ?? ''} ${error.message}`.trim() }
    rows.push(...((data ?? []) as unknown as T[]))
    if (!data || data.length < PAGE) return { rows, truncated: false, error: null }
  }
  return { rows, truncated: rows.length >= MAX_ROWS, error: null }
}

interface DataState { events: EventRow[]; responses: ResponseRow[]; loading: boolean; loadingOlder: boolean; capped: boolean; error: string | null; oldestE: string | null; oldestR: string | null }
const oldestOf = (rows: { created_at: string }[], truncated: boolean) => (truncated && rows.length ? rows[rows.length - 1].created_at : null)

/** 처음엔 최신 MAX_ROWS 행. 한도에 막혀 오래된 행이 남아 있고 needSince(필요한 가장 이른 시각)가 그보다 이르면, 그 앞 구간을 더 읽어 이어 붙인다 */
function useData(needSince: number | null) {
  const [state, setState] = useState<DataState>({ events: [], responses: [], loading: true, loadingOlder: false, capped: false, error: null, oldestE: null, oldestR: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const sig = { stop: false }
    setState((s) => ({ ...s, loading: true, error: null }))
    void (async () => {
      const [e, r] = await Promise.all([
        fetchAll<EventRow>('events', 'session_id,event_type,name,survey_type,duration_ms,device,created_at', sig),
        fetchAll<ResponseRow>('survey_responses', 'survey_type,answers,created_at', sig),
      ])
      if (sig.stop) return
      setState({ events: e.rows, responses: r.rows, loading: false, loadingOlder: false, capped: false, error: e.error || r.error, oldestE: oldestOf(e.rows, e.truncated), oldestR: oldestOf(r.rows, r.truncated) })
    })()
    return () => { sig.stop = true }
  }, [tick])

  const { loading, oldestE, oldestR } = state
  useEffect(() => {
    if (loading || needSince === null) return
    const needE = oldestE !== null && needSince < Date.parse(oldestE)
    const needR = oldestR !== null && needSince < Date.parse(oldestR)
    if (!needE && !needR) return
    const sig = { stop: false }
    const gte = new Date(needSince).toISOString()
    setState((s) => ({ ...s, loadingOlder: true }))
    void (async () => {
      const [e, r] = await Promise.all([
        needE ? fetchAll<EventRow>('events', 'session_id,event_type,name,survey_type,duration_ms,device,created_at', sig, { gte, lt: oldestE! }) : null,
        needR ? fetchAll<ResponseRow>('survey_responses', 'survey_type,answers,created_at', sig, { gte, lt: oldestR! }) : null,
      ])
      if (sig.stop) return
      setState((s) => {
        const events = e ? [...s.events, ...e.rows] : s.events
        const responses = r ? [...s.responses, ...r.rows] : s.responses
        // 오류가 나면 같은 요청을 무한히 되풀이하지 않도록 더 읽기를 멈춘다. 총량 상한에 닿아도 마찬가지
        const stopE = !!e?.error || events.length >= TOTAL_CAP
        const stopR = !!r?.error || responses.length >= TOTAL_CAP
        return {
          ...s, events, responses, loadingOlder: false, capped: s.capped || ((stopE || stopR) && !(e?.error || r?.error)), error: e?.error || r?.error || s.error,
          oldestE: e ? (stopE ? null : oldestOf(e.rows, e.truncated)) : s.oldestE,
          oldestR: r ? (stopR ? null : oldestOf(r.rows, r.truncated)) : s.oldestR,
        }
      })
    })()
    return () => { sig.stop = true }
  }, [needSince, loading, oldestE, oldestR])
  return { ...state, truncated: oldestE !== null || oldestR !== null || state.capped, reload: () => setTick((t) => t + 1) }
}

/* ───────── 작은 차트들 (가벼운 HTML/SVG) ───────── */
function Card({ title, take, children, table, w = 6 }: { title: string; take?: string; children: React.ReactNode; table?: [string, string][]; w?: 4 | 6 | 8 | 12 }) {
  return (
    <section className={`adm-card w${w}`}>
      <h3>{title}</h3>
      {take && <p className="adm-take">{take}</p>}
      {children}
      {table && table.length > 0 && (
        <details className="adm-table">
          <summary>표로 보기</summary>
          <table><tbody>{table.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>
        </details>
      )}
    </section>
  )
}
const Empty = ({ children = '아직 모인 데이터가 없어요.' }: { children?: React.ReactNode }) => <p className="adm-empty">{children}</p>

function HBars({ rows, fmt, label = (k: string) => k }: { rows: Bar[]; fmt: (n: number) => string; label?: (k: string) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="adm-bars">
      {rows.map((r) => (
        <li key={r.name} title={`${label(r.name)}: ${fmt(r.value)} (${r.n}건)`}>
          <span className="adm-bl">{label(r.name)}</span>
          <span className="adm-bt"><i style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} /></span>
          <b>{fmt(r.value)}</b>
        </li>
      ))}
    </ul>
  )
}

function Line({ data }: { data: { day: string; visitors: number; starts: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = 220, L = 34, R = 12, T = 12, B = 26
  const max = Math.max(...data.map((d) => d.visitors), 1)
  const step = (W - L - R) / Math.max(1, data.length - 1)
  const x = (i: number) => (data.length === 1 ? (W + L - R) / 2 : L + i * step)
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const path = (k: 'visitors' | 'starts') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join('')
  const labelIdx = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])]
  const h = hover !== null ? data[hover] : null
  return (
    <>
      <div className="adm-legend"><span><i className="s1" />방문 세션</span><span><i className="s2" />설문 시작</span></div>
      <div className="adm-line">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="일별 방문 세션과 설문 시작 수" onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round((px - L) / step)))) }}>
          {[0, 0.5, 1].map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="grid" /><text x={L - 6} y={y(max * t) + 4} textAnchor="end" className="tick">{Math.round(max * t)}</text></g>)}
          <path d={path('visitors')} className="l1" /><path d={path('starts')} className="l2" />
          {data.length <= 31 && data.map((d, i) => <g key={d.day}><circle cx={x(i)} cy={y(d.visitors)} r="3.5" className="d1" /><circle cx={x(i)} cy={y(d.starts)} r="3.5" className="d2" /></g>)}
          {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="tick">{data[i].day.slice(5)}</text>)}
          {h && <line x1={x(hover!)} x2={x(hover!)} y1={T} y2={H - B} className="cross" />}
        </svg>
        {h && <div className="adm-tip" style={{ left: `${(x(hover!) / W) * 100}%` }}><b>{h.day}</b><span>방문 세션 {h.visitors}</span><span>설문 시작 {h.starts}</span></div>}
      </div>
    </>
  )
}

function Funnel({ rows, title }: { rows: ReturnType<typeof funnel>; title: (id: string) => string }) {
  const max = Math.max(...rows.map((r) => r.answered + r.abandoned), 1)
  return (
    <>
      <div className="adm-legend"><span><i className="s1" />답하고 넘어감</span><span><i className="s2" />여기서 그만둠</span></div>
      <ul className="adm-bars adm-funnel">
        {rows.map((r) => (
          <li key={r.id} title={`${r.id} ${title(r.id)}: 답함 ${r.answered}, 이탈 ${r.abandoned}`}>
            <span className="adm-bl"><em>{r.id}</em> {title(r.id)}</span>
            <span className="adm-bt">
              <i style={{ width: `${(r.answered / max) * 100}%` }} />
              {r.abandoned > 0 && <i className="ab" style={{ width: `${Math.max(2, (r.abandoned / max) * 100)}%` }} />}
            </span>
            <b>{r.answered}<small> / {r.abandoned}</small></b>
          </li>
        ))}
      </ul>
    </>
  )
}

const labelsOf = (qid: string) => {
  const q = QUESTIONS.find((x) => x.id === qid)
  const m: Record<string, string> = { unk: '잘 모르겠어요' }
  q?.opts?.forEach((o) => { m[o.v] = o.t })
  return m
}
const shortTitle = (id: string) => {
  const t = QUESTIONS.find((q) => q.id === id)?.title ?? ''
  return t.length > 22 ? `${t.slice(0, 22)}…` : t
}
const DIST: [string, string][] = [['Q1', '나이대'], ['Q5', '월 소득 구간'], ['Q6', '현재 사는 집 종류'], ['Q7', '점유 형태']]


/* ───────── 인사이트·제안·리포트·수집 상태 (계산은 lib/insights.ts, 여기는 표시만) ───────── */
const INSIGHT_CTX = {
  order: { simple: QUESTIONS.map((q) => q.id).filter((id) => SIMPLE_IDS.includes(id)), deep: QUESTIONS.map((q) => q.id) },
  qTitle: (id: string) => QUESTIONS.find((q) => q.id === id)?.title ?? id,
  optLabel: (qid: string, code: string) => labelsOf(qid)[code] ?? code,
  rowLabel: (qid: string, row: string) => QUESTIONS.find((q) => q.id === qid)?.rows?.find((r) => r.k === row)?.t ?? row,
  sectionLabel: nameOf(SECTION_LABEL),
  clickLabel: nameOf(CLICK_LABEL),
}

/** 요약 타일: 큰 숫자 + 전 기간 대비 증감(▲▼). 증감은 '이전 기간이 있을 때'만 보인다 */
function Kpi({ label, value, delta, unit = '%', bar, hint }: { label: string; value: string; delta?: number | null; unit?: '%' | '%p'; bar?: number | null; hint?: string }) {
  const d = delta === undefined ? undefined : delta
  const up = d !== null && d !== undefined && d > 0.0049
  const down = d !== null && d !== undefined && d < -0.0049
  const num = d === null || d === undefined ? '' : `${Math.abs(unit === '%p' ? d * 100 : d * 100).toFixed(unit === '%p' ? 1 : 0)}${unit}`
  return (
    <div className="adm-kpi">
      <span className="adm-kl">{label}</span>
      <b>{value}</b>
      {bar !== undefined && bar !== null && <i className="adm-kbar" aria-hidden="true"><u style={{ width: `${Math.round(bar * 100)}%` }} /></i>}
      {d !== undefined && (
        <span className={`adm-kd ${up ? 'up' : down ? 'down' : ''}`}>
          {d === null ? '비교할 이전 기간 없음' : <><span aria-hidden="true">{up ? '▲' : down ? '▼' : '–'}</span><span className="sr-only">{up ? '증가' : down ? '감소' : '변화 없음'}</span> {num} <small>전 기간 대비</small></>}
        </span>
      )}
      {hint && <span className="adm-kd">{hint}</span>}
    </div>
  )
}

function InsightList({ items }: { items: Insight[] }) {
  return (
    <ul className="adm-insights">
      {items.map((i) => (
        <li key={i.id}>
          <b>{i.title}</b>
          <p>{i.text}</p>
          {i.low && <span className="adm-low">표본이 적어요 (n={i.n}) · 참고만 해 주세요</span>}
        </li>
      ))}
    </ul>
  )
}

function SuggestionList({ items }: { items: Suggestion[] }) {
  return (
    <ol className="adm-sugs">
      {items.map((s) => (
        <li key={s.id}>
          <span className={`adm-pri p${s.priority}`}>P{s.priority}</span>
          <div>
            <b>{s.title}</b>
            <p>{s.action}</p>
            <small>근거: {s.evidence}{s.low ? ' · 표본이 적어 참고용' : ''}</small>
          </div>
        </li>
      ))}
    </ol>
  )
}

function FlowPanel({ error, events, responses }: { error: string | null; events: EventRow[]; responses: ResponseRow[] }) {
  const d = diagnoseFlow({ configured: !!supabase, error, events: events.length, responses: responses.length })
  const st = collectionStatus(events, responses)
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR') : '없음')
  return (
    <section className="adm-card adm-flow" role="status">
      <h3>{d.title}</h3>
      <p className="adm-take">{d.detail}</p>
      <ul className="adm-checks">
        <li data-ok={d.kind !== 'no_config'}>연결 설정</li>
        <li data-ok={d.kind !== 'no_table' && d.kind !== 'no_config'}>표 존재</li>
        <li data-ok={d.kind !== 'no_permission' && d.kind !== 'no_table' && d.kind !== 'no_config'}>읽기 권한</li>
        <li data-ok={st.last24h > 0}>최근 24시간 이벤트 수신 {st.last24h}건 (마지막 {when(st.lastEventAt)})</li>
        <li data-ok={st.responses > 0}>설문 응답 {st.responses}건 (마지막 {when(st.lastResponseAt)})</li>
      </ul>
      {st.missing.length > 0 && st.seen.length > 0 && <p className="adm-note">아직 한 번도 안 들어온 이벤트: {st.missing.join(', ')}</p>}
    </section>
  )
}

/* ───────── 연도별 비교 (최대 3개년: 기준 기간 + 1년 전 + 2년 전의 같은 달·일 구간) ───────── */
interface Win { tag: string; period: Period }
const YEAR_TAG = ['기준', '1년 전', '2년 전']

function MultiLine({ series }: { series: { name: string; points: { day: string; v: number }[] }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = 220, L = 34, R = 12, T = 12, B = 26
  const len = Math.max(...series.map((s) => s.points.length), 1)
  const max = Math.max(...series.flatMap((s) => s.points.map((p) => p.v)), 1)
  const step = (W - L - R) / Math.max(1, len - 1)
  const x = (i: number) => (len === 1 ? (W + L - R) / 2 : L + i * step)
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const labelIdx = [...new Set([0, Math.floor((len - 1) / 2), len - 1])]
  const base = series[0]?.points ?? []
  return (
    <>
      <div className="adm-legend">{series.map((s, i) => <span key={s.name}><i className={`y${i}`} />{s.name}</span>)}</div>
      <div className="adm-line">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="연도별 일별 방문 세션 비교" onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(len - 1, Math.round((px - L) / step)))) }}>
          {[0, 0.5, 1].map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="grid" /><text x={L - 6} y={y(max * t) + 4} textAnchor="end" className="tick">{Math.round(max * t)}</text></g>)}
          {series.map((s, i) => <path key={s.name} className={`ly ly${i}`} d={s.points.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(p.v).toFixed(1)}`).join('')} />)}
          {labelIdx.map((i) => base[i] && <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === len - 1 ? 'end' : 'middle'} className="tick">{base[i].day.slice(5)}</text>)}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="cross" />}
        </svg>
        {hover !== null && (
          <div className="adm-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            {series.map((s) => <span key={s.name}>{s.points[hover] ? `${s.points[hover].day} · 방문 ${s.points[hover].v}` : `${s.name} · -`}</span>)}
          </div>
        )}
      </div>
    </>
  )
}

function YearCompare({ wins, events, responses, sf, now }: { wins: Win[]; events: EventRow[]; responses: ResponseRow[]; sf: SurveyFilter; now: number }) {
  const cols = useMemo(() => wins.map((w) => {
    const ev = inPeriod(events, w.period)
    const sm = summarize(ev)
    const apply = new Set(ev.filter((e) => e.event_type === 'click' && e.name?.startsWith('apply:')).map((e) => e.session_id)).size
    const resp = inPeriod(responses, w.period).filter((r) => sf === 'all' || r.survey_type === sf).length
    return { w, sm, apply, resp, line: dailyInPeriod(events, w.period, now) }
  }), [wins, events, responses, sf, now])

  type Row = { label: string; get: (c: (typeof cols)[number]) => number | null; fmt: (n: number | null) => string; pp?: boolean }
  const num = (n: number | null) => (n === null ? '-' : n.toLocaleString())
  const rows: Row[] = [
    { label: '방문 세션', get: (c) => c.sm.visitors, fmt: num },
    { label: '설문 시작', get: (c) => c.sm.surveyStarts, fmt: num },
    { label: '맛보기 완료율', get: (c) => c.sm.completeRate.simple, fmt: fmtPct, pp: true },
    { label: '심화 완료율', get: (c) => c.sm.completeRate.deep, fmt: fmtPct, pp: true },
    { label: '신청 링크 클릭', get: (c) => c.apply, fmt: num },
    { label: '평균 체류', get: (c) => c.sm.avgStayMs, fmt: fmtDur },
    { label: '설문 응답(건)', get: (c) => c.resp, fmt: num },
  ]
  const diff = (r: Row, other: (typeof cols)[number]) => {
    const a = r.get(cols[0]), b = r.get(other)
    if (a === null || b === null) return '-'
    if (r.pp) { const d = (a - b) * 100; return `${d > 0.04 ? '▲' : d < -0.04 ? '▼' : '–'} ${Math.abs(d).toFixed(1)}%p` }
    const d = change(a, b)
    return d === null ? '-' : `${d > 0.0049 ? '▲' : d < -0.0049 ? '▼' : '–'} ${Math.abs(d * 100).toFixed(0)}%`
  }
  const chart = cols.filter((c) => c.line.length > 0)
  return (
    <>
      <div className="adm-grid adm-noprint">
        <Card w={12} title="연도별 핵심 지표" take={`같은 달·일 구간을 연도별로 나란히 놓았어요. 기준 기간 대비 증감(▲▼)은 기준 − 비교 연도예요.`}>
          <div className="adm-scroll">
            <table className="adm-rank adm-cmp">
              <thead>
                <tr><th scope="col">지표</th>{cols.map((c) => <th scope="col" key={c.w.tag}>{c.w.tag}<small>{periodText(c.w.period, now)}</small></th>)}{cols.slice(1).map((c) => <th scope="col" key={`d${c.w.tag}`}>기준 vs {c.w.tag}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}><th scope="row">{r.label}</th>{cols.map((c, i) => <td key={c.w.tag} className={i === 0 ? 'adm-base' : ''}>{r.fmt(r.get(c))}</td>)}{cols.slice(1).map((c) => <td key={`d${c.w.tag}`}>{diff(r, c)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card w={12} title="일별 방문 세션 겹쳐 보기" take="각 연도 구간의 첫날을 맞춰 겹쳐 그렸어요. 실선이 기준 기간이에요. 날짜는 선에 올려 보면 나와요.">
          {chart.length ? <MultiLine series={chart.map((c) => ({ name: `${c.w.tag} (${periodText(c.w.period, now)})`, points: c.line.map((d) => ({ day: d.day, v: d.visitors })) }))} /> : <Empty>기간이 너무 길어 그래프는 그리지 않았어요(800일 이하만 그려요). 위 표를 보세요.</Empty>}
        </Card>
      </div>
      {cols.every((c) => c.sm.visitors === 0) && <p className="adm-note adm-noprint">고른 연도 구간에 모인 방문 기록이 아직 없어요. 서비스를 시작하기 전 기간은 비어 있는 게 정상이에요.</p>}
    </>
  )
}

/* ───────── CSV ───────── */
function CsvBox({ period, label }: { period: Period; label: string }) {
  const [type, setType] = useState<'simple' | 'deep' | 'all'>('all')
  const [useRange, setUseRange] = useState(true)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true); setMsg(null)
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      if (!token) throw new Error('로그인이 만료됐어요. 다시 로그인해 주세요.')
      const q = new URLSearchParams({ type })
      if (useRange && period.from !== null) q.set('from', new Date(period.from).toISOString())
      if (useRange && period.to !== null) q.set('to', new Date(period.to - 1).toISOString())
      const res = await fetch(`/api/admin-export?${q}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        let m = `내려받지 못했어요 (${res.status})`
        try { const j = await res.json(); if (j?.message) m = j.message } catch { /* noop */ }
        throw new Error(m)
      }
      const blob = await res.blob()
      const d = new Date()
      const name = `cjsj_survey_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = name
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      setMsg({ ok: true, t: `${name} 을 내려받았어요.` })
    } catch (e) {
      setMsg({ ok: false, t: e instanceof Error ? e.message : '내려받지 못했어요' })
    } finally { setBusy(false) }
  }
  return (
    <div className="adm-csv">
      <label>설문<select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="all">전체</option><option value="simple">맛보기</option><option value="deep">심화</option></select></label>
      <label>기간<select value={useRange ? 'sel' : 'all'} onChange={(e) => setUseRange(e.target.value === 'sel')}><option value="sel">대시보드에서 고른 기간 ({label})</option><option value="all">전체</option></select></label>
      <button type="button" className="adm-btn" onClick={download} disabled={busy}>{busy ? '만드는 중…' : 'CSV 내려받기'}</button>
      {msg && <p role="status" className={msg.ok ? 'adm-ok' : 'adm-err'}>{msg.t}</p>}
    </div>
  )
}

/* ───────── 화면 ───────── */
export default function Admin() {
  const { user } = useStore()
  // user 는 비동기로 채워지므로, 잠깐 기다린 뒤에도 관리자가 아니면 홈으로 보낸다
  const [waited, setWaited] = useState(false)
  useEffect(() => { const t = setTimeout(() => setWaited(true), 3000); return () => clearTimeout(t) }, [])
  if (!supabase) return <Navigate to="/" replace />
  if (user && !user.isAdmin) return <Navigate to="/" replace />
  if (!user) return waited ? <Navigate to="/" replace /> : <main className="adm wrap"><p className="adm-empty">관리자 확인 중이에요…</p></main>
  return <Dashboard />
}

function Dashboard() {
  type Mode = '7' | '30' | 'all' | 'custom'
  const [mode, setMode] = useState<Mode>('7')
  const [start, setStartRaw] = useState(() => fmtDay(Date.now() - 29 * 86_400_000))
  const [end, setEndRaw] = useState(() => fmtDay(Date.now()))
  // 직접 설정한 날짜가 잘못되면(시작이 종료보다 늦음 등) 직전의 올바른 기간을 그대로 쓰고 안내만 띄운다
  const [custom, setCustom] = useState<Period>(() => periodFromDates(fmtDay(Date.now() - 29 * 86_400_000), fmtDay(Date.now()))!)
  const setDates = (a: string, b: string) => { setStartRaw(a); setEndRaw(b); const p = periodFromDates(a, b); if (p) setCustom(p) }
  const [cmpYears, setCmpYears] = useState<0 | 1 | 2>(0)
  const [sf, setSf] = useState<SurveyFilter>('all')
  const [now, setNow] = useState(() => Date.now())

  const dateError = mode === 'custom' && !periodFromDates(start, end) ? (parseDay(start) === null || parseDay(end) === null ? '날짜를 YYYY-MM-DD 형식으로 입력해 주세요.' : '시작일이 종료일보다 늦어요.') : null
  const period = useMemo<Period>(() => {
    if (mode === 'all') return ALL_TIME
    if (mode === 'custom') return custom
    return periodFromDays(mode === '7' ? 7 : 30, now)
  }, [mode, custom, now])

  const bounded = period.from !== null
  const years = bounded ? cmpYears : 0
  const prevP = useMemo(() => prevPeriod(period, now), [period, now])
  const wins = useMemo<Win[]>(() => Array.from({ length: years + 1 }, (_, i) => ({ tag: YEAR_TAG[i], period: i === 0 ? period : shiftYears(period, i, now) })), [period, years, now])
  // 불러와야 하는 가장 이른 시각: 기준 기간·직전 기간·비교 연도 구간 중 가장 이른 시작 (전체 기간이면 제한 없음)
  const needSince = useMemo(() => {
    if (!bounded) return null
    const froms = [period.from!, ...(prevP ? [prevP.from!] : []), ...wins.map((w) => w.period.from!)]
    return Math.min(...froms)
  }, [bounded, period, prevP, wins])
  const { events, responses, loading, loadingOlder, error, truncated, reload } = useData(needSince)

  const label = mode === 'all' ? '전체 기간' : mode === 'custom' ? `${periodText(period, now)}` : `최근 ${mode}일`
  const refresh = () => { setNow(Date.now()); reload() }
  const ev = useMemo(() => inPeriod(events, period), [events, period])
  const rs = useMemo(() => inPeriod(responses, period), [responses, period])
  const sum = useMemo(() => summarize(ev), [ev])
  const secs = useMemo(() => sectionAvg(ev), [ev])
  const clicks = useMemo(() => clickRank(ev), [ev])
  const dl = useMemo(() => daily(ev), [ev])
  const ftype = sf === 'deep' ? 'deep' : 'simple'
  const order = useMemo(() => QUESTIONS.map((q) => q.id).filter((id) => (ftype === 'simple' ? SIMPLE_IDS.includes(id) : true)), [ftype])
  const fun = useMemo(() => funnel(ev, order, ftype), [ev, order, ftype])
  const an = useMemo(() => analyze({ ...INSIGHT_CTX, events: ev, responses: rs }, null), [ev, rs])
  const fb = useFeedback()
  const prevEv = useMemo(() => (prevP ? inPeriod(events, prevP) : []), [events, prevP])
  const psum = useMemo(() => summarize(prevEv), [prevEv])
  const countApply = (rows: typeof ev) => new Set(rows.filter((e) => e.event_type === 'click' && e.name?.startsWith('apply:')).map((e) => e.session_id)).size
  const pApplyN = countApply(prevEv)
  const hasPrev = prevP !== null
  const prevDays = prevP ? Math.round((prevP.to! - prevP.from!) / 86_400_000) : 0
  const rateDelta = (a: number | null, b: number | null) => (hasPrev ? (a === null || b === null ? null : a - b) : undefined)
  const applyN = new Set(ev.filter((e) => e.event_type === 'click' && e.name?.startsWith('apply:')).map((e) => e.session_id)).size
  const respN = rs.filter((r) => sf === 'all' || r.survey_type === sf).length
  const none = !loading && events.length === 0 && responses.length === 0

  return (
    <main className="adm">
      <header className="adm-head adm-noprint">
       <div className="adm-in adm-head-in">
        <div>
          <p className="adm-kicker">청정 세종 · 운영 성과 보고</p>
          <h1>사용 현황 대시보드</h1>
          <p className="adm-sub">{label} 기준{mode !== 'all' && mode !== 'custom' ? ` (${periodText(period, now)})` : ''} · 이름·이메일 없이 가명 세션으로만 집계 · 관리자 전용</p>
        </div>
        <div className="adm-filters">
          <div role="group" aria-label="기간">
            {([['7', '7일'], ['30', '30일'], ['all', '전체'], ['custom', '직접 설정']] as [Mode, string][]).map(([m, t]) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{t}</button>)}
          </div>
          <div role="group" aria-label="설문 종류">
            {([['all', '전체'], ['simple', '맛보기'], ['deep', '심화']] as [SurveyFilter, string][]).map(([k, t]) => <button key={k} type="button" aria-pressed={sf === k} onClick={() => setSf(k)}>{t}</button>)}
          </div>
          <button type="button" className="adm-btn ghost" onClick={refresh} disabled={loading}>새로고침</button>
          <a className="adm-btn ghost" href="#adm-csv">CSV 내보내기</a>
        </div>
        <div className="adm-filters adm-filters2">
          {mode === 'custom' && (
            <div className="adm-range" role="group" aria-label="기간 직접 설정">
              <label>시작일<input type="date" value={start} max={end || undefined} onChange={(e) => setDates(e.target.value, end)} /></label>
              <span aria-hidden="true">~</span>
              <label>종료일<input type="date" value={end} min={start || undefined} max={fmtDay(now)} onChange={(e) => setDates(start, e.target.value)} /></label>
            </div>
          )}
          <div className="adm-range" role="group" aria-label="연도 비교">
            <label>연도 비교
              <select value={years} disabled={!bounded} onChange={(e) => setCmpYears(Number(e.target.value) as 0 | 1 | 2)}>
                <option value={0}>비교 안 함</option>
                <option value={1}>1년 전과 (2개년)</option>
                <option value={2}>2년 전까지 (3개년)</option>
              </select>
            </label>
          </div>
          {!bounded && <span className="adm-hint">전체 기간은 연도 비교를 할 수 없어요. 기간을 정해 주세요.</span>}
          {dateError && <span className="adm-hint adm-hint-err" role="alert">{dateError} 직전의 올바른 기간으로 보여 주고 있어요.</span>}
        </div>
       </div>
      </header>
      <div className="adm-in">

      {loading && <p className="adm-empty" role="status">불러오는 중이에요…</p>}
      {error && <p className="adm-err" role="alert">데이터를 모두 읽지 못했어요: {error}</p>}
      {(none || error) && !loading && <FlowPanel error={error} events={events} responses={responses} />}

      <section className="adm-sec adm-noprint" aria-label="핵심 지표">
        <h2 className="adm-h2">핵심 지표<small>{hasPrev ? `직전 ${prevDays}일과 비교` : '전체 기간 합계'}</small></h2>
        <div className="adm-cards">
          <Kpi label="방문 세션" value={sum.visitors.toLocaleString()} delta={hasPrev ? change(sum.visitors, psum.visitors) : undefined} />
          <Kpi label="설문 시작" value={sum.surveyStarts.toLocaleString()} delta={hasPrev ? change(sum.surveyStarts, psum.surveyStarts) : undefined} />
          <Kpi label="맛보기 완료율" value={fmtPct(sum.completeRate.simple)} bar={sum.completeRate.simple} delta={rateDelta(sum.completeRate.simple, psum.completeRate.simple)} unit="%p" />
          <Kpi label="심화 완료율" value={fmtPct(sum.completeRate.deep)} bar={sum.completeRate.deep} delta={rateDelta(sum.completeRate.deep, psum.completeRate.deep)} unit="%p" />
          <Kpi label="신청 링크 클릭" value={applyN.toLocaleString()} delta={hasPrev ? change(applyN, pApplyN) : undefined} />
          <Kpi label="평균 체류" value={fmtDur(sum.avgStayMs)} delta={hasPrev ? change(sum.avgStayMs, psum.avgStayMs) : undefined} />
        </div>
      </section>

      {!none && <h2 className="adm-h2 adm-noprint">핵심 인사이트 · 개선 제안<small>규칙으로 뽑은 요약과 우선순위</small></h2>}
      {!none && (
        <div className="adm-grid adm-noprint">
          <section className="adm-card w6">
            <h3>자동 인사이트</h3>
            <p className="adm-take">{label} 데이터에서 규칙으로 뽑은 문장이에요. 5명 미만 집단은 숨기고, 표본이 30 미만이면 표시해요.</p>
            {an.insights.length ? <InsightList items={an.insights} /> : <Empty>아직 보여 줄 만큼 모이지 않았어요. 기간을 늘려 보세요.</Empty>}
          </section>
          <section className="adm-card w6">
            <h3>개선 제안</h3>
            <p className="adm-take">인사이트에서 나온 할 일이에요. 위에서부터 먼저 하면 좋아요.</p>
            {an.suggestions.length ? <SuggestionList items={an.suggestions} /> : <Empty>아직 제안할 만한 신호가 없어요.</Empty>}
          </section>
        </div>
      )}

      <h2 className="adm-h2 adm-noprint">행동 · 설문 분석<small>어디서 머물고, 무엇을 누르고, 어디서 그만두는지</small></h2>
      <div className="adm-grid adm-noprint">
        <Card w={8} title="일별 추이" take="하루에 몇 세션이 방문하고 설문을 시작했는지예요." table={dl.map((d) => [d.day, `방문 ${d.visitors} · 시작 ${d.starts}`])}>
          {dl.length ? <Line data={dl} /> : <Empty />}
        </Card>
        <Card w={4} title="섹션별 평균 체류" take="홈에서 각 부분이 화면에 보인 평균 시간이에요." table={secs.map((s) => [SECTION_LABEL[s.name] ?? s.name, `${fmtDur(s.value)} (${s.n}회)`])}>
          {secs.length ? <HBars rows={secs} fmt={fmtDur} label={nameOf(SECTION_LABEL)} /> : <Empty />}
        </Card>
        <Card title="버튼 클릭 순위" take="많이 눌린 버튼 상위 10개예요." table={clicks.map((c) => [CLICK_LABEL[c.name] ?? c.name, `${c.value}회`])}>
          {clicks.length ? <HBars rows={clicks} fmt={(n) => `${n}회`} label={nameOf(CLICK_LABEL)} /> : <Empty />}
        </Card>
        <Card title={`${ftype === 'simple' ? '맛보기' : '심화'} 설문 문항별 이탈`} take="막대 뒤쪽 분홍이 그 문항에서 그만둔 세션이에요. 숫자는 답함 / 이탈." table={fun.map((r) => [`${r.id} ${shortTitle(r.id)}`, `답함 ${r.answered} · 이탈 ${r.abandoned}`])}>
          {fun.length ? <Funnel rows={fun} title={shortTitle} /> : <Empty />}
        </Card>
        {DIST.map(([qid, name]) => {
          const d = distribution(rs, qid, labelsOf(qid), sf)
          const ordered = Object.keys(labelsOf(qid)).map((k) => labelsOf(qid)[k]).filter((l) => d.some((x) => x.name === l)).map((l) => d.find((x) => x.name === l)!)
          const rows = [...ordered, ...d.filter((x) => !ordered.includes(x))]
          return (
            <Card w={4} key={qid} title={`응답 분포 · ${name}`} take={`${qid} · 응답 ${respN.toLocaleString()}건 기준이에요.`} table={rows.map((r) => [r.name, `${r.n}명`])}>
              {rows.length ? <HBars rows={rows} fmt={(n) => `${n}명`} /> : <Empty />}
            </Card>
          )
        })}
      </div>

      {years > 0 && (
        <>
          <h2 className="adm-h2 adm-noprint">연도별 비교<small>{years + 1}개년 · 같은 달·일 구간끼리</small></h2>
          {loadingOlder && <p className="adm-empty adm-noprint" role="status">이전 연도 기록을 불러오는 중이에요…</p>}
          <YearCompare wins={wins} events={events} responses={responses} sf={sf} now={now} />
        </>
      )}

      <p className="adm-note adm-noprint">
        ※ 브라우저에서 계산하는 화면이라 이벤트와 설문 응답 각각 최근 {MAX_ROWS.toLocaleString()}행까지만 읽어요{truncated ? ' (이번에 한도에 닿아 오래된 기록은 빠졌어요)' : ''}.
        평균 체류는 세션의 첫 기록~마지막 기록 간격이에요(기록이 2개 이상인 세션만). 많아지면 SQL 집계로 옮겨야 해요.
      </p>

      <h2 className="adm-h2 adm-noprint">의견 · 리포트<small>이용자가 남긴 의견과 한 장 요약</small></h2>
      <FeedbackPanel period={period} rows={fb.rows} err={fb.err} />
      {!none && <ReportView events={events} feedback={fb.rows} clickLabel={INSIGHT_CTX.clickLabel} period={period} label={mode === 'all' ? '전체 기간' : mode === '7' ? '주간(최근 7일)' : mode === '30' ? '월간(최근 30일)' : `기간(${periodText(period, now)})`} />}

      <section className="adm-card adm-noprint" id="adm-csv">
        <h3>설문 원자료 CSV</h3>
        <p className="adm-take">이름·이메일 없이 가명 ID와 구간 값만 들어 있어요. 내려받은 기록은 로그로 남아요.</p>
        <CsvBox period={period} label={label} />
      </section>
      </div>
    </main>
  )
}
