import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ask } from '../lib/ask'
import type { AskAnswer } from '../lib/ask'
import { ALL_POLICIES, policyById } from '../data/policies'
import { TERM_MAP } from '../data/terms'
import { track } from '../lib/track'
import './AiSearch.css'

const EXAMPLES = ['집값이 궁금해요', '보증금이 뭐예요?', '월세 지원 받을 수 있어요?', '전세 사기가 걱정돼요', '이사하고 뭘 신고해야 해요?']
type Res = AskAnswer & { note?: string }
/** "전세와 월세 차이를 찾아보시나요?"·"…가 궁금하신가요?" → 주제만 (눌렀을 때 그 주제로 다시 검색) */
const topic = (f: string) => f.replace(/\s*(?:을\(를\)|을|를|이|가)?\s*(?:찾아보시나요|찾으시나요|찾으세요|궁금하신가요|궁금한가요)\??$/, '').replace(/\?$/, '').trim() || f

// 홈 'AI 검색': 로그인 없이 누구나. 질문 뜻을 읽어 "이런 걸 찾으시나요?"를 제안하고,
// 우리 사이트의 제도·용어·화면과 공식 사이트 링크를 모아 보여 준다. 질문 글은 저장하지 않는다.
export function AiSearch() {
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const [res, setRes] = useState<Res | null>(null)
  const [busy, setBusy] = useState(false)
  const ctl = useRef<AbortController | null>(null)
  useEffect(() => () => ctl.current?.abort(), [])

  const run = async (text: string) => {
    const t = text.trim()
    if (t.length < 2 || busy) return
    ctl.current?.abort()
    const c = new AbortController(); ctl.current = c
    setQ(t); setAsked(t); setBusy(true)
    track('click', { name: 'ask_submit' })
    try { setRes(await ask(t, c.signal)); setBusy(false) } catch { /* 새 질문이 이어받는다 */ }
  }

  return (
    <section className="sec ask-sec" id="ask" aria-labelledby="ask-t">
      <div className="wrap">
        <div className="sec-head">
          <div className="eyebrow"><i>AI</i><span className="label">AI 검색</span></div>
          <p>집에 대해 궁금한 걸 편하게 적어 보세요. 용어를 몰라도, 로그인하지 않아도 돼요. 어떤 걸 찾는지 되물어 보고, 관련 제도와 공식 사이트로 안내해 드려요.</p>
          <h2 id="ask-t" className="display">뭐가 궁금하세요?</h2>
        </div>

        <form className="ask-box" role="search" onSubmit={(e) => { e.preventDefault(); void run(q) }}>
          <label htmlFor="ask-q" className="sr-only">집에 대해 궁금한 것</label>
          <input id="ask-q" value={q} maxLength={100} autoComplete="off" placeholder="예: 집값이 궁금해요, 보증금이 뭐예요?" onChange={(e) => setQ(e.target.value)} />
          <button type="submit" disabled={busy || q.trim().length < 2}>{busy ? '찾는 중…' : '검색'}</button>
        </form>
        <div className="ask-ex" aria-label="예시 질문">
          {EXAMPLES.map((x) => <button key={x} type="button" onClick={() => void run(x)}>{x}</button>)}
        </div>

        <div className="ask-out" aria-live="polite" aria-busy={busy}>
          {busy && <p className="ask-wait">“{asked}” 에 대해 찾아보고 있어요…</p>}
          {!busy && res && <Result r={res} onAsk={(x) => void run(x)} />}
        </div>
        <p className="ask-note">AI 설명은 참고용이에요. 금액·자격·마감일은 꼭 공식 사이트에서 다시 확인하세요. 질문 내용은 저장하지 않아요.</p>
      </div>
    </section>
  )
}

function Result({ r, onAsk }: { r: Res; onAsk: (q: string) => void }) {
  const pols = r.policies.map((id) => policyById(id)).filter((p): p is NonNullable<typeof p> => !!p && ALL_POLICIES.includes(p))
  const terms = r.terms.map((id) => TERM_MAP[id]).filter(Boolean)
  const empty = !pols.length && !terms.length && !r.links.length
  return (
    <div className="ask-res">
      <div className="ask-ans">
        <span className="ask-tag">{r.source === 'ai' ? 'AI가 정리했어요' : '사이트 안 검색 결과예요'}</span>
        <p>{r.answer}</p>
        {r.note && <small>{r.note}</small>}
      </div>

      {r.followups.length > 0 && (
        <div className="ask-block">
          <h3>혹시 이걸 찾으시나요?</h3>
          <div className="ask-chips">{r.followups.map((f) => <button key={f} type="button" onClick={() => onAsk(topic(f))}>{f}</button>)}</div>
        </div>
      )}

      {terms.length > 0 && (
        <div className="ask-block">
          <h3>쉬운 말로 풀면</h3>
          <ul className="ask-terms">{terms.map((t) => <li key={t.id}><b>{t.word}</b><span>{t.easy}</span></li>)}</ul>
        </div>
      )}

      {pols.length > 0 && (
        <div className="ask-block">
          <h3>관련 지원 제도</h3>
          <ul className="ask-pols">
            {pols.map((p) => (
              <li key={p.id}>
                <div><b>{p.name}</b><span>{p.easy}</span></div>
                <div className="ask-act">
                  <Link to="/#policies" data-track={`ask_policy:${p.id}`}>자세히 보기</Link>
                  <a href={p.apply.url} target="_blank" rel="noreferrer noopener" data-track={`apply:${p.id}`}>{p.apply.general ? '안내 보기' : '신청 안내'} ↗</a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(r.sections.length > 0 || r.links.length > 0) && (
        <div className="ask-block">
          <h3>바로 가기</h3>
          <ul className="ask-links">
            {r.sections.map((s) => <li key={s.key}><Link to={s.to} data-track={`ask_section:${s.key}`}><b>{s.label}</b><span>우리 사이트</span></Link></li>)}
            {r.links.map((l) => <li key={l.key}><a href={l.url} target="_blank" rel="noreferrer noopener" data-track={`ask_link:${l.key}`}><b>{l.name} ↗</b><span>{l.about}</span></a></li>)}
          </ul>
        </div>
      )}
      {empty && !r.sections.length && <p className="mp-sub">다른 말로 다시 물어봐 주세요.</p>}
    </div>
  )
}
