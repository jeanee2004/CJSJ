import { FEEDBACK_LABEL } from '../data/feedback'

export interface FeedbackRow { choices: string[]; comment: string | null; created_at: string }
export interface FeedbackSummary {
  total: number
  ranking: { id: string; label: string; n: number; pct: number }[]
  comments: string[]
  /** 자동 요약 문장들: 많았던 의견 / 일부 의견 / 한마디 수 */
  lines: string[]
}

const MIN_N = 5 // 이보다 적으면 '참고만' 문구를 붙인다

/** 응답을 세어 순위와 문장 요약을 만든다 (AI 가 없어도 항상 보이는 기본 요약) */
export function summarizeFeedback(rows: FeedbackRow[]): FeedbackSummary {
  const total = rows.length
  const count = new Map<string, number>()
  for (const r of rows) for (const c of new Set(r.choices)) count.set(c, (count.get(c) ?? 0) + 1)
  const ranking = [...count.entries()]
    .map(([id, n]) => ({ id, label: FEEDBACK_LABEL[id] ?? id, n, pct: total ? Math.round((n / total) * 100) : 0 }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'ko'))
  const comments = rows.map((r) => r.comment?.trim() ?? '').filter(Boolean)
  const lines: string[] = []
  if (total === 0) return { total, ranking, comments, lines }
  const top = ranking.filter((r) => r.pct >= 40).slice(0, 3)
  const rest = ranking.filter((r) => !top.includes(r) && r.n > 0).slice(0, 3)
  if (top.length) lines.push(`${top.map((r) => `‘${r.label}’(${r.pct}%)`).join(', ')} 의견이 많았어요.`)
  else lines.push(`특별히 한쪽으로 몰리지 않았어요. 가장 많은 것은 ‘${ranking[0].label}’(${ranking[0].pct}%)예요.`)
  if (rest.length) lines.push(`${rest.map((r) => `‘${r.label}’(${r.pct}%)`).join(', ')} 의견도 있었어요.`)
  if (comments.length) lines.push(`직접 남긴 한마디는 ${comments.length}건이에요.`)
  if (total < MIN_N) lines.push(`응답이 ${total}건뿐이라 참고만 해 주세요.`)
  return { total, ranking, comments, lines }
}
