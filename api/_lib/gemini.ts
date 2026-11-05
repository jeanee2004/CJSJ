// Gemini 호출 공통: 한 모델이 과부하(503)·종료(404)·느림이어도 다음 모델로 넘어가서 답을 받는다.
// 키는 process.env 에서만 읽고 응답·로그에 넣지 않는다.
// 한도가 넉넉하고 빠른 가벼운 모델부터. 모델마다 한도가 따로라서, 429(한도 초과)가 난 모델은 10분, 404(종료)는 1시간 건너뛴다
const MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.8-flash']
const skipUntil = new Map<string, number>()

export interface GenOpts { json?: boolean; maxTokens?: number; perModelMs?: number }

/** 첫 번째로 성공한 모델의 글을 돌려준다. 모두 실패하면 null */
export async function generate(prompt: string, opts: GenOpts = {}): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) return null
  const first = process.env.GEMINI_MODEL?.trim()
  const order = first ? [first, ...MODELS.filter((m) => m !== first)] : MODELS
  const now = Date.now()
  const live = order.filter((m) => (skipUntil.get(m) ?? 0) <= now)
  for (const model of live.length ? live : order) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          // thinkingBudget 0: 짧은 안내에는 '생각' 단계가 필요 없고, 끄면 응답이 3배쯤 빠르고 토큰도 적게 든다
          generationConfig: { maxOutputTokens: opts.maxTokens ?? 2000, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 }, ...(opts.json ? { responseMimeType: 'application/json' } : {}) },
        }),
        signal: AbortSignal.timeout(opts.perModelMs ?? 9000),
      })
      if (!res.ok) {
        if (res.status === 429) skipUntil.set(model, Date.now() + 10 * 60_000)
        else if (res.status === 404) skipUntil.set(model, Date.now() + 60 * 60_000)
        continue
      }
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
      const text = body.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim()
      if (text) return text
    } catch { /* 시간 초과·네트워크 오류: 다음 모델로 */ }
  }
  return null
}

/** 테스트용: 건너뛰기 기록을 비운다 */
export const resetModelSkips = () => skipUntil.clear()
