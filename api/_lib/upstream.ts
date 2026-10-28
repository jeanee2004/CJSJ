import { mask } from './http.js'
import type { UpstreamCode } from './http.js'
import { tag } from './xml.js'

export type Fetched = { ok: true; text: string } | { ok: false; code: UpstreamCode; detail: string }

// 공공데이터포털 게이트웨이 오류 (OpenAPI_ServiceResponse.returnReasonCode)
const REASON: Record<string, UpstreamCode> = {
  '05': 'UPSTREAM_TIMEOUT',
  '20': 'ACCESS_DENIED',
  '22': 'QUOTA_EXCEEDED',
  '30': 'KEY_NOT_REGISTERED',
  '31': 'KEY_EXPIRED',
  '32': 'ACCESS_DENIED',
}

/** 게이트웨이 오류 봉투(XML/JSON)를 찾아 코드로 바꾼다. 정상 응답이면 null */
export function gatewayError(text: string, status: number): UpstreamCode | null {
  if (text.includes('OpenAPI_ServiceResponse') || text.includes('returnReasonCode')) {
    const xml = tag(text, 'returnReasonCode')
    const js = text.match(/"returnReasonCode"\s*:\s*"?(\d+)/)?.[1]
    const reason = (xml || js || '').padStart(2, '0')
    return REASON[reason] ?? 'UPSTREAM_ERROR'
  }
  if (status === 401 || status === 403) return 'KEY_NOT_REGISTERED'
  if (status === 429) return 'QUOTA_EXCEEDED'
  if (status >= 500) return status === 504 ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR'
  if (status >= 400) return 'UPSTREAM_ERROR'
  return null
}

/**
 * 키를 붙여 호출한다. url 에는 키를 넣지 않고 keyParam 으로 넘긴다.
 * 게이트웨이 타임아웃(05)은 한 번만 다시 시도한다.
 */
export async function fetchUpstream(url: string, key: string, keyParam = 'serviceKey', timeoutMs = 25_000): Promise<Fetched> {
  const full = `${url}${url.includes('?') ? '&' : '?'}${keyParam}=${encodeURIComponent(key)}`
  let last: Fetched = { ok: false, code: 'UPSTREAM_ERROR', detail: '' }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(full, { signal: AbortSignal.timeout(timeoutMs) })
      const text = await r.text()
      const code = gatewayError(text, r.status)
      if (!code) return { ok: true, text }
      last = { ok: false, code, detail: mask(`HTTP ${r.status} ${text.slice(0, 200)}`, key) }
      if (code !== 'UPSTREAM_TIMEOUT') return last
    } catch (e) {
      const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')
      last = { ok: false, code: timeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR', detail: mask(String(e), key) }
      if (!timeout) return last
    }
  }
  return last
}
