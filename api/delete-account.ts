// POST /api/delete-account — 로그인한 본인의 계정을 삭제한다.
// 헤더 Authorization: Bearer <access_token>. 계정(auth 사용자)을 지우면 profiles 는 함께 지워지고(cascade),
// 설문 응답은 respondent_id 만 비워져 이름 없는 통계로 남는다. 관리자 계정은 실수 방지로 이 기능에서 삭제할 수 없다.
// 비밀 키는 이 파일 밖으로 나가지 않고, 응답·로그에 넣지 않는다.
import { createClient } from '@supabase/supabase-js'
import { json, serverConfigError } from './_lib/http.js'

export async function POST(request: Request): Promise<Response> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]?.trim()
  if (!token) return json({ error: 'UNAUTHORIZED', message: '로그인이 필요해요' }, 401)
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim()
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!base || !secret) return serverConfigError()
  const db = createClient(base, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: u, error: ue } = await db.auth.getUser(token)
  if (ue || !u.user) return json({ error: 'UNAUTHORIZED', message: '로그인이 필요해요' }, 401)
  const id = u.user.id

  const metaAdmin = u.user.app_metadata?.role === 'admin'
  const { data: prof, error: pe } = metaAdmin ? { data: { role: 'admin' }, error: null } : await db.from('profiles').select('role').eq('id', id).maybeSingle()
  if (pe) { console.error('delete-account: profiles 조회 실패', pe.code); return json({ error: 'SERVER_ERROR', message: '권한 확인에 실패했어요' }, 500) }
  if (prof?.role === 'admin') return json({ error: 'FORBIDDEN', message: '관리자 계정은 여기서 삭제할 수 없어요' }, 403)

  const { error } = await db.auth.admin.deleteUser(id)
  if (error) { console.error('delete-account: 삭제 실패', error.status); return json({ error: 'SERVER_ERROR', message: '삭제하지 못했어요. 잠시 후 다시 시도해 주세요' }, 500) }
  return json({ ok: true })
}
