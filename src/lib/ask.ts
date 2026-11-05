import { ALL_POLICIES } from '../data/policies'
import { TERMS } from '../data/terms'
import { rank } from './search'
import { loadFaq, matchFaq } from './askFaq'

// AI 검색 결과(서버 /api/ask) 와, AI 가 안 될 때 쓰는 사이트 안 검색(초성·오타 보정) 결과를 같은 모양으로 다룬다.
export interface AskLink { key: string; name: string; url: string; about: string }
export interface AskSection { key: string; label: string; to: string }
export interface AskAnswer {
  source: 'ai' | 'faq' | 'local'
  answer: string
  followups: string[]
  policies: string[]
  terms: string[]
  links: AskLink[]
  sections: AskSection[]
}

const SECTIONS: Record<string, AskSection> = {
  live: { key: 'live', label: '세종 실시간 집 소식·실거래가 보기', to: '/#live' },
  policies: { key: 'policies', label: '세종 주요 지원 제도 보기', to: '/#policies' },
  survey: { key: 'survey', label: '내 상황으로 받을 수 있는 지원 확인', to: '/#survey' },
}
const PRICE = /집값|시세|실거래|얼마|가격|매매가|전세가|월세가|평당/
const TERM_ITEMS = TERMS.map((t) => ({ id: t.id, fields: [t.word, ...(t.alias ?? [])], long: t.easy }))
const POLICY_ITEMS = ALL_POLICIES.map((p) => ({ id: p.id, fields: [p.name, p.category, ...p.type], long: `${p.easy} ${p.who}` }))

/** 서버 없이도 되는 기본 검색: 용어·제도를 찾고, 비슷한 말을 "이걸 찾으시나요?"로 보여 준다 */
export function localAnswer(q: string): AskAnswer {
  const t = rank(TERM_ITEMS, q)
  const p = rank(POLICY_ITEMS, q)
  const price = PRICE.test(q)
  const word = (id: string) => TERMS.find((x) => x.id === id)?.word ?? ALL_POLICIES.find((x) => x.id === id)?.name ?? ''
  const first = t.hits[0] ? TERMS.find((x) => x.id === t.hits[0]) : undefined
  const guess = [...t.suggestions, ...p.suggestions].map(word).filter(Boolean)
  const labels = guess.length ? guess.map((w) => `${w}을(를) 찾아보시나요?`) : price ? ['세종 실거래가를 찾아보시나요?', '전세와 월세 차이를 찾아보시나요?'] : []
  const found = t.hits.length + p.hits.length > 0
  return {
    source: 'local',
    answer: price
      ? '집값은 실제로 거래된 가격을 보는 게 가장 정확해요. 아래 실시간 정보와 공식 사이트에서 확인해 보세요.'
      : first ? `${first.word}: ${first.easy}` : found ? '관련 있어 보이는 것들을 모았어요.' : '딱 맞는 결과를 못 찾았어요. 다른 말로 물어보거나 아래 질문을 눌러 보세요.',
    followups: labels.slice(0, 3),
    policies: p.hits.slice(0, 4),
    terms: t.hits.slice(0, 4),
    links: price ? [{ key: 'molit_price', name: '국토교통부 실거래가 공개시스템', url: 'https://rt.molit.go.kr', about: '실제로 거래된 매매·전월세 가격 조회' }] : [],
    sections: price ? [SECTIONS.live] : p.hits.length ? [SECTIONS.policies] : [SECTIONS.survey],
  }
}

const norm = (q: string) => q.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[?!.~。…]+$/u, '').trim()
const personal = (q: string) => /\d[\d\s-]{7,}\d|@/.test(q)

// 이 브라우저에 최근 AI 답을 저장해 같은 질문은 바로 보여 준다(최대 30개, 7일). 서버 호출·사용량을 아낀다.
const KEY = 'cjsj.ask.v1'
const TTL = 7 * 86_400_000
type Saved = Record<string, { at: number; a: Omit<AskAnswer, 'source'> }>
const readSaved = (): Saved => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
const save = (q: string, a: Omit<AskAnswer, 'source'>) => {
  try {
    const all = readSaved()
    all[q] = { at: Date.now(), a }
    const keep = Object.entries(all).filter(([, v]) => Date.now() - v.at < TTL).sort((x, y) => y[1].at - x[1].at).slice(0, 30)
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep)))
  } catch { /* 저장 공간이 없으면 건너뜀 */ }
}

/** 검색: ① 미리 정리한 답 → ② 이 기기에 저장된 답 → ③ AI(서버도 같은 질문은 저장해 둠). 실패하면 사이트 안 검색 */
export async function ask(q: string, signal?: AbortSignal): Promise<AskAnswer & { note?: string }> {
  const nq = norm(q)
  if (personal(nq)) return { ...localAnswer(q), note: '개인정보가 들어 있는 것 같아 AI에는 보내지 않았어요.' }
  const faq = matchFaq(nq, await loadFaq())
  if (faq) return { source: 'faq', answer: faq.answer, followups: faq.followups, policies: faq.policies, terms: faq.terms, links: faq.links, sections: faq.sections }
  const hit = readSaved()[nq]
  if (hit && Date.now() - hit.at < TTL) return { ...hit.a, source: 'ai' }
  try {
    const res = await fetch(`/api/ask?q=${encodeURIComponent(nq)}`, { signal })
    const body = (await res.json()) as { ai: (Omit<AskAnswer, 'source'>) | null; reason?: string }
    if (body.ai?.answer) { save(nq, body.ai); return { ...body.ai, source: 'ai' } }
    return { ...localAnswer(q), note: body.reason === 'RATE_LIMIT' ? '잠시 질문이 몰려 기본 검색으로 보여 드려요.' : undefined }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return localAnswer(q)
  }
}
