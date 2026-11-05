// 설문 raw data CSV 순수 함수: 직렬화, 마스킹, k-익명 치환, 코드북.
// 이메일·이름·계정 ID·session_id 는 어디에도 넣지 않는다.
import { CODEBOOK, SIMPLE_IDS } from './codebook.js'
import type { CodeQ } from './codebook.js'

export const K_MIN = 5
export const OTHER = '기타'
/** 준식별자 열. 이 조합이 K_MIN 건 미만이면 해당 행의 값을 '기타'로 바꾼다 */
export const QUASI = ['Q1', 'Q2', 'created_date'] as const

export interface ResponseRow {
  respondent_id: string | null
  survey_type: string
  answers: Record<string, unknown> | null
  created_at: string
}

// src/lib/privacy.ts 의 maskText 와 같은 규칙 (api 빌드는 src 를 import 할 수 없어 복제)
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE = /(\+?82[-. ]?)?0?1[0-9][-. ]?[0-9]{3,4}[-. ]?[0-9]{4}/g
export const maskText = (s: string): string => s.replace(EMAIL, '[이메일]').replace(PHONE, '[전화번호]')

/** CSV 한 칸: 수식 주입 방지(= + - @ 탭 CR 로 시작하면 앞에 '), 쉼표·따옴표·줄바꿈 이스케이프 */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** UTF-8 BOM + CRLF (엑셀에서 한글 유지) */
export const toCsv = (rows: unknown[][]): string => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'

/** KST 기준 YYYY-MM-DD (시각은 버린다) */
export function kstDate(iso: string): string {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '' : new Date(t + 9 * 3600_000).toISOString().slice(0, 10)
}

const scalar = (v: unknown): string => (v === null || v === undefined ? '' : typeof v === 'object' ? '' : String(v))

/** 문항 하나의 답을 열 값들로 펼친다 (columns 순서와 같음) */
export function cellsFor(q: CodeQ, raw: unknown): string[] {
  if (raw === undefined || raw === null) return q.columns.map(() => '')
  if (q.kind === 'matrix' || q.kind === 'numbers') {
    if (typeof raw !== 'object' || Array.isArray(raw)) return q.columns.map(() => scalar(raw)) // 'unk' 등
    const o = raw as Record<string, unknown>
    return q.columns.map((c) => scalar(o[c.key.slice(q.id.length + 1)]))
  }
  if (q.kind === 'multi') return [Array.isArray(raw) ? raw.map(scalar).join(';') : scalar(raw)]
  if (q.kind === 'text') return [typeof raw === 'string' ? maskText(raw).slice(0, 500) : '']
  return [scalar(raw)]
}

export const questionsFor = (type: 'simple' | 'deep' | 'all'): CodeQ[] =>
  type === 'simple' ? CODEBOOK.filter((q) => SIMPLE_IDS.includes(q.id)) : CODEBOOK

/** 사람이 읽는 형태의 중간 행: 헤더 -> 값 */
export type Flat = Record<string, string>

export function flatten(r: ResponseRow, no: number, qs: CodeQ[]): Flat {
  const f: Flat = { response_no: String(no), respondent_id: r.respondent_id ?? '', survey_type: r.survey_type, created_date: kstDate(r.created_at) }
  for (const q of qs) cellsFor(q, r.answers?.[q.id]).forEach((v, i) => { f[q.columns[i].key] = v })
  return f
}

/** k-익명: 준식별자 조합 크기가 k 미만인 행은 준식별자 값을 모두 '기타'로 바꾼다. 원본은 바꾸지 않는다. */
export function applyKAnonymity(rows: Flat[], k = K_MIN, quasi: readonly string[] = QUASI): Flat[] {
  const keyOf = (r: Flat) => quasi.map((c) => r[c] ?? '').join('\u0000')
  const size = new Map<string, number>()
  for (const r of rows) size.set(keyOf(r), (size.get(keyOf(r)) ?? 0) + 1)
  return rows.map((r) => {
    if ((size.get(keyOf(r)) ?? 0) >= k) return r
    const c = { ...r }
    for (const col of quasi) c[col] = OTHER
    return c
  })
}

/** 응답 목록 -> 최종 CSV. 입력은 시간순이어야 하고, response_no 는 이 CSV 안에서만 쓰는 일련 가명키 */
export function buildResponsesCsv(responses: ResponseRow[], type: 'simple' | 'deep' | 'all', k = K_MIN): string {
  const qs = questionsFor(type)
  const header = ['response_no', 'respondent_id', 'survey_type', 'created_date', ...qs.flatMap((q) => q.columns.map((c) => c.key))]
  const flat = applyKAnonymity(responses.map((r, i) => flatten(r, i + 1, qs)), k)
  return toCsv([header, ...flat.map((f) => header.map((h) => f[h] ?? ''))])
}

/** 코드북: 문항 코드, 문구, 선택지 코드, 선택지 문구 (행렬은 열 이름(Q10_1 등)을 문구 칸에 함께 표시) */
export function buildCodebookCsv(): string {
  const rows: unknown[][] = [['question_code', 'question_text', 'option_code', 'option_text']]
  for (const q of CODEBOOK) {
    const multi = q.columns.length > 1
    for (const c of q.columns) {
      const label = multi ? `${q.title} [${c.key}: ${c.label}]` : q.title
      if (q.kind === 'text') rows.push([c.key, label, '', '(자유 입력, 이메일·전화번호 마스킹)'])
      if (q.kind === 'numbers') rows.push([c.key, label, '', '(숫자: 구간 하한, 만원)'])
      for (const o of q.opts) rows.push([c.key, label, o.v, o.t])
    }
  }
  return toCsv(rows)
}

/** 기간 값 해석: ISO 날짜·시각을 받는다. `to` 가 날짜만(YYYY-MM-DD)이면 그날 끝(23:59:59.999Z)까지 포함한다. 잘못되면 'bad' */
export function parseBound(v: string | null, isEnd: boolean): string | null | 'bad' {
  if (!v) return null
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v)
  const t = Date.parse(dateOnly && isEnd ? `${v}T23:59:59.999Z` : v)
  return Number.isNaN(t) ? 'bad' : new Date(t).toISOString()
}
