import type { CostCompare, Status, Verdict } from './eligibility'
import type { Phase } from './live'

export const STATUS_ORDER: Status[] = ['ok', 'maybe', 'no']
export const STATUS_TEXT: Record<Status, { t: string; g: string }> = {
  ok: { t: '신청할 수 있어요', g: '✓' },
  maybe: { t: '확인해 보면 좋아요', g: '△' },
  no: { t: '지금은 어려워요', g: '✕' },
}

export interface Seg { status: Status; count: number; pct: number }
/** 판정 개수와 비율 (비율 합은 total>0이면 100) */
export function tally(vs: Pick<Verdict, 'status'>[]): { total: number; segs: Seg[] } {
  const total = vs.length
  const segs = STATUS_ORDER.map((status) => {
    const count = vs.filter((v) => v.status === status).length
    return { status, count, pct: total ? (count / total) * 100 : 0 }
  })
  return { total, segs }
}

const PHASE_BADGE: Partial<Record<Phase, string>> = { open: '접수 중', closed: '마감', upcoming: '접수 예정', always: '상시 접수' }
export const phaseBadge = (p?: Phase) => (p ? PHASE_BADGE[p] : undefined)

export interface BoardRow { id: string; name: string; status: Status; badge?: string; phase?: Phase }
const RANK: Record<Status, number> = { ok: 0, maybe: 1, no: 2 }
/** 제도별 한 줄 상태: 신청 가능한 것부터, 같으면 원래 순서 */
export function boardRows(vs: { id: string; status: Status }[], names: Record<string, string>, phases: Record<string, Phase | undefined> = {}): BoardRow[] {
  return vs
    .map((v, i) => ({ v, i }))
    .sort((x, y) => RANK[x.v.status] - RANK[y.v.status] || x.i - y.i)
    .map(({ v }) => ({ id: v.id, name: names[v.id] ?? v.id, status: v.status, phase: phases[v.id], badge: v.status === 'no' ? undefined : phaseBadge(phases[v.id]) }))
}

export interface CostBar { key: 'buteemok' | 'interest'; label: string; value: number; pct: number; best: boolean }
/** 총 이자 막대 비교. 가장 큰 값이 100%, 적은 쪽이 best (같으면 둘 다 아님) */
export function costBars(c: Pick<CostCompare, 'buteemokPaid' | 'interestPaid' | 'better'>): CostBar[] {
  const max = Math.max(c.buteemokPaid, c.interestPaid, 1)
  return [
    { key: 'buteemok' as const, label: '버팀목 (나라)', value: c.buteemokPaid },
    { key: 'interest' as const, label: '세종 이자지원', value: c.interestPaid },
  ].map((b) => ({ ...b, pct: (b.value / max) * 100, best: c.better === b.key }))
}

export type Load = 'light' | 'normal' | 'heavy'
export interface Gauge { pct: number; shown: number; load: Load; label: string }
/** 소득 대비 주거비 게이지: 0~60%를 눈금으로, 30% 넘으면 부담 */
export function gauge(ratio: number, scaleMax = 60): Gauge {
  const r = Math.max(0, Math.round(ratio))
  const load: Load = r <= 20 ? 'light' : r <= 30 ? 'normal' : 'heavy'
  return { pct: Math.min(100, (r / scaleMax) * 100), shown: r, load, label: { light: '여유로운 편', normal: '보통', heavy: '부담이 큰 편' }[load] }
}

/** 응답 정확도: 답한 문항 / 전체 문항 */
export function accuracy(answered: number, total: number): { pct: number; answered: number; total: number } {
  const t = Math.max(0, total)
  const a = Math.min(Math.max(0, answered), t)
  return { pct: t ? Math.round((a / t) * 100) : 0, answered: a, total: t }
}

export const progress = (n: number, total: number) => (total > 0 ? Math.min(100, Math.max(0, (n / total) * 100)) : 0)
