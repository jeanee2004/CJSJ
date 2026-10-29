// 행안부 공공서비스(정부24)·복지로 지자체복지·온통청년 응답을 하나의 목록으로 정규화한다.
// 필드명은 2026-10-28 실제 응답으로 확인했다.

export interface Benefit {
  source: 'gov24' | 'bokjiro' | 'youthcenter'
  id: string
  name: string
  summary: string
  org: string
  apply: string
  url: string
  /** 접수 기간 YYYYMMDD. 온통청년(aplyYmd)에만 구조화돼 있다 */
  begin?: string
  end?: string
  /** 정부24 신청기한 문구 (예: "상시신청", "금년 접수 마감") */
  deadline?: string
  /** 나이 기준. 출처마다 따로 모은다 (온통청년이 먼저). 출처끼리 어긋날 수 있어 판정 쪽에서 고른다 */
  ages?: AgeRange[]
  /** 소득·재산 등 원문 조건. 구조화돼 있지 않아 판정에 쓰지 않고 보여 주기만 한다 */
  conditions?: string
  /** 합쳐지기 전에 이 제도가 올라와 있던 출처들 (dedupe 가 채운다) */
  seen?: Benefit['source'][]
  /** 출처별 공식 원문. 합쳐도 버리지 않고 모두 남겨 화면에서 출처를 밝혀 보여 준다 */
  details?: Detail[]
}
export interface AgeRange { min: number; max: number; source: Benefit['source'] }
/** 한 출처가 올린 제도 원문 (필드명은 2026-10-29 실제 응답으로 확인) */
export interface Detail {
  source: Benefit['source']
  name: string
  /** 지원 내용: 정부24 지원내용 · 온통청년 plcySprtCn · 복지로 servDgst */
  support?: string
  /** 지원 대상: 정부24 지원대상 · 온통청년 earnEtcCn/addAplyQlfcCndCn */
  target?: string
  /** 신청 방법: 정부24 신청방법 · 온통청년 plcyAplyMthdCn · 복지로 aplyMtdNm */
  how?: string
  /** 문의처: 정부24 전화문의 · 복지로 담당 부서 */
  contact?: string
  url?: string
  /** 원문 최종 수정일 YYYYMMDD */
  updated?: string
}

// 원문이 길면 화면이 무너지지 않게 자른다. 줄바꿈은 남긴다
const MAX = 700
const clean = (t: string) => {
  const x = t.split(/\r?\n/).map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n')
  return x ? (x.length > MAX ? `${x.slice(0, MAX)}…` : x) : undefined
}
const ymd = (t: string) => t.replace(/\D/g, '').slice(0, 8) || undefined
const detail = (d: Detail): Detail => Object.fromEntries(Object.entries(d).filter(([, v]) => v)) as unknown as Detail

const age = (min: unknown, max: unknown, source: Benefit['source']): AgeRange[] => {
  const lo = Number(min) || 0
  const hi = Number(max) || 0
  if (!lo && !hi) return []
  return [{ min: lo, max: hi || 120, source }]
}

// "주거지"처럼 집과 무관하게 쓰이는 말은 걸리지 않게 낱말 단위로 본다
const HOUSING = /주거비|주거급여|주거 ?임대|주거 ?안정|주거 ?지원|임대료|임대주택|임차|월세|전세|보증금|쉐어하우스|주택/
const PEOPLE = /청년|신혼|대학생|사회초년생/
// 이미 받고 있는 사람의 변경·중지 신청 창구는 혜택이 아니다
const ADMIN = /변경신청|중지신청/

export function fromGov24(r: Record<string, unknown>): Benefit | null {
  const g = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '')
  const name = g('서비스명')
  const text = `${name} ${g('서비스목적요약')} ${g('지원대상')}`
  if (!name || ADMIN.test(name) || !HOUSING.test(text) || !PEOPLE.test(text)) return null
  const raw = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '')
  const details = [detail({ source: 'gov24', name, support: clean(raw('지원내용')), target: clean(raw('지원대상') || raw('선정기준')), how: clean([g('신청방법').replace(/\|\|/g, ', '), g('신청기한')].filter(Boolean).join(' · ')), contact: clean(g('전화문의')), url: g('상세조회URL'), updated: ymd(g('수정일시')) })]
  return { source: 'gov24', id: g('서비스ID'), name, summary: g('서비스목적요약'), org: [g('소관기관명'), g('부서명')].filter(Boolean).join(' '), apply: g('신청기한'), url: g('상세조회URL'), deadline: g('신청기한') || undefined, conditions: g('지원대상') || g('선정기준') || undefined, details }
}

/** 정부24 supportConditions 한 줄 → 나이 기준. JA0110/JA0111 이 나이 하한·상한 (2026-10-29 확인).
 *  나머지 JA 코드(무주택 등)는 코드표를 대조하기 전이라 쓰지 않는다 */
export const gov24Ages = (r: Record<string, unknown>): AgeRange[] => age(r.JA0110, r.JA0111, 'gov24')

export function fromBokjiro(r: Record<string, string>): Benefit | null {
  const text = `${r.servNm ?? ''} ${r.servDgst ?? ''} ${r.intrsThemaNmArray ?? ''}`
  const people = `${r.servNm ?? ''} ${r.lifeNmArray ?? ''} ${r.servDgst ?? ''}`
  if (!r.servNm || !HOUSING.test(text) || !PEOPLE.test(people)) return null
  // 문의처는 담당 부서만 (inqNum 은 조회수라 쓰지 않는다)
  const details = [detail({ source: 'bokjiro', name: r.servNm.trim(), support: clean(r.servDgst ?? ''), how: clean([r.aplyMtdNm, r.sprtCycNm && `지원 주기 ${r.sprtCycNm}`].filter(Boolean).join(' · ')), contact: clean(r.bizChrDeptNm ?? ''), url: r.servDtlLink, updated: ymd(r.lastModYmd ?? '') })]
  return { source: 'bokjiro', id: r.servId ?? '', name: r.servNm.trim(), summary: (r.servDgst ?? '').replace(/^[○ㅇ\s]+/, ''), org: r.bizChrDeptNm ?? '', apply: r.aplyMtdNm ?? '', url: r.servDtlLink ?? '', details }
}

export function fromYouthCenter(r: Record<string, unknown>): Benefit | null {
  const g = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '')
  if (!/세종/.test(g('sprvsnInstCdNm')) || !g('plcyNm')) return null
  const url = [g('aplyUrlAddr'), g('refUrlAddr1')].find((u) => /^https?:\/\//.test(u)) ?? ''
  const period = parsePeriod(g('aplyYmd'))
  // sprtTrgtAgeLmtYn 이 N 이면 나이 제한이 있다 (Y 면 0/0 으로 온다, 2026-10-29 확인)
  const ages = g('sprtTrgtAgeLmtYn') === 'N' ? age(g('sprtTrgtMinAge'), g('sprtTrgtMaxAge'), 'youthcenter') : []
  const conditions = [g('earnEtcCn'), g('addAplyQlfcCndCn')].filter(Boolean).join(' / ') || undefined
  const raw = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '')
  const details = [detail({ source: 'youthcenter', name: g('plcyNm'), support: clean(raw('plcySprtCn') || raw('plcyExplnCn')), target: clean(conditions ?? ''), how: clean([g('plcyAplyMthdCn'), g('srngMthdCn') && `선정: ${g('srngMthdCn')}`].filter(Boolean).join(' · ')), url, updated: ymd(g('lastMdfcnDt')) })]
  return { source: 'youthcenter', id: g('plcyNo'), name: g('plcyNm'), summary: g('plcyExplnCn').replace(/^[○ㅇ\s]+/, ''), org: g('sprvsnInstCdNm'), apply: g('aplyYmd') ? `신청 ${g('aplyYmd')}` : '', url, ...period, ...(ages.length ? { ages } : {}), conditions, details }
}

/** "20260601 ~ 20260630" → { begin, end }. 기간이 여러 개면 가장 늦게 끝나는 것 */
export function parsePeriod(s: string): { begin?: string; end?: string } {
  const all = [...s.matchAll(/(\d{8})\s*~\s*(\d{8})/g)].map((m) => ({ begin: m[1], end: m[2] }))
  return all.sort((a, b) => b.end.localeCompare(a.end))[0] ?? {}
}

/** 이름에서 공백·괄호·"세종" 수식어를 빼고 같은 제도를 하나로 합친다. 먼저 온 출처가 남는다. */
const norm = (n: string) => n.replace(/세종(특별자치)?시?|세종형|[\s()（）·]/g, '').replace(/사업$|운영$|보급$/, '')
export function dedupe(list: Benefit[]): Benefit[] {
  const by = new Map<string, Benefit>()
  for (const b of list) {
    const k = norm(b.name)
    const prev = by.get(k)
    if (!prev) { by.set(k, { ...b, seen: [b.source] }); continue }
    if (!prev.seen?.includes(b.source)) prev.seen = [...(prev.seen ?? []), b.source]
    // 먼저 온 출처(온통청년)를 남기고, 비어 있는 칸만 뒤 출처로 채운다
    for (const f of ['summary', 'url', 'begin', 'end', 'deadline', 'conditions'] as const) if (!prev[f] && b[f]) prev[f] = b[f]
    // 나이는 출처별로 모두 남겨 어긋나는지 볼 수 있게 한다
    if (b.ages?.length) prev.ages = [...(prev.ages ?? []), ...b.ages]
    if (b.details?.length) prev.details = [...(prev.details ?? []), ...b.details]
  }
  return [...by.values()]
}
