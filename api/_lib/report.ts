// 결과 리포트 이메일 만들기 (순수 함수). 화면이 보낸 판정 결과를 검사·정리해서 HTML·텍스트 메일로 만든다.
// · 받는 주소는 이 함수가 아니라 서버가 계정 정보에서 정한다(요청 본문의 주소는 쓰지 않는다).
// · 모든 글자는 이스케이프하고, 길이·개수를 제한하며, 링크는 공공기관 등 허용한 주소만 남긴다.

export type ReportStatus = 'ok' | 'maybe' | 'no'
export interface ReportItem {
  name: string; category: string; status: ReportStatus; easy: string
  reasons: string[]; todo: string[]; need: string[]; fix: string[]
  applyName: string; applyUrl: string
}
export interface ReportPayload {
  name: string
  surveyType: 'simple' | 'deep'
  counts: Record<ReportStatus, number>
  warnings: { tone: 'stop' | 'todo'; text: string }[]
  unknown: string[]
  items: ReportItem[]
}

const MAX_ITEMS = 30
const MAX_LIST = 10
const MAX_TEXT = 400
const STATUSES: ReportStatus[] = ['ok', 'maybe', 'no']
// 신청 링크로 허용하는 주소: 정부·공공기관(.go.kr, .or.kr, gov.kr)과 청약홈
const LINK_OK = /^https:\/\/([a-z0-9-]+\.)*(go\.kr|or\.kr|gov\.kr|applyhome\.co\.kr)(\/[^\s"'<>]*)?$/i

// eslint-disable-next-line no-control-regex
const clean = (v: unknown, max = MAX_TEXT): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max) : '')
const list = (v: unknown): string[] => (Array.isArray(v) ? v.slice(0, MAX_LIST).map((x) => clean(x)).filter(Boolean) : [])
const count = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 99 ? v : 0)
export const safeLink = (v: unknown): string => { const s = clean(v, 300); return LINK_OK.test(s) ? s : '' }

/** 요청 본문을 리포트 데이터로 정리한다. 형식이 맞지 않으면 null */
export function parsePayload(body: unknown): ReportPayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (b.surveyType !== 'simple' && b.surveyType !== 'deep') return null
  if (!Array.isArray(b.items) || b.items.length === 0) return null
  const items: ReportItem[] = []
  for (const raw of b.items.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const status = STATUSES.includes(r.status as ReportStatus) ? (r.status as ReportStatus) : null
    const name = clean(r.name, 60)
    if (!status || !name) continue
    items.push({
      name, status, category: clean(r.category, 20), easy: clean(r.easy, 200),
      reasons: list(r.reasons), todo: list(r.todo), need: list(r.need), fix: list(r.fix),
      applyName: clean(r.applyName, 40), applyUrl: safeLink(r.applyUrl),
    })
  }
  if (!items.length) return null
  const c = (b.counts ?? {}) as Record<string, unknown>
  const warnings = Array.isArray(b.warnings)
    ? b.warnings.slice(0, 8).map((w) => { const x = (w ?? {}) as Record<string, unknown>; return { tone: x.tone === 'stop' ? 'stop' as const : 'todo' as const, text: clean(x.text) } }).filter((w) => w.text)
    : []
  return {
    name: clean(b.name, 12), surveyType: b.surveyType,
    counts: { ok: count(c.ok), maybe: count(c.maybe), no: count(c.no) },
    warnings, unknown: list(b.unknown), items,
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const LABEL: Record<ReportStatus, string> = { ok: '✓ 신청할 수 있어요', maybe: '△ 확인해 보면 좋아요', no: '✕ 지금은 어려워요' }
const COLOR: Record<ReportStatus, string> = { ok: '#1d6b3a', maybe: '#8a5a00', no: '#8a8a8a' }

/** 받는 사람 주소 가리기: ab***@naver.com */
export const maskEmail = (e: string): string => { const [u, d] = e.split('@'); return `${u.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d ?? ''}` }

export function reportSubject(p: ReportPayload): string {
  return `[청정 세종] ${p.name ? `${p.name}님의 ` : ''}주거 지원 점검 결과 (${p.surveyType === 'deep' ? '심화' : '맛보기'} 설문)`
}

export function renderReport(p: ReportPayload, opts: { site: string; date: string }): { subject: string; html: string; text: string } {
  const subject = reportSubject(p)
  const order = (s: ReportStatus) => STATUSES.indexOf(s)
  const items = [...p.items].sort((a, b) => order(a.status) - order(b.status))
  const kind = p.surveyType === 'deep' ? '심화 설문' : '맛보기 설문'
  const ul = (xs: string[]) => (xs.length ? `<ul style="margin:6px 0 0;padding-left:18px">${xs.map((x) => `<li style="margin:2px 0">${esc(x)}</li>`).join('')}</ul>` : '')
  const block = (title: string, xs: string[]) => (xs.length ? `<p style="margin:10px 0 0;font-weight:700">${title}</p>${ul(xs)}` : '')

  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f3efe7;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1b1b1b;line-height:1.6">
<div style="max-width:640px;margin:0 auto;padding:28px 20px">
<p style="margin:0;font-size:13px;color:#555">청정 세종 · ${esc(kind)} 결과 리포트 · ${esc(opts.date)}</p>
<h1 style="font-size:22px;margin:8px 0 16px">${p.name ? `${esc(p.name)}님, ` : ''}주거 지원 점검 결과를 보내 드려요</h1>
<table role="presentation" style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px"><tr>
${STATUSES.map((s) => `<td style="padding:14px;text-align:center"><b style="font-size:24px;color:${COLOR[s]}">${p.counts[s]}</b><br><span style="font-size:13px">${LABEL[s]}</span></td>`).join('')}
</tr></table>
${p.warnings.length ? `<div style="margin:16px 0;padding:12px 14px;background:#fff;border-left:3px solid #c0392b">${p.warnings.map((w) => `<p style="margin:4px 0"><b>${w.tone === 'stop' ? '이것만은 조심해 주세요' : '미리 챙겨 두면 좋아요'}</b> · ${esc(w.text)}</p>`).join('')}</div>` : ''}
${p.unknown.length ? `<div style="margin:16px 0;padding:12px 14px;background:#fff;border-left:3px solid #8a5a00"><b>"잘 모르겠어요"라고 하신 항목은 대략적인 값으로 계산했어요. 확인해 보세요.</b>${ul(p.unknown)}</div>` : ''}
${items.map((it) => `<div style="margin:14px 0;padding:16px;background:#fff;border-radius:12px">
<p style="margin:0;font-size:13px;color:${COLOR[it.status]};font-weight:700">${LABEL[it.status]}${it.category ? ` · <span style="color:#555">${esc(it.category)}</span>` : ''}</p>
<h2 style="font-size:17px;margin:4px 0">${esc(it.name)}</h2>
${it.easy ? `<p style="margin:0;color:#444">${esc(it.easy)}</p>` : ''}
${ul(it.reasons)}${block('다음에 할 일', it.todo)}${block('준비할 서류·확인 항목', it.need)}${block('이렇게 해 볼 수 있어요', it.fix)}
${it.applyUrl && it.status !== 'no' ? `<p style="margin:12px 0 0"><a href="${esc(it.applyUrl)}" style="color:#1f3fbf;font-weight:700">${esc(it.applyName || '신청 안내')}에서 확인하기 →</a></p>` : ''}
</div>`).join('')}
<p style="margin:20px 0 6px"><a href="${esc(opts.site)}/result" style="display:inline-block;padding:12px 18px;background:#1b1b1b;color:#f3efe7;border-radius:999px;text-decoration:none;font-weight:700">사이트에서 결과 다시 보기</a></p>
<p style="font-size:12px;color:#666;margin-top:18px">결과는 참고용이에요. 최종 판단은 각 기관에서 해요. 이 메일은 청정 세종에서 결과 리포트 받기를 직접 요청하셨기 때문에 보냈어요. 더 받고 싶지 않으면 마이페이지 &lsquo;내 정보&rsquo;에서 이메일을 지워 주세요.</p>
</div></body></html>`

  const t: string[] = [`청정 세종 · ${kind} 결과 리포트 · ${opts.date}`, '', `${LABEL.ok} ${p.counts.ok}개 / ${LABEL.maybe} ${p.counts.maybe}개 / ${LABEL.no} ${p.counts.no}개`, '']
  for (const w of p.warnings) t.push(`[${w.tone === 'stop' ? '조심' : '챙길 것'}] ${w.text}`)
  if (p.unknown.length) t.push('', '확인해 볼 항목:', ...p.unknown.map((x) => `- ${x}`))
  for (const it of items) {
    t.push('', `■ ${it.name} — ${LABEL[it.status]}`, ...it.reasons.map((x) => `- ${x}`))
    if (it.todo.length) t.push('다음에 할 일:', ...it.todo.map((x) => `- ${x}`))
    if (it.need.length) t.push('준비할 서류:', ...it.need.map((x) => `- ${x}`))
    if (it.fix.length) t.push('이렇게 해 볼 수 있어요:', ...it.fix.map((x) => `- ${x}`))
    if (it.applyUrl && it.status !== 'no') t.push(`신청 안내: ${it.applyUrl}`)
  }
  t.push('', `결과 다시 보기: ${opts.site}/result`, '결과는 참고용이에요. 최종 판단은 각 기관에서 해요.')
  return { subject, html, text: t.join('\n') }
}
