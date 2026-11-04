// GET /api/admin-export?type=simple|deep|all|codebook&from=ISO&to=ISO
// 헤더 Authorization: Bearer <access_token>. 관리자(profiles.role='admin')만 설문 raw data CSV 를 받는다.
// 서버 전용 비밀 키는 이 파일 밖으로 나가지 않는다 (응답·로그에 넣지 않음).
import { createClient } from '@supabase/supabase-js'
import { badRequest, json, serverConfigError } from './_lib/http.js'
import { buildCodebookCsv, buildResponsesCsv } from './_lib/export.js'
import type { ResponseRow } from './_lib/export.js'

const PAGE = 1000
const MAX_ROWS = 100_000
const TYPES = ['simple', 'deep', 'all', 'codebook'] as const
type ExportType = (typeof TYPES)[number]

const csvResponse = (csv: string, filename: string) =>
  new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })

const denied = (status: 401 | 403) => json({ error: status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN', message: status === 401 ? '로그인이 필요해요' : '관리자만 받을 수 있어요' }, status)

const parseDate = (v: string | null): string | null | 'bad' => {
  if (!v) return null
  const t = Date.parse(v)
  return Number.isNaN(t) ? 'bad' : new Date(t).toISOString()
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const type = (url.searchParams.get('type') ?? 'all') as ExportType
  if (!TYPES.includes(type)) return badRequest('type 은 simple, deep, all, codebook 중 하나예요')
  const from = parseDate(url.searchParams.get('from'))
  const to = parseDate(url.searchParams.get('to'))
  if (from === 'bad' || to === 'bad') return badRequest('from, to 는 ISO 날짜여야 해요')

  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]?.trim()
  if (!token) return denied(401)

  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.trim()
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!base || !secret) return serverConfigError()
  const db = createClient(base, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: u, error: ue } = await db.auth.getUser(token)
  if (ue || !u.user) return denied(401)
  const adminId = u.user.id
  const { data: prof, error: pe } = await db.from('profiles').select('role').eq('id', adminId).maybeSingle()
  if (pe) { console.error('admin-export: profiles 조회 실패', pe.code); return json({ error: 'SERVER_ERROR', message: '권한 확인 실패' }, 500) }
  if (prof?.role !== 'admin') return denied(403)

  if (type === 'codebook') return csvResponse(buildCodebookCsv(), 'codebook.csv')

  const rows: ResponseRow[] = []
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    let q = db.from('survey_responses').select('respondent_id, survey_type, answers, created_at')
    if (type !== 'all') q = q.eq('survey_type', type)
    if (from) q = q.gte('created_at', from)
    if (to) q = q.lte('created_at', to)
    const { data, error } = await q.order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + PAGE - 1)
    if (error) { console.error('admin-export: 응답 조회 실패', error.code); return json({ error: 'SERVER_ERROR', message: '응답을 읽지 못했어요' }, 500) }
    rows.push(...(data as ResponseRow[]))
    if (data.length < PAGE) break
  }

  const csv = buildResponsesCsv(rows, type)
  const { error: le } = await db.from('export_logs').insert({ admin_id: adminId, survey_type: type === 'all' ? null : type, range_from: from, range_to: to, row_count: rows.length })
  if (le) console.error('admin-export: 내보내기 기록 실패', le.code) // 기록 실패가 내려받기를 막지는 않는다

  const stamp = new Date().toISOString().slice(0, 10)
  return csvResponse(csv, `survey_${type}_${stamp}.csv`)
}
