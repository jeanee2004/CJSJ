import { Fragment, useState } from 'react'
import { GUIDE } from '../data/guidebook'
import { TERM_MAP } from '../data/terms'
import './Guidebook.css'

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

/** 왕초보 가이드북: 단계 목록 → 단계 상세 */
export function Guidebook({ onTerm }: { onTerm: (id: string) => void }) {
  const [cur, setCur] = useState<number | null>(null)
  if (cur === null) {
    return (
      <ol className="gb-list">
        {GUIDE.map((s, i) => (
          <li key={s.id}>
            <button type="button" className="gb-item" onClick={() => setCur(i)}>
              <span className="gb-num">{i + 1}</span>
              <span><b>{s.title}</b><small>{s.lead}</small></span>
            </button>
          </li>
        ))}
      </ol>
    )
  }
  const s = GUIDE[cur]
  return (
    <article className="gb-step">
      <p className="gb-count">{cur + 1} / {GUIDE.length}</p>
      <h3>{s.title}</h3>
      <p className="gb-lead">{s.lead}</p>
      <ul>{s.points.map((p, i) => <li key={i}><Rich text={p} onTerm={onTerm} /></li>)}</ul>
      {s.tip && <p className="gb-tip"><b>꿀팁</b> {s.tip}</p>}
      <p className="gb-src"><b>출처</b> {s.sources.map((r, i) => <Fragment key={r.url}>{i > 0 && ' · '}<a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a></Fragment>)}</p>
      <div className="gb-nav">
        <button type="button" onClick={() => setCur(null)}>목록</button>
        <button type="button" disabled={cur === 0} onClick={() => setCur(cur - 1)}>이전</button>
        <button type="button" className="primary" disabled={cur === GUIDE.length - 1} onClick={() => setCur(cur + 1)}>다음</button>
      </div>
    </article>
  )
}
