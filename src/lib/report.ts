// 결과 리포트 이메일: 결과 화면의 판정을 리포트 데이터로 만들어 /api/send-report 로 보낸다.
// 받는 주소는 서버가 계정의 "선택 입력 이메일"에서 정한다. 여기서는 주소를 보내지 않는다.
import type { Status, Verdict, Warning } from './eligibility'
import { policyById } from '../data/policies'
import { supabase } from './supabase'

export interface ReportItem {
  name: string; category: string; status: Status; easy: string
  reasons: string[]; todo: string[]; need: string[]; fix: string[]
  applyName: string; applyUrl: string
}
export interface ReportPayload {
  name: string
  surveyType: 'simple' | 'deep'
  counts: Record<Status, number>
  warnings: Warning[]
  unknown: string[]
  items: ReportItem[]
}

export function buildReport(input: { verdicts: Verdict[]; warnings: Warning[]; surveyType: 'simple' | 'deep'; name: string; unknown: string[] }): ReportPayload {
  const { verdicts, surveyType } = input
  const count = (s: Status) => verdicts.filter((v) => v.status === s).length
  return {
    name: input.name.slice(0, 12),
    surveyType,
    counts: { ok: count('ok'), maybe: count('maybe'), no: count('no') },
    warnings: input.warnings,
    unknown: input.unknown,
    items: verdicts.flatMap((v) => {
      const p = policyById(v.id)
      if (!p) return []
      const deep = surveyType === 'deep'
      return [{
        name: p.name, category: p.category, status: v.status, easy: p.easy,
        reasons: v.reasons, todo: v.todo,
        need: deep && v.status !== 'no' ? v.need ?? [] : [],
        fix: deep && v.status === 'no' ? v.fix ?? [] : [],
        applyName: p.apply.name.split(' ')[0], applyUrl: p.apply.url,
      }]
    }),
  }
}

export type SendResult = { ok: true; to: string } | { ok: false; code: string; message: string }

export async function sendReport(payload: ReportPayload): Promise<SendResult> {
  if (!supabase) return { ok: false, code: 'NO_SERVER', message: '로그인 서버에 연결되어 있지 않아요.' }
  try {
    const token = (await supabase.auth.getSession()).data.session?.access_token
    if (!token) return { ok: false, code: 'UNAUTHORIZED', message: '로그인이 필요해요.' }
    const r = await fetch('/api/send-report', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const body = (await r.json().catch(() => ({}))) as { ok?: boolean; to?: string; error?: string; message?: string }
    if (r.ok && body.ok) return { ok: true, to: body.to ?? '' }
    return { ok: false, code: body.error ?? 'NETWORK', message: body.message ?? '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.' }
  } catch {
    return { ok: false, code: 'NETWORK', message: '연결에 실패했어요. 잠시 후 다시 시도해 주세요.' }
  }
}
