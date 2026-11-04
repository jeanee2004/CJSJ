import { Fragment, useState } from 'react'
import { GUIDE } from '../data/guidebook'
import { TERM_MAP } from '../data/terms'
import './Guidebook.css'

const KEY = 'cjsj.guide.v1'
type Done = Record<string, number[]>

function load(): Done {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch { return {} }
}
function save(d: Done) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* 저장 실패해도 화면은 동작 */ }
}

/** 용어 링크를 눌러 사전에 갔다가 돌아와도 보던 단계를 유지 */
let lastCur: number | null = null

/** 본문의 [[id]] / [[id|글자]] 를 용어 사전 링크로 바꾼다 */
function Rich({ text, onTerm }: { text: string; onTerm: (id: string) => void }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/)
        if (!m) return <Fragment key={i}>{p}</Fragment>
        const t = TERM_MAP[m[1]]
        if (!t) return <Fragment key={i}>{m[2] ?? m[1]}</Fragment>
        return <button key={i} type="button" className="gb-term" onClick={() => onTerm(t.id)} title="용어 사전에서 보기">{m[2] ?? t.word.replace(/ \(.*\)/, '')}</button>
      })}
    </>
  )
}

/** 왕초보 가이드북: 단계 목록(진행 표시) → 단계 상세 */
export function Guidebook({ onTerm }: { onTerm: (id: string) => void }) {
  const [cur, setCurState] = useState<number | null>(lastCur)
  const [done, setDone] = useState<Done>(load)
  const setCur = (n: number | null) => { lastCur = n; setCurState(n) }
  const count = (id: string) => (done[id] ?? []).length
  const toggle = (id: string, i: number) => {
    const set = new Set(done[id] ?? [])
    if (set.has(i)) set.delete(i); else set.add(i)
    const next = { ...done, [id]: [...set].sort((a, b) => a - b) }
    setDone(next)
    save(next)
  }
  if (cur === null) {
    const total = GUIDE.reduce((n, s) => n + s.todo.length, 0)
    const got = GUIDE.reduce((n, s) => n + Math.min(count(s.id), s.todo.length), 0)
    return (
      <>
        <p className="gb-total" role="status">전체 진행 {got} / {total}개 체크</p>
        <ol className="gb-list">
          {GUIDE.map((s, i) => {
            const c = Math.min(count(s.id), s.todo.length)
            return (
              <li key={s.id}>
                <button type="button" className="gb-item" onClick={() => setCur(i)}>
                  <span className={'gb-num' + (c === s.todo.length ? ' ok' : '')}>{c === s.todo.length ? '✓' : i + 1}</span>
                  <span className="gb-item-t"><b>{s.title}</b><small>{s.lead}</small></span>
                  <span className="gb-prog">{c}/{s.todo.length}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </>
    )
  }
  const s = GUIDE[cur]
  const checked = new Set(done[s.id] ?? [])
  return (
    <article className="gb-step">
      <p className="gb-count">{cur + 1} / {GUIDE.length}</p>
      <h3>{s.title}</h3>
      <p className="gb-lead"><b>한 줄 요약</b> {s.lead}</p>
      <ul className="gb-points">{s.points.map((p, i) => <li key={i}><Rich text={p} onTerm={onTerm} /></li>)}</ul>
      {s.table && (
        <div className="gb-tablewrap" role="region" aria-label={s.table.caption ?? '비교표'} tabIndex={0}>
          <table className="gb-table">
            {s.table.caption && <caption>{s.table.caption}</caption>}
            <thead><tr>{s.table.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {s.example && <p className="gb-ex">{s.example}</p>}
      <section className="gb-todo" aria-label="해야 할 일 체크리스트">
        <h4>해야 할 일 <span>{Math.min(checked.size, s.todo.length)}/{s.todo.length}</span></h4>
        <ul>{s.todo.map((t, i) => (
          <li key={i}><label><input type="checkbox" checked={checked.has(i)} onChange={() => toggle(s.id, i)} /><span>{t}</span></label></li>
        ))}</ul>
      </section>
      <section className="gb-mistakes" aria-label="흔한 실수">
        <h4>흔한 실수</h4>
        <ul>{s.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul>
      </section>
      {s.tip && <p className="gb-tip"><b>꿀팁</b> {s.tip}</p>}
      <p className="gb-rel"><b>관련 용어</b> {s.related.map((id) => TERM_MAP[id] && <button key={id} type="button" className="gb-term" onClick={() => onTerm(id)}>{TERM_MAP[id].word.replace(/ \(.*\)/, '')}</button>)}</p>
      <p className="gb-src"><b>출처</b> {s.sources.map((r, i) => <Fragment key={r.url}>{i > 0 && ' · '}<a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a></Fragment>)}</p>
      <div className="gb-nav">
        <button type="button" onClick={() => setCur(null)}>목록</button>
        <button type="button" disabled={cur === 0} onClick={() => setCur(cur - 1)}>이전</button>
        <button type="button" className="primary" disabled={cur === GUIDE.length - 1} onClick={() => setCur(cur + 1)}>다음</button>
      </div>
    </article>
  )
}
