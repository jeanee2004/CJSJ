import { useEffect, useMemo, useState } from 'react'
import { TERMS } from '../data/terms'
import { rank } from '../lib/search'

const POPULAR = ['deposit', 'jeonse', 'wolse', 'jan', 'pickone']
const SEARCH_ITEMS = TERMS.map((t) => ({ id: t.id, fields: [t.word, ...(t.alias ?? [])], long: t.easy }))

/** 우측 하단 돋보기 버튼: 어느 화면에서든 눌러서 낯선 말을 바로 찾아본다 */
export function GlossaryFab() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { hits, suggestions } = useMemo(() => rank(SEARCH_ITEMS, q), [q])
  const byId = (id: string) => TERMS.find((t) => t.id === id)!
  const typed = q.trim().length > 0
  const list = (typed ? hits : hits.slice(0, 8)).map(byId)
  const pick = (id: string) => setQ(byId(id).word.replace(/ \(.*\)/, ''))
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open])
  return (
    <>
      {open && (
        <div className="gpanel" role="dialog" aria-label="쉬운 용어 찾기">
          <div className="gpanel-top">
            <h2>낯선 말, 여기서 찾아보세요</h2>
            <button type="button" aria-label="닫기" onClick={() => setOpen(false)}>✕</button>
          </div>
          <label className="sr-only" htmlFor="gq">용어 검색</label>
          <input id="gq" className="gloss-search" placeholder="예: 보증금, 전세, 잔금, ㅂㅈㄱ" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" autoFocus />
          <p className="gloss-chips" aria-label={typed && list.length === 0 && suggestions.length > 0 ? '혹시 이걸 찾으셨나요?' : '자주 찾는 말'}>
            {(typed && list.length === 0 && suggestions.length > 0 ? suggestions : POPULAR).map((id) => <button key={id} type="button" className="chip-s" onClick={() => pick(id)}>{byId(id).word.replace(/ \(.*\)/, '')}</button>)}
          </p>
          <div className="gpanel-list">
            {typed && list.length === 0 && <p className="hint" role="status">“{q.trim()}”와 비슷한 말을 찾지 못했어요. 위 말을 눌러 보세요.</p>}
            {list.map((t) => (
              <div className="gl-row" key={t.id}>
                <h3>{t.word}</h3>
                <p>{t.easy}</p>
                {t.example && <p className="ex">예) {t.example}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      <button type="button" className="gfab" aria-label="쉬운 용어 검색" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#1d2745" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>
      </button>
    </>
  )
}
