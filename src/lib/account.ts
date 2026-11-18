// 아이디 가입 규칙 (프런트). 서버 api/_lib/account.ts 와 같은 규칙이어야 한다(api/_lib/account.test.ts 가 대조).
// 로그인 칸에는 아이디를 적고, 예전에 이메일로 가입한 회원·관리자는 이메일을 그대로 적어도 된다.

export const LOGIN_DOMAIN = 'id.cjsj.invalid'
export const LOGIN_ID_RE = /^[a-z][a-z0-9_]{3,19}$/
export const PASSWORD_MIN = 8
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/

export const normalizeLoginId = (s: string): string => s.trim().toLowerCase()
export const isValidLoginId = (s: string): boolean => LOGIN_ID_RE.test(normalizeLoginId(s))
export const isLoginEmail = (email: string): boolean => email.toLowerCase().endsWith(`@${LOGIN_DOMAIN}`)
export const isValidEmail = (s: string): boolean => s.trim().length <= 254 && EMAIL_RE.test(s.trim()) && !isLoginEmail(s.trim())

/** 로그인 칸 입력 → Supabase 로그인 주소. '@'가 있으면(예전 이메일 가입) 그대로, 없으면 아이디 주소 */
export const loginAddress = (input: string): string => {
  const v = input.trim()
  return v.includes('@') ? v : `${normalizeLoginId(v)}@${LOGIN_DOMAIN}`
}

/** 화면에 보여 줄 계정 이름: 아이디 가입이면 아이디, 예전 이메일 가입이면 이메일 */
export const accountLabel = (email: string): string => (isLoginEmail(email) ? email.slice(0, email.lastIndexOf('@')) : email)
