// 아이디 가입 공통 규칙 (서버). 프런트 src/lib/account.ts 와 같은 규칙이어야 한다(api/_lib/account.test.ts 가 대조).
// 로그인은 Supabase Auth(이메일+비밀번호)를 그대로 쓰되, 아이디를 내부용 주소 `<아이디>@id.cjsj.invalid` 로 바꿔 쓴다.
// · .invalid 는 실제로 메일이 갈 수 없는 예약 도메인(RFC 2606)이라, 이 주소로는 아무 메일도 나가지 않는다.
// · 결과 리포트를 받을 이메일은 이와 별개로, 사용자가 원할 때만 적는 선택 항목이다(user_metadata.report_email).

export const LOGIN_DOMAIN = 'id.cjsj.invalid'
/** 영문 소문자로 시작, 영문 소문자·숫자·_ 4~20자 */
export const LOGIN_ID_RE = /^[a-z][a-z0-9_]{3,19}$/
export const PASSWORD_MIN = 8
export const EMAIL_MAX = 254
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/

export const normalizeLoginId = (s: string): string => s.trim().toLowerCase()
export const isValidLoginId = (s: string): boolean => LOGIN_ID_RE.test(s)
export const loginEmailOf = (id: string): string => `${normalizeLoginId(id)}@${LOGIN_DOMAIN}`
export const isLoginEmail = (email: string): boolean => email.toLowerCase().endsWith(`@${LOGIN_DOMAIN}`)

/** 리포트 받을 이메일 정리. 비었으면 '', 형식이 틀리면 null */
export function cleanReportEmail(s: unknown): string | null {
  if (s === undefined || s === null) return ''
  if (typeof s !== 'string') return null
  const v = s.trim()
  if (!v) return ''
  if (v.length > EMAIL_MAX || !EMAIL_RE.test(v)) return null
  if (isLoginEmail(v)) return null
  return v
}
