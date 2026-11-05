import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { inRange } from '../lib/adminStats'
import type { EventRow } from '../lib/adminStats'
import { buildReportDx, fmtPctDx, fmtVal, reportText } from '../lib/reportDx'
import { summarizeFeedback } from '../lib/feedbackSummary'
import type { FeedbackRow } from '../lib/feedbackSummary'

type Ai = { state: 'idle' | 'loading' | 'ok' | 'none' | 'error'; text?: string; msg?: string }
const AI_MSG: Record<string, string> = {
  NO_AI_KEY: 'AI 키가 아직 서버에 없어요. 아래 규칙 기반 리포트는 그대로 쓸 수 있어요.',
  RATE_LIMIT: '시간당 호출 한도에 닿았어요. 잠시 뒤 다시 눌러 주세요.',
  AI_ERROR: 'AI가 지금 답하지 못했어요(무료 사용량이 찼을 수 있어요). 규칙 기반 리포트를 쓰세요.',
}

/** 주간·월간 리포트: ①지표 정의 ②한 장 요약 ③섹션별 진단 ④종합 인사이트 ⑤의견·AI 검색 (report_ex.pdf 구조) */
export function ReportView({ events, feedback, clickLabel }: { events: EventRow[]; feedback: FeedbackRow[] | null; clickLabel: (n: string) => string }) {
  const [days, setDays] = useState<7 | 30>(7)
  const dx = useMemo(() => buildReportDx({ all: events, days, clickLabel }), [events, days, clickLabel])
  const fb = useMemo(() => summarizeFeedback(inRange(feedback ?? [], days)), [feedback, days])
  const text = useMemo(() => reportText(dx, fb.lines), [dx, fb])
  const [msg, setMsg] = useState<string | null>(null)
  const [ai, setAi] = useState<Ai>({ state: 'idle' })
  const today = new Date().toISOString().slice(0, 10)

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setMsg('복사했어요. 메신저나 메일에 붙여 넣으세요.') }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
      let ok = false
      try { ok = document.execCommand('copy') } catch { /* noop */ }
      ta.remove(); setMsg(ok ? '복사했어요.' : '복사하지 못했어요. 아래 글을 직접 선택해 복사해 주세요.')
    }
  }
  const polish = async () => {
    setAi({ state: 'loading' })
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      const res = await fetch('/api/report-summary', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token ?? ''}` }, body: JSON.stringify({ text }) })
      const body = (await res.json()) as { ai?: string | null; reason?: string; message?: string }
      setAi(body.ai ? { state: 'ok', text: body.ai } : { state: 'none', msg: AI_MSG[body.reason ?? 'AI_ERROR'] ?? body.message ?? AI_MSG.AI_ERROR })
    } catch { setAi({ state: 'error', msg: AI_MSG.AI_ERROR }) }
  }
  const arrow = (d: number | null) => (d === null ? null : <span className={`adm-delta ${d >= 0 ? 'up' : 'down'}`}>{d >= 0 ? '▲' : '▼'}{Math.abs(Math.round(d * 100))}%</span>)

  return (
    <section className="adm-card adm-report adm-print" aria-label={`${dx.periodLabel} 리포트`}>
      <div className="adm-noprint adm-rhead">
        <div>
          <h3>{dx.periodLabel} 리포트</h3>
          <p className="adm-take">지표 정의 → 한 장 요약 → 섹션별 진단 → 종합 인사이트 순서예요. 순위는 방문 수가 아니라 행동률(클릭률)로 매겨요.</p>
        </div>
        <div className="adm-seg" role="group" aria-label="리포트 기간">
          {([[7, '주간'], [30, '월간']] as [7 | 30, string][]).map(([d, t]) => <button key={d} type="button" aria-pressed={days === d} onClick={() => { setDays(d); setAi({ state: 'idle' }) }}>{t}</button>)}
        </div>
      </div>
      <div className="adm-noprint adm-csv">
        <button type="button" className="adm-btn" onClick={() => void copy()}>요약 복사</button>
        <button type="button" className="adm-btn ghost" onClick={() => window.print()}>인쇄 / PDF</button>
        <button type="button" className="adm-btn ghost" onClick={() => void polish()} disabled={ai.state === 'loading' || !dx.hasData}>{ai.state === 'loading' ? 'AI가 다듬는 중…' : 'AI로 리포트 다듬기'}</button>
        {msg && <p role="status" className="adm-ok">{msg}</p>}
      </div>

      <div className="adm-page">
        <header className="adm-rtitle"><b>청정 세종 · {dx.periodLabel} 리포트</b><span>작성 {today} · 가명 세션 집계</span></header>
        <h4 className="adm-rh">① 지표 정의</h4>
        <dl className="adm-defs">
          {dx.kpis.map((k) => <div key={k.key}><dt>{k.label}</dt><dd>{k.formula}</dd></div>)}
          <div><dt>섹션 클릭률</dt><dd>섹션 안 버튼 클릭 ÷ 섹션 노출 횟수</dd></div>
          <div><dt>평균 대비 지수</dt><dd>섹션 평균 클릭률을 100으로 환산</dd></div>
        </dl>

        <h4 className="adm-rh">② 한 장 요약</h4>
        {!dx.hasData && <p className="adm-empty">이 기간에는 아직 보여 줄 데이터가 없어요.</p>}
        <div className="adm-rkpis">
          {dx.kpis.map((k) => (
            <div key={k.key} className="adm-rk">
              <span>{k.label}</span>
              <b>{fmtVal(k, k.value)}</b>
              <small>{arrow(k.delta) ?? '전 기간 비교 없음'}{k.low ? ' · 표본 적음' : ''}</small>
            </div>
          ))}
        </div>
        <div className="adm-scroll">
          <table className="adm-rank">
            <caption>섹션 순위 · 기준 = 클릭률 (점선: 전체 평균 {fmtPctDx(dx.avgClickRate)})</caption>
            <thead><tr><th>순위</th><th>섹션</th><th>노출</th><th>도달률</th><th>평균 체류</th><th>클릭</th><th>클릭률</th><th>지수</th><th>성격</th></tr></thead>
            <tbody>
              {dx.sections.map((s, i) => (
                <tr key={s.name} data-kind={s.kind}>
                  <td>{i + 1}</td><th scope="row">{s.label}</th><td>{s.views}</td><td>{fmtPctDx(s.reach, 0)}</td>
                  <td>{s.avgStayMs === null ? '-' : fmtVal({ unit: 'ms' }, s.avgStayMs)}</td><td>{s.clicks}</td><td>{fmtPctDx(s.clickRate)}</td>
                  <td>{s.index ?? '-'}</td><td><span className={`adm-kind k-${s.kind === '전환형' ? 'a' : s.kind === '탐색형' ? 'b' : s.kind === '이탈형' ? 'c' : 'd'}`}>{s.kind}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-page">
        <h4 className="adm-rh">③ 섹션별 진단</h4>
        <div className="adm-dx">
          {dx.sections.map((s) => (
            <article key={s.name} className="adm-dxc">
              <header><b>{s.label}</b><span className={`adm-kind k-${s.kind === '전환형' ? 'a' : s.kind === '탐색형' ? 'b' : s.kind === '이탈형' ? 'c' : 'd'}`}>{s.kind}</span></header>
              <p className="adm-dxs">{s.summary}</p>
              <ol className="adm-why" aria-label="무엇이 갈렸나">{s.why.map((w) => <li key={w}>{w}</li>)}</ol>
              <p className="adm-act"><b>유지</b>{s.keep}</p>
              <p className="adm-act"><b>변경</b>{s.change}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="adm-page">
        <h4 className="adm-rh">④ 종합 인사이트</h4>
        <ol className="adm-sum">{dx.insights.map((x) => <li key={x}>{x}</li>)}</ol>
        <h4 className="adm-rh">⑤ 의견 · AI 검색</h4>
        <ul className="adm-sum">
          <li>AI 검색 질문 {dx.ask.submits}회{dx.ask.prev !== null ? ` (직전 기간 ${dx.ask.prev}회)` : ''}{dx.ask.rate !== null ? ` · 방문 세션의 ${fmtPctDx(dx.ask.rate)}가 질문` : ''}. 저장된 답과 AI 답의 구분은 아직 수집하지 않아요.</li>
          {fb.total === 0 ? <li>이 기간에 받은 의견이 없어요.</li> : fb.lines.map((l) => <li key={l}>{l}</li>)}
        </ul>
        {ai.state === 'ok' && <div className="adm-ai"><b>AI 서술 요약</b><p>{ai.text}</p></div>}
        {(ai.state === 'none' || ai.state === 'error') && <p className="adm-note adm-noprint" role="status">{ai.msg}</p>}
        <p className="adm-foot">※ 표본이 작은 구간의 차이는 단정하지 않아요. 5명 미만 집단은 표시하지 않아요.</p>
      </div>
    </section>
  )
}
