import type { AskLink, AskSection } from './ask'

// 미리 정리해 둔 자주 묻는 질문(src/data/askFaq.ts, 검색할 때만 불러온다). AI 를 부르지 않아 즉시 나오고 사용량이 들지 않는다.
export interface FaqEntry {
  id: string
  q: string
  keys: string[]
  answer: string
  followups: string[]
  policies: string[]
  terms: string[]
  links: AskLink[]
  sections: AskSection[]
}

const compact = (s: string) => s.replace(/\s+/g, '').toLowerCase()
const MAX_LEN = 30 // 이보다 긴 질문은 구체적이라 AI 에게 맡긴다

/** 질문에 들어 있는 '찾을 말'이 가장 길게(구체적으로) 맞는 항목을 고른다. 길이가 같으면 앞 항목 */
export function matchFaq(query: string, entries: FaqEntry[]): FaqEntry | null {
  const q = compact(query)
  if (q.length < 2 || q.length > MAX_LEN) return null
  let best: FaqEntry | null = null
  let bestLen = 0
  for (const e of entries) {
    for (const k of e.keys) {
      const kk = compact(k)
      if (kk.length >= 2 && kk.length > bestLen && q.includes(kk)) { best = e; bestLen = kk.length }
    }
  }
  return best
}

let loaded: Promise<FaqEntry[]> | null = null
/** 처음 검색할 때 한 번만 불러온다(홈 첫 화면 용량에 포함되지 않음) */
export const loadFaq = (): Promise<FaqEntry[]> => (loaded ??= import('../data/askFaq').then((m) => m.FAQ).catch(() => []))
