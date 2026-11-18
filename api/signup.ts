// POST /api/signup — 아이디+비밀번호 회원가입 (이메일 인증 없음).
// 본문: { id, password, consent: true, reportEmail?, reportConsent? }
// · 계정은 서버가 secret 키로 만들고(email_confirm: true), 로그인용 주소는 `<아이디>@id.cjsj.invalid` 라 메일이 나가지 않는다.
// · Supabase 의 공개 가입(이메일 인증 필요) 설정은 그대로 두므로, 관리자 이메일을 인증 없이 가로채 가입할 수 없다.
// · 리포트 받을 이메일은 선택 항목이며, 적었으면 별도 동의(reportConsent)가 있어야 저장한다. 인증 메일은 보내지 않는다.
// 비밀 키·비밀번호·이메일은 응답·로그에 넣지 않는다.
import { createClient } from '@supabase/supabase-js'
import { badRequest, json, serverConfigError } from './_lib/http.js'
import { PASSWORD_MIN, cleanReportEmail, isValidLoginId, loginEmailOf, normalizeLoginId } from './_lib/account.js'

// 같은 곳에서 짧은 시간에 너무 많이 가입하지 못하게 한다(함수 인스턴스 단위, 대략적인 방어)
const WINDOW = 10 * 60_000
const PER_WINDOW = 40
const hits = new Map<string, number[]>()

export async function POST(request: Request): Promise<Response> {
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim()
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!base || !secret) return serverConfigError()

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const recent = (hits.get(ip) ?? []).filter((t) => Date.now() - t < WINDOW)
  if (recent.length >= PER_WINDOW) return json({ error: 'RATE_LIMIT', message: '잠시 후 다시 시도해 주세요' }, 429)
  recent.push(Date.now()); hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()

  let body: Record<string, unknown>
  try { body = (await request.json()) as Record<string, unknown> } catch { return badRequest('본문을 읽지 못했어요') }
  const id = normalizeLoginId(String(body.id ?? ''))
  const password = typeof body.password === 'string' ? body.password : ''
  if (!isValidLoginId(id)) return badRequest('아이디는 영문 소문자로 시작하는 4~20자(영문 소문자·숫자·_)로 정해 주세요')
  if (password.length < PASSWORD_MIN || password.length > 72) return badRequest(`비밀번호는 ${PASSWORD_MIN}자 이상으로 정해 주세요`)
  if (body.consent !== true) return badRequest('필수 항목 수집·이용에 동의해 주세요')
  const reportEmail = cleanReportEmail(body.reportEmail)
  if (reportEmail === null) return badRequest('이메일 형식을 확인해 주세요')
  if (reportEmail && body.reportConsent !== true) return badRequest('이메일을 적었다면 리포트 발송 동의에 체크해 주세요')

  const now = new Date().toISOString()
  const db = createClient(base, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await db.auth.admin.createUser({
    email: loginEmailOf(id),
    password,
    email_confirm: true,
    user_metadata: {
      consent_at: now,
      login_id: id,
      ...(reportEmail ? { report_email: reportEmail, report_consent_at: now } : {}),
    },
  })
  if (error) {
    if (error.status === 422 || /already|exists|registered/i.test(error.message)) return json({ error: 'ID_TAKEN', message: '이미 쓰고 있는 아이디예요. 다른 아이디를 정해 주세요' }, 409)
    if (/password/i.test(error.message)) return badRequest('비밀번호가 너무 쉬워요. 다른 비밀번호로 정해 주세요')
    console.error('signup: 계정 생성 실패', error.status)
    return json({ error: 'SERVER_ERROR', message: '가입하지 못했어요. 잠시 후 다시 시도해 주세요' }, 500)
  }
  return json({ ok: true })
}
