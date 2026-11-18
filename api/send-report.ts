// POST /api/send-report — 로그인한 본인에게 설문 결과 리포트를 이메일로 보낸다.
// 헤더 Authorization: Bearer <access_token>. 본문: 결과 화면이 만든 리포트 데이터(api/_lib/report.ts 의 ReportPayload).
// · 받는 주소는 가입·마이페이지에서 사용자가 "선택"으로 적은 리포트 이메일(user_metadata.report_email)뿐이다.
//   이메일을 적지 않았거나 발송 동의가 없으면 보내지 않는다. 요청 본문의 주소는 받지 않는다.
// · 계정당 24시간에 SEND_PER_DAY 번까지만 보낸다(app_metadata.report_sent 에 보낸 시각을 남긴다).
// · 메일은 Resend(https://resend.com) 로 보낸다. 환경변수: RESEND_API_KEY, REPORT_FROM(보내는 사람), SITE_URL(선택).
// 비밀 키와 받는 사람 주소는 로그에 넣지 않는다.
import { createClient } from '@supabase/supabase-js'
import { badRequest, json, serverConfigError } from './_lib/http.js'
import { cleanReportEmail } from './_lib/account.js'
import { maskEmail, parsePayload, renderReport } from './_lib/report.js'

const SEND_PER_DAY = 5
const DAY = 24 * 3600_000

export async function POST(request: Request): Promise<Response> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]?.trim()
  if (!token) return json({ error: 'UNAUTHORIZED', message: '로그인이 필요해요' }, 401)
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim()
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!base || !secret) return serverConfigError()
  const db = createClient(base, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: u, error: ue } = await db.auth.getUser(token)
  if (ue || !u.user) return json({ error: 'UNAUTHORIZED', message: '로그인이 필요해요' }, 401)
  const meta = (u.user.user_metadata ?? {}) as Record<string, unknown>
  const to = cleanReportEmail(meta.report_email)
  if (!to || !meta.report_consent_at) return json({ error: 'NO_REPORT_EMAIL', message: '리포트를 받을 이메일이 없어요. 마이페이지 ‘내 정보’에서 적어 주세요' }, 400)

  let payload
  try { payload = parsePayload(await request.json()) } catch { return badRequest('본문을 읽지 못했어요') }
  if (!payload) return badRequest('리포트 내용을 확인하지 못했어요')

  const sent = (Array.isArray(u.user.app_metadata?.report_sent) ? (u.user.app_metadata.report_sent as unknown[]) : [])
    .filter((t): t is string => typeof t === 'string' && Date.now() - Date.parse(t) < DAY)
  if (sent.length >= SEND_PER_DAY) return json({ error: 'RATE_LIMIT', message: `리포트 메일은 하루에 ${SEND_PER_DAY}번까지 받을 수 있어요` }, 429)

  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return json({ error: 'MAIL_NOT_READY', message: '메일 보내기가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요' }, 503)
  const from = process.env.REPORT_FROM?.trim() || '청정 세종 <onboarding@resend.dev>'
  const site = (process.env.SITE_URL?.trim() || 'https://cjsj-one.vercel.app').replace(/\/+$/, '')
  const date = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
  const mail = renderReport(payload, { site, date })

  let ok = false
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    })
    ok = r.ok
    if (!ok) console.error('send-report: 메일 서비스 오류', r.status)
  } catch (e) { console.error('send-report: 메일 서비스 연결 실패', (e as Error).name) }
  if (!ok) return json({ error: 'MAIL_FAILED', message: '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요' }, 502)

  // 보낸 기록은 실패해도 메일 발송 결과를 바꾸지 않는다
  const { error: me } = await db.auth.admin.updateUserById(u.user.id, { app_metadata: { report_sent: [...sent, new Date().toISOString()] } })
  if (me) console.error('send-report: 발송 기록 실패', me.status)
  return json({ ok: true, to: maskEmail(to) })
}
