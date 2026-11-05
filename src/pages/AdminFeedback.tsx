import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { summarizeFeedback } from '../lib/feedbackSummary'
import type { FeedbackRow } from '../lib/feedbackSummary'

type Ai = { state: 'idle' | 'loading' | 'ok' | 'none' | 'error'; text?: string; reason?: string }
const AI_NOTE: Record<string, string> = {
  NO_AI_KEY: 'AI 요약을 쓰려면 Vercel 환경변수에 GEMINI_API_KEY 를 넣어 주세요. 그 전에는 아래 기본 요약이 보여요.',
  AI_ERROR: 'AI 요약을 불러오지 못했어요. 기본 요약을 보여 드려요.',
  EMPTY: '아직 의견이 없어요.',
}

/** 의견 목록을 한 번 읽는다(대시보드 의견 패널과 리포트가 함께 쓴다) */
export function useFeedback(): { rows: FeedbackRow[] | null; err: string | null } {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let off = false
    void (async () => {
      if (!supabase) return
      const { data, error } = await supabase.from('feedback').select('choices, comment, created_at').order('created_at', { ascending: false }).limit(1000)
      if (off) return
      if (error) { setErr(error.code === 'PGRST205' ? '의견 저장 표가 아직 없어요. supabase/migrations/002_feedback.sql 을 실행해 주세요.' : '의견을 불러오지 못했어요.'); setRows([]) }
      else setRows((data ?? []) as FeedbackRow[])
    })()
    return () => { off = true }
  }, [])
  return { rows, err }
}

/** 관리자 대시보드: 의견 남기기 모음 — 기본 집계 요약은 항상, AI 요약은 버튼으로 */
export function FeedbackPanel({ days, rows, err }: { days: number | null; rows: FeedbackRow[] | null; err: string | null }) {
  const [ai, setAi] = useState<Ai>({ state: 'idle' })

  const shown = useMemo(() => {
    if (!rows) return []
    if (days === null) return rows
    const from = Date.now() - days * 86_400_000
    return rows.filter((r) => Date.parse(r.created_at) >= from)
  }, [rows, days])
  const sum = useMemo(() => summarizeFeedback(shown), [shown])

  const askAi = async () => {
    setAi({ state: 'loading' })
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      const res = await fetch('/api/feedback-summary', { headers: { Authorization: `Bearer ${token ?? ''}` } })
      const body = (await res.json()) as { ai: string | null; reason?: string }
      setAi(body.ai ? { state: 'ok', text: body.ai } : { state: 'none', reason: body.reason })
    } catch { setAi({ state: 'error' }) }
  }

  return (
    <section className="adm-card adm-feedback adm-noprint">
      <h3>의견 남기기 모음{rows ? ` · ${sum.total}건` : ''}</h3>
      <p className="adm-take">“집 구할 때 가장 마음 쓰이는 비용”(복수 선택)과 직접 남긴 한마디예요. 위에서 고른 기간 기준이에요.</p>
      {rows === null && <p className="adm-empty">불러오는 중…</p>}
      {err && <p className="adm-err" role="status">{err}</p>}
      {rows && !err && sum.total === 0 && <p className="adm-empty">이 기간에는 아직 의견이 없어요.</p>}
      {sum.total > 0 && (
        <>
          <ul className="adm-insights"><li><b>자동 요약</b>{sum.lines.map((l) => <p key={l}>{l}</p>)}</li></ul>
          <ul className="adm-bars">
            {sum.ranking.map((r) => (
              <li key={r.id}><span className="adm-bl">{r.label}</span><span className="adm-bt"><i style={{ width: `${Math.max(2, r.pct)}%` }} /></span><b>{r.pct}%<small> · {r.n}명</small></b></li>
            ))}
          </ul>
          <div className="adm-csv">
            <button type="button" className="adm-btn" onClick={() => void askAi()} disabled={ai.state === 'loading'}>{ai.state === 'loading' ? 'AI가 읽는 중…' : 'AI로 의견 요약하기'}</button>
          </div>
          {ai.state === 'ok' && <ul className="adm-insights"><li><b>AI 요약</b><p style={{ whiteSpace: 'pre-line' }}>{ai.text}</p></li></ul>}
          {ai.state === 'none' && <p className="adm-note" role="status">{AI_NOTE[ai.reason ?? 'AI_ERROR'] ?? AI_NOTE.AI_ERROR}</p>}
          {ai.state === 'error' && <p className="adm-note" role="status">{AI_NOTE.AI_ERROR}</p>}
          {sum.comments.length > 0 && (
            <details className="adm-table">
              <summary>직접 남긴 한마디 {sum.comments.length}건 보기</summary>
              <ul className="adm-comments">{sum.comments.slice(0, 50).map((c, i) => <li key={i}>{c}</li>)}</ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}
