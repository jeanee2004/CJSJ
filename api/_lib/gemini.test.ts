import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generate, resetModelSkips } from './gemini.js'

const ok = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 })
const used: string[] = []
beforeEach(() => { resetModelSkips(); used.length = 0; process.env.GEMINI_API_KEY = 'test-key'; delete process.env.GEMINI_MODEL })
afterEach(() => { vi.unstubAllGlobals(); delete process.env.GEMINI_API_KEY })

describe('generate: 모델 순차 시도', () => {
  it('429 가 난 모델은 다음 모델로 넘어가고, 다음 호출에서는 건너뛴다', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const m = /models\/([^:]+):/.exec(url)![1]
      used.push(m)
      return m === 'gemini-3.1-flash-lite' ? new Response('{}', { status: 429 }) : ok('답')
    }))
    expect(await generate('q')).toBe('답')
    expect(used).toEqual(['gemini-3.1-flash-lite', 'gemini-3-flash-preview'])
    used.length = 0
    expect(await generate('q')).toBe('답')
    expect(used).toEqual(['gemini-3-flash-preview']) // 한도 초과 모델은 건너뜀
  })
  it('키가 없으면 호출하지 않는다', async () => {
    delete process.env.GEMINI_API_KEY
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    expect(await generate('q')).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })
  it('모두 실패하면 null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
    expect(await generate('q')).toBeNull()
  })
})
