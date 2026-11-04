import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { QUESTIONS, SIMPLE_IDS } from '../data/survey'
import { clickRank, daily, distribution, fmtDur, fmtPct, funnel, inRange, sectionAvg, summarize } from '../lib/adminStats'
import type { Bar, EventRow, ResponseRow, SurveyFilter } from '../lib/adminStats'
import { analyze, collectionStatus, diagnoseFlow, buildReport, periodLabel } from '../lib/insights'
import type { Insight, Suggestion } from '../lib/insights'
import './Admin.css'

const PAGE = 1000
const MAX_ROWS = 50_000

const SECTION_LABEL: Record<string, string> = { hero: '히어로(첫 화면)', intro: '인트로', how: '이용 방법', live: '실시간 정보', policies: '지원 제도', data: '숫자로 보기' }
const CLICK_LABEL: Record<string, string> = {
  hero_start_survey: '첫 화면 · 내 상황 확인', intro_policies: '인트로 · 지원 제도 둘러보기', intro_past_result: '인트로 · 지난 결과 보기',
  policy_card_open: '지원 제도 카드 열기', policy_filter: '지원 제도 필터', glossary_fab: '돋보기(용어 사전)', glossary_terms: '돋보기 · 용어 사전',
  guidebook_open: '돋보기 · 가이드북', login_open: '로그인 열기', nav_diagnose: '메뉴 · 내 상황 확인', nav_feedback: '메뉴 · 의견 남기기',
}
const nameOf = (m: Record<string, string>) => (k: string) => m[k] ?? k

/** 한 테이블을 1000행씩 최대 MAX_ROWS 까지 읽는다(최신순). 막히면 지금까지 읽은 행과 오류를 돌려준다 */
async function fetchAll<T>(table: 'events' | 'survey_responses', cols: string, signal: { stop: boolean }): Promise<{ rows: T[]; truncated: boolean; error: string | null }> {
  const rows: T[] = []
  if (!supabase) return { rows, truncated: false, error: '연결 설정이 없어요' }
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    if (signal.stop) break
    const { data, error } = await supabase.from(table).select(cols).order('created_at', { ascending: false }).range(from, from + PAGE - 1)
    if (error) return { rows, truncated: false, error: `${error.code ?? ''} ${error.message}`.trim() }
    rows.push(...((data ?? []) as unknown as T[]))
    if (!data || data.length < PAGE) return { rows, truncated: false, error: null }
  }
  return { rows, truncated: rows.length >= MAX_ROWS, error: null }
}

function useData() {
  const [state, setState] = useState<{ events: EventRow[]; responses: ResponseRow[]; loading: boolean; error: string | null; truncated: boolean }>({ events: [], responses: [], loading: true, error: null, truncated: false })
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
      setState({ events: e.rows, responses: r.rows, loading: false, error: e.error || r.error, truncated: e.truncated || r.truncated })
    })()
    return () => { sig.stop = true }
  }, [tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}

/* ───────── 작은 차트들 (가벼운 HTML/SVG) ───────── */
function Card({ title, take, children, table }: { title: string; take?: string; children: React.ReactNode; table?: [string, string][] }) {
  return (
    <section className="adm-card">
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

function ReportCard({ days, text }: { days: number | null; text: string }) {
  const [msg, setMsg] = useState<string | null>(null)
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setMsg('복사했어요. 메신저나 메일에 붙여 넣으세요.') }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
      let ok = false
      try { ok = document.execCommand('copy') } catch { /* noop */ }
      ta.remove(); setMsg(ok ? '복사했어요.' : '복사하지 못했어요. 아래 글을 직접 선택해 복사해 주세요.')
    }
  }
  return (
    <section className="adm-card adm-report adm-print">
      <h3>주간 리포트 · {periodLabel(days)}</h3>
      <p className="adm-take adm-noprint">위쪽에서 고른 기간 기준 한 장 요약이에요. 복사하거나 인쇄(PDF 저장)할 수 있어요.</p>
      <div className="adm-noprint adm-csv">
        <button type="button" className="adm-btn" onClick={copy}>요약 복사</button>
        <button type="button" className="adm-btn ghost" onClick={() => window.print()}>인쇄 / PDF</button>
        {msg && <p role="status" className="adm-ok">{msg}</p>}
      </div>
      <pre className="adm-pre">{text}</pre>
    </section>
  )
}

/* ───────── CSV ───────── */
function CsvBox() {
  const [type, setType] = useState<'simple' | 'deep' | 'all'>('all')
  const [days, setDays] = useState<'7' | '30' | 'all'>('all')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true); setMsg(null)
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      if (!token) throw new Error('로그인이 만료됐어요. 다시 로그인해 주세요.')
      const q = new URLSearchParams({ type })
      if (days !== 'all') q.set('from', new Date(Date.now() - Number(days) * 86_400_000).toISOString())
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
      <label>기간<select value={days} onChange={(e) => setDays(e.target.value as typeof days)}><option value="7">최근 7일</option><option value="30">최근 30일</option><option value="all">전체</option></select></label>
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
  const { events, responses, loading, error, truncated, reload } = useData()
  const [days, setDays] = useState<number | null>(7)
  const [sf, setSf] = useState<SurveyFilter>('all')

  const ev = useMemo(() => inRange(events, days), [events, days])
  const rs = useMemo(() => inRange(responses, days), [responses, days])
  const sum = useMemo(() => summarize(ev), [ev])
  const secs = useMemo(() => sectionAvg(ev), [ev])
  const clicks = useMemo(() => clickRank(ev), [ev])
  const dl = useMemo(() => daily(ev), [ev])
  const ftype = sf === 'deep' ? 'deep' : 'simple'
  const order = useMemo(() => QUESTIONS.map((q) => q.id).filter((id) => (ftype === 'simple' ? SIMPLE_IDS.includes(id) : true)), [ftype])
  const fun = useMemo(() => funnel(ev, order, ftype), [ev, order, ftype])
  const an = useMemo(() => analyze({ ...INSIGHT_CTX, events, responses }, days), [events, responses, days])
  const report = useMemo(() => buildReport({ days, events: an.events, responses: an.responses, insights: an.insights, suggestions: an.suggestions }), [an, days])
  const respN = rs.filter((r) => sf === 'all' || r.survey_type === sf).length
  const none = !loading && events.length === 0 && responses.length === 0

  return (
    <main className="adm wrap">
      <header className="adm-head adm-noprint">
        <div>
          <h1>사용 현황 대시보드</h1>
          <p className="adm-take">이름·이메일 없이 가명 세션으로만 모은 숫자예요. 관리자만 볼 수 있어요.</p>
        </div>
        <div className="adm-filters">
          <div role="group" aria-label="기간">
            {([[7, '7일'], [30, '30일'], [null, '전체']] as [number | null, string][]).map(([d, t]) => <button key={t} type="button" aria-pressed={days === d} onClick={() => setDays(d)}>{t}</button>)}
          </div>
          <div role="group" aria-label="설문 종류">
            {([['all', '전체'], ['simple', '맛보기'], ['deep', '심화']] as [SurveyFilter, string][]).map(([k, t]) => <button key={k} type="button" aria-pressed={sf === k} onClick={() => setSf(k)}>{t}</button>)}
          </div>
          <button type="button" className="adm-btn ghost" onClick={reload} disabled={loading}>새로고침</button>
        </div>
      </header>

      {loading && <p className="adm-empty" role="status">불러오는 중이에요…</p>}
      {error && <p className="adm-err" role="alert">데이터를 모두 읽지 못했어요: {error}</p>}
      {(none || error) && !loading && <FlowPanel error={error} events={events} responses={responses} />}

      <div className="adm-cards adm-noprint">
        <div><small>방문 세션</small><b>{sum.visitors.toLocaleString()}</b></div>
        <div><small>설문 시작</small><b>{sum.surveyStarts.toLocaleString()}</b></div>
        <div><small>맛보기 완료율</small><b>{fmtPct(sum.completeRate.simple)}</b></div>
        <div><small>심화 완료율</small><b>{fmtPct(sum.completeRate.deep)}</b></div>
        <div><small>평균 체류</small><b>{fmtDur(sum.avgStayMs)}</b></div>
      </div>

      {!none && (
        <div className="adm-grid adm-noprint">
          <section className="adm-card">
            <h3>자동 인사이트</h3>
            <p className="adm-take">{periodLabel(days)} 데이터에서 규칙으로 뽑은 문장이에요. 5명 미만 집단은 숨기고, 표본이 30 미만이면 표시해요.</p>
            {an.insights.length ? <InsightList items={an.insights} /> : <Empty>아직 보여 줄 만큼 모이지 않았어요. 기간을 늘려 보세요.</Empty>}
          </section>
          <section className="adm-card">
            <h3>개선 제안</h3>
            <p className="adm-take">인사이트에서 나온 할 일이에요. 위에서부터 먼저 하면 좋아요.</p>
            {an.suggestions.length ? <SuggestionList items={an.suggestions} /> : <Empty>아직 제안할 만한 신호가 없어요.</Empty>}
          </section>
        </div>
      )}

      <div className="adm-grid adm-noprint">
        <Card title="일별 추이" take="하루에 몇 세션이 방문하고 설문을 시작했는지예요." table={dl.map((d) => [d.day, `방문 ${d.visitors} · 시작 ${d.starts}`])}>
          {dl.length ? <Line data={dl} /> : <Empty />}
        </Card>
        <Card title="섹션별 평균 체류" take="홈에서 각 부분이 화면에 보인 평균 시간이에요." table={secs.map((s) => [SECTION_LABEL[s.name] ?? s.name, `${fmtDur(s.value)} (${s.n}회)`])}>
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
            <Card key={qid} title={`응답 분포 · ${name}`} take={`${qid} · 응답 ${respN.toLocaleString()}건 기준이에요.`} table={rows.map((r) => [r.name, `${r.n}명`])}>
              {rows.length ? <HBars rows={rows} fmt={(n) => `${n}명`} /> : <Empty />}
            </Card>
          )
        })}
      </div>

      <p className="adm-note adm-noprint">
        ※ 브라우저에서 계산하는 화면이라 이벤트와 설문 응답 각각 최근 {MAX_ROWS.toLocaleString()}행까지만 읽어요{truncated ? ' (이번에 한도에 닿아 오래된 기록은 빠졌어요)' : ''}.
        평균 체류는 세션의 첫 기록~마지막 기록 간격이에요(기록이 2개 이상인 세션만). 많아지면 SQL 집계로 옮겨야 해요.
      </p>

      {!none && <ReportCard days={days} text={report} />}

      <section className="adm-card adm-noprint">
        <h3>설문 원자료 CSV</h3>
        <p className="adm-take">이름·이메일 없이 가명 ID와 구간 값만 들어 있어요. 내려받은 기록은 로그로 남아요.</p>
        <CsvBox />
      </section>
    </main>
  )
}
