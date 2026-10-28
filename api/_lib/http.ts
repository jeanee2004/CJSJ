// 서버리스 함수 공통 응답·키·캐시 유틸.
// 키는 process.env 에서만 읽고, 응답·로그 어디에도 키 이름이나 값을 넣지 않는다.

export type KeyName = 'DATA_GO_KR_KEY' | 'YOUTHCENTER_KEY' | 'RONE_KEY'

export const readKey = (name: KeyName): string | undefined => {
  const v = process.env[name]?.trim()
  return v ? v : undefined
}

/** 문자열 안의 키(원문·URL 인코딩)와 serviceKey 류 쿼리 값을 가린다. */
export function mask(text: string, ...keys: (string | undefined)[]): string {
  let out = text
  for (const k of keys) {
    if (!k) continue
    out = out.split(k).join('***').split(encodeURIComponent(k)).join('***')
  }
  return out.replace(/((?:serviceKey|apiKeyNm|KEY|authKey)=)[^&\s"']+/gi, '$1***')
}

/** 캐시 초 단위. s-maxage 는 Vercel CDN, max-age 는 브라우저. */
export interface Cache { cdn: number; browser?: number; swr?: number }
export const NO_STORE = 'private, no-store'
export const cacheHeader = (c: Cache) =>
  `public, max-age=${c.browser ?? 300}, s-maxage=${c.cdn}, stale-while-revalidate=${c.swr ?? c.cdn}`

export function json(body: unknown, status = 200, cache: Cache | typeof NO_STORE = NO_STORE): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': typeof cache === 'string' ? cache : cacheHeader(cache),
    },
  })
}

export const serverConfigError = () => json({ error: 'SERVER_CONFIG', message: '서버 설정 오류' }, 500)
export const badRequest = (message: string) => json({ error: 'BAD_REQUEST', message }, 400)

export type UpstreamCode = 'KEY_NOT_REGISTERED' | 'KEY_EXPIRED' | 'ACCESS_DENIED' | 'QUOTA_EXCEEDED' | 'UPSTREAM_TIMEOUT' | 'UPSTREAM_ERROR'

const UPSTREAM_MSG: Record<UpstreamCode, string> = {
  KEY_NOT_REGISTERED: '공공데이터 서비스 키가 아직 활성화되지 않았어요',
  KEY_EXPIRED: '공공데이터 서비스 키 기간이 끝났어요',
  ACCESS_DENIED: '공공데이터 서비스 접근이 거부됐어요',
  QUOTA_EXCEEDED: '오늘 조회 한도를 넘었어요',
  UPSTREAM_TIMEOUT: '공공데이터 서버가 응답하지 않아요',
  UPSTREAM_ERROR: '공공데이터를 불러오지 못했어요',
}

/** 업스트림 실패. 짧게 CDN 캐시해 같은 실패로 한도를 낭비하지 않는다. */
export const upstreamError = (code: UpstreamCode) =>
  json({ error: code, message: UPSTREAM_MSG[code] }, code === 'UPSTREAM_TIMEOUT' ? 504 : 502, { cdn: 60, browser: 0, swr: 0 })

/** 서버 로그에는 코드와 위치만 남긴다. 키·주소·쿼리는 남기지 않는다. */
export const logUpstream = (where: string, code: UpstreamCode, detail?: string) =>
  console.warn(`[${where}] ${code}${detail ? ` ${mask(detail, readKey('DATA_GO_KR_KEY'), readKey('YOUTHCENTER_KEY'), readKey('RONE_KEY')).slice(0, 120)}` : ''}`)

/** 한국 시간 기준 YYYYMMDD */
export const todayKst = (now = new Date()) => new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '')
