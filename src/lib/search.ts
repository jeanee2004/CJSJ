// 한글 친화 검색: 부분 일치 · 초성 검색 · 오타 보정("혹시 이걸 찾으셨나요?")
// 한글을 자모로 풀어서 비교하기 때문에 "보증굼"→"보증금", "전새"→"전세", "ㅂㅈㄱ"→"보증금"이 된다.

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

const isSyllable = (c: number) => c >= 0xac00 && c <= 0xd7a3

/** 공백을 없애고 소문자로 */
export const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()

/** 한글 음절을 초성·중성·종성 자모로 풀어쓴다 */
export function toJamo(s: string): string {
  let out = ''
  for (const ch of normalize(s)) {
    const c = ch.charCodeAt(0)
    if (isSyllable(c)) {
      const i = c - 0xac00
      out += CHO[Math.floor(i / 588)] + JUNG[Math.floor((i % 588) / 28)] + JONG[i % 28]
    } else out += ch
  }
  return out
}

/** 초성만 뽑는다: 보증금 → ㅂㅈㄱ */
export function choseong(s: string): string {
  let out = ''
  for (const ch of normalize(s)) {
    const c = ch.charCodeAt(0)
    out += isSyllable(c) ? CHO[Math.floor((c - 0xac00) / 588)] : ch
  }
  return out
}

const isChoseongQuery = (q: string) => /^[ㄱ-ㅎ]+$/.test(q)

/** 패턴이 텍스트의 어느 부분과 가장 비슷한지의 편집 거리 (Sellers 알고리즘) */
export function approxSubstring(pattern: string, text: string): number {
  const m = pattern.length
  if (m === 0) return 0
  let prev = Array.from({ length: m + 1 }, (_, i) => i)
  let best = prev[m]
  for (let j = 1; j <= text.length; j++) {
    const cur = [0]
    for (let i = 1; i <= m; i++) {
      const cost = pattern[i - 1] === text[j - 1] ? 0 : 1
      cur[i] = Math.min(prev[i] + 1, cur[i - 1] + 1, prev[i - 1] + cost)
    }
    best = Math.min(best, cur[m])
    prev = cur
  }
  return best
}

// 짧은 검색어는 오타를 허용하지 않고, 긴 검색어일수록 조금 더 허용한다(약 20%)
const allowedTypos = (jamoLen: number) => (jamoLen <= 3 ? 0 : Math.max(1, Math.floor(jamoLen * 0.2)))

export interface SearchItem {
  id: string
  fields: string[] // 제목·동의어 등 짧은 검색어
  long?: string // 설명처럼 긴 글(부분 일치만)
}
export interface SearchResult {
  hits: string[] // 바로 보여줄 결과
  suggestions: string[] // 결과가 없을 때 "혹시 이걸 찾으셨나요?"
}

export function rank(items: SearchItem[], query: string): SearchResult {
  const q = normalize(query)
  if (!q) return { hits: items.map((i) => i.id), suggestions: [] }
  const qj = toJamo(q)
  const scored: { id: string; hit: number; typo: number }[] = items.map((it) => {
    const fields = it.fields.map(normalize)
    let hit = 0
    if (fields.some((f) => f === q)) hit = 110
    else if (fields.some((f) => f.includes(q))) hit = 100
    else if (isChoseongQuery(q) && fields.some((f) => choseong(f).includes(q))) hit = 90
    else if (it.long && normalize(it.long).includes(q)) hit = 60
    // 자모 단위: 글자를 덜 쳤어도(예: "잔그") 일치, 한두 글자 틀려도 비슷한 말로 추천
    let typo = 99
    if (!isChoseongQuery(q)) {
      typo = Math.min(...fields.map((f) => approxSubstring(qj, toJamo(f))))
      if (typo === 0 && !hit) hit = 85
    }
    return { id: it.id, hit, typo }
  })
  const hits = scored.filter((s) => s.hit > 0).sort((a, b) => b.hit - a.hit).map((s) => s.id)
  if (hits.length) return { hits, suggestions: [] }
  const limit = allowedTypos(qj.length)
  const suggestions = limit === 0 ? [] : scored.filter((s) => s.typo <= limit).sort((a, b) => a.typo - b.typo).slice(0, 3).map((s) => s.id)
  return { hits: [], suggestions }
}
