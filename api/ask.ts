// GET /api/ask?q=... — 로그인 없이 쓰는 AI 검색. Gemini 가 질문 뜻을 읽고 "이런 걸 찾으시나요?"와 관련 제도·용어·공식 링크를 고른다.
// 키가 없거나 모델이 실패하면 { ai: null } 을 돌려주고, 화면이 사이트 안 검색 결과로 대신한다.
import { badRequest, json } from './_lib/http.js'
import { generate } from './_lib/gemini.js'
import { ASK_LINKS, ASK_SECTIONS, aiCooling, allow, buildPrompt, looksPersonal, markAiFailure, normalizeQuery, sanitize } from './_lib/askCore.js'
import type { AskResult } from './_lib/askCore.js'

const cache = new Map<string, { at: number; v: AskResult }>()
const TTL = 10 * 60_000
/** 키를 화면이 바로 쓸 수 있는 이름·주소로 풀어 준다(주소는 우리 목록의 것만) */
const shape = (v: AskResult) => ({
  ...v,
  links: v.links.map((k) => ({ key: k, ...ASK_LINKS[k] })),
  sections: v.sections.map((k) => ({ key: k, ...ASK_SECTIONS[k] })),
})

// 응답 캐시(CDN): 같은 질문은 하루 동안 Gemini 를 다시 부르지 않고 저장된 답을 준다. 실패 응답은 저장하지 않는다.
const CACHE = { cdn: 86_400, browser: 3_600, swr: 604_800 }
// 무료 사용량을 지키는 하루 AI 호출 상한(서버 인스턴스별, 캐시 적중은 세지 않음). ASK_DAILY_CAP 으로 조정
const DAILY_CAP = Number(process.env.ASK_DAILY_CAP) || 600

export async function GET(request: Request): Promise<Response> {
  const raw = (new URL(request.url).searchParams.get('q') ?? '').trim()
  if (raw.length < 2) return badRequest('두 글자 이상 입력해 주세요')
  if (raw.length > 100) return badRequest('100자 이내로 입력해 주세요')
  const q = normalizeQuery(raw)
  if (looksPersonal(q)) return json({ ai: null, reason: 'SKIP' })
  if (!process.env.GEMINI_API_KEY?.trim()) return json({ ai: null, reason: 'NO_AI_KEY' })

  const hit = cache.get(q)
  if (hit && Date.now() - hit.at < TTL) return json({ ai: shape(hit.v), reason: 'OK' }, 200, CACHE)
  if (aiCooling()) return json({ ai: null, reason: 'AI_ERROR' })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!allow(ip, Date.now(), 8, DAILY_CAP)) return json({ ai: null, reason: 'RATE_LIMIT' }, 429)

  const text = await generate(buildPrompt(q), { json: true, maxTokens: 1200 })
  let parsed: unknown = null
  try { if (text) parsed = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim()) } catch { /* 아래에서 null 처리 */ }
  const ai = sanitize(parsed)
  if (!ai) { if (!text) markAiFailure(); return json({ ai: null, reason: 'AI_ERROR' }) }
  if (cache.size > 300) cache.clear()
  cache.set(q, { at: Date.now(), v: ai })
  return json({ ai: shape(ai), reason: 'OK' }, 200, CACHE)
}
