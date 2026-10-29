// 공공 API 데이터를 진단 결과에 반영한다. 모두 브라우저에서만 계산하고 설문 답은 서버로 보내지 않는다.
// - 접수 일정: 온통청년(구조화된 날짜)을 먼저, 없으면 정부24 신청기한 문구
// - 공공임대 공고: 혼인·자녀·나이에 맞지 않는 공고는 숨김
// - 추가 혜택: 위 진단 카드에 이미 있는 제도는 뺌
import type { PolicyId } from '../data/policies'
import type { Answers, Verdict } from './eligibility'
import type { Benefit, Notice } from './api'
import { ymdLabel } from './api'

/** 공공 API 의 제도 이름 → 진단 카드 id (2026-10-28 실제 응답 이름 기준) */
const MATCH: Partial<Record<PolicyId, RegExp>> = {
  sejongInterest: /주택임차보증금\s*이자/,
  sejongRent: /청년\s*주거\s*임대료/,
  molitRent: /^청년\s*월세\s*지원(사업)?$/,
}
export const policyOf = (name: string): PolicyId | undefined =>
  (Object.keys(MATCH) as PolicyId[]).find((id) => MATCH[id]!.test(name.trim()))

export interface Schedule { begin?: string; end?: string; deadline?: string; source: Benefit['source'] }

export function scheduleFor(id: PolicyId, items: Benefit[]): Schedule | null {
  const mine = items.filter((b) => policyOf(b.name) === id)
  const dated = mine.find((b) => b.source === 'youthcenter' && b.begin && b.end) ?? mine.find((b) => b.begin && b.end)
  if (dated) return { begin: dated.begin, end: dated.end, deadline: dated.deadline, source: dated.source }
  const text = mine.find((b) => b.deadline)
  return text ? { deadline: text.deadline, source: text.source } : null
}

export type Phase = 'open' | 'closed' | 'upcoming' | 'always' | 'unknown'
export function phaseOf(s: Schedule, today: string): Phase {
  if (s.begin && s.end) return today < s.begin ? 'upcoming' : today > s.end ? 'closed' : 'open'
  if (s.deadline && /마감/.test(s.deadline)) return 'closed'
  if (s.deadline && /상시/.test(s.deadline)) return 'always'
  return 'unknown'
}

const SRC = { youthcenter: '온통청년', gov24: '정부24', bokjiro: '복지로' } as const
export function scheduleText(s: Schedule, today: string): string {
  const range = s.begin && s.end ? `${ymdLabel(s.begin)}~${ymdLabel(s.end)}` : ''
  const by = `${SRC[s.source]} 기준`
  switch (phaseOf(s, today)) {
    case 'open': return `지금 접수 중이에요 (${range}, ${by}).`
    case 'upcoming': return `접수는 ${range}예요 (${by}). 그 전에 서류를 준비해 두세요.`
    case 'closed': return range ? `올해 접수는 ${range}에 끝났어요 (${by}). 다음 공고를 기다려야 해요.` : `${SRC[s.source]}에 "${s.deadline}"으로 올라 있어요. 다음 공고를 기다려야 해요.`
    case 'always': return `상시 접수예요 (${by}).`
    default: return s.deadline ? `신청기한: ${s.deadline} (${by})` : ''
  }
}

export interface LiveRow { name: string; source: string; phase: Phase; label: string; text: string; url?: string }
/** 제도 카드를 펼쳤을 때 보여줄 실시간 공고 목록. 마감은 "다음 공고 대기"로 표시한다 */
export function liveRows(id: PolicyId, items: Benefit[], today: string): LiveRow[] {
  return items.filter((b) => policyOf(b.name) === id).map((b) => {
    const phase = phaseOf(b, today)
    const label = { open: '접수 중', upcoming: '접수 예정', closed: '다음 공고 대기', always: '상시 접수', unknown: '일정 확인 필요' }[phase]
    return { name: b.name, source: SRC[b.source], phase, label, text: scheduleText(b, today) || '접수 일정은 원문에서 확인해 주세요.', url: /^https?:\/\//.test(b.url) ? b.url : undefined }
  })
}

// eligibility.ts 안의 하드코딩된 접수 일정 문장. 공공 API 날짜가 있으면 이 문장은 뺀다.
const STALE: Partial<Record<PolicyId, RegExp>> = {
  sejongRent: /사흘|3월 3~5일|보통 2~3월/,
}

/** 최신 일정이 있을 때 정적 문구 끝의 "(…날짜…)" 와 사흘 접수 안내처럼 날짜가 박힌 문장을 지운다 */
export const stripDates = (text: string) => text.replace(/\s*\([^()]*\d[^()]*\)\s*$/, '')
export const isStaleCaution = (id: PolicyId, text: string) => !!STALE[id]?.test(text)

/** 판정(자격)은 그대로 두고, 접수 일정만 덧붙인다. 마감이면 "신청할 수 있어요" → "확인해 보면 좋아요" */
export function applySchedules(vs: Verdict[], items: Benefit[], today: string): Verdict[] {
  return vs.map((v) => {
    const s = scheduleFor(v.id, items)
    if (!s || v.status === 'no') return v
    const text = scheduleText(s, today)
    if (!text) return v
    const stale = s.begin && STALE[v.id]
    const keep = (x: string) => !stale || !STALE[v.id]!.test(x)
    const out: Verdict = { ...v, reasons: [text, ...v.reasons.filter(keep)], todo: v.todo.filter(keep) }
    if (phaseOf(s, today) === 'closed') {
      if (out.status === 'ok') out.status = 'maybe'
      out.todo = [...out.todo, '다음 접수 공고를 알림으로 챙기세요.']
    }
    return out
  })
}

/** 마이홈 공고 이름으로 대상을 가늠해 맞지 않는 공고를 숨긴다. 이름에 대상이 없으면 보여준다. */
export function fitsNotice(n: Notice, a: Answers): boolean {
  const t = n.title
  // 설문 Q4 "자녀가 있는 가구" (2026-10-29 구글폼 문항으로 바뀜)
  const kids = a.survey?.Q4 === '6'
  const couple = a.marital !== 'single'
  const youth = a.age >= 19 && a.age <= 39
  const want: boolean[] = []
  if (/다자녀/.test(t)) want.push(kids)
  if (/신혼|신생아|예비부부/.test(t)) want.push(couple || kids)
  if (/청년|대학생/.test(t)) want.push(youth && !couple)
  if (/고령|노인|어르신/.test(t)) want.push(false)
  return want.length === 0 || want.some(Boolean)
}

/** 진단 카드에 이미 있는 제도인지 */
export const coveredByVerdicts = (b: Benefit) => policyOf(b.name) !== undefined
