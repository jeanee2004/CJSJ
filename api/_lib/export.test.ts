import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { applyKAnonymity, buildCodebookCsv, buildResponsesCsv, csvCell, kstDate, maskText, parseBound, toCsv } from './export.js'
import type { Flat, ResponseRow } from './export.js'
import { GET } from '../admin-export.js'

describe('csv 직렬화', () => {
  it('이스케이프와 수식 주입 방지', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('l1\nl2')).toBe('"l1\nl2"')
    for (const s of ['=1+1', '+1', '-1', '@x']) expect(csvCell(s)).toBe(`'${s}`)
    expect(csvCell('=a,b')).toBe(`"'=a,b"`)
    expect(csvCell(null)).toBe('')
  })
  it('BOM + CRLF', () => {
    const c = toCsv([['a', 'b'], ['1', '2']])
    expect(c.startsWith('﻿')).toBe(true)
    expect(c).toBe('﻿a,b\r\n1,2\r\n')
  })
})

describe('마스킹·날짜', () => {
  it('이메일·전화 마스킹', () => {
    expect(maskText('연락 a.b@c.kr / 010-1234-5678')).toBe('연락 [이메일] / [전화번호]')
  })
  it('KST 날짜만', () => {
    expect(kstDate('2026-10-31T16:30:00Z')).toBe('2026-11-01')
    expect(kstDate('bad')).toBe('')
  })
})

describe('k-익명', () => {
  const mk = (q1: string, d = '2026-11-01'): Flat => ({ Q1: q1, Q2: '1', created_date: d, Q5: '3' })
  it('5건 미만 조합은 준식별자를 기타로, 이상은 유지', () => {
    const rows = [...Array(5).fill(0).map(() => mk('1')), mk('2'), mk('1', '2026-11-02')]
    const out = applyKAnonymity(rows, 5)
    expect(out.slice(0, 5).every((r) => r.Q1 === '1' && r.created_date === '2026-11-01')).toBe(true)
    expect(out[5]).toMatchObject({ Q1: '기타', Q2: '기타', created_date: '기타', Q5: '3' })
    expect(out[6].Q1).toBe('기타')
    expect(rows[5].Q1).toBe('2') // 원본 불변
  })
})

describe('응답 CSV', () => {
  const r = (extra: Partial<ResponseRow> = {}): ResponseRow => ({
    respondent_id: null, survey_type: 'simple', created_at: '2026-11-01T03:00:00Z',
    answers: { Q1: '2', Q2: '1', Q13: { '1': '2', '3': '4' }, N2: { deposit: 3000, rent: 50 }, Q21: 'x' }, ...extra,
  })
  it('열 구성과 값, 개인 정보 열 없음', () => {
    const csv = buildResponsesCsv(Array(5).fill(0).map(() => r({ respondent_id: 'rid-1' })), 'simple')
    const [head, line] = csv.replace('﻿', '').split('\r\n')
    expect(head.startsWith('response_no,respondent_id,survey_type,created_date,Q1,Q2')).toBe(true)
    expect(head).toContain('Q13_1')
    expect(head).toContain('N2_deposit')
    expect(head).not.toMatch(/session|email|이메일|Q21/)
    expect(line.startsWith('1,rid-1,simple,2026-11-01,2,1')).toBe(true)
  })
  it('deep 에서 자유입력 재마스킹, 소수 조합은 기타', () => {
    const csv = buildResponsesCsv([r({ survey_type: 'deep', answers: { Q1: '2', Q21: '=cmd 010-1111-2222' } })], 'deep')
    expect(csv).toContain(`'=cmd [전화번호]`)
    expect(csv).toContain('1,,deep,기타')
  })
  it('코드북', () => {
    const c = buildCodebookCsv()
    expect(c.startsWith('﻿question_code,question_text,option_code,option_text')).toBe(true)
    expect(c).toContain('Q1,연령대를 선택해 주세요.,1,19~24세')
    expect(c).toContain('Q10_1')
  })
})

describe('admin-export 인증', () => {
  const call = (headers: Record<string, string> = {}, qs = '') => GET(new Request(`https://x.test/api/admin-export${qs}`, { headers }))
  it('토큰 없으면 401', async () => {
    expect((await call()).status).toBe(401)
    expect((await call({ authorization: 'Basic abc' })).status).toBe(401)
  })
  it('잘못된 type 은 400', async () => { expect((await call({}, '?type=zzz')).status).toBe(400) })
  const KEYS = ['SUPABASE_SECRET_KEY', 'SUPABASE_URL', 'VITE_SUPABASE_URL'] as const
  const withEnv = async (env: Partial<Record<(typeof KEYS)[number], string>>, fn: () => Promise<void>) => {
    const prev = KEYS.map((k) => process.env[k])
    for (const k of KEYS) { if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k] }
    try { await fn() } finally { KEYS.forEach((k, i) => { if (prev[i] === undefined) delete process.env[k]; else process.env[k] = prev[i] }) }
  }
  it('설정 없으면 500', async () => {
    await withEnv({}, async () => { expect((await call({ authorization: 'Bearer abc' })).status).toBe(500) })
  })
  it('잘못된 토큰은 401 (가짜 Supabase 서버가 거절)', async () => {
    const srv = createServer((_q, res) => { res.writeHead(401, { 'content-type': 'application/json' }); res.end('{"msg":"invalid JWT"}') })
    await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok))
    const port = (srv.address() as AddressInfo).port
    try {
      await withEnv({ SUPABASE_SECRET_KEY: 'test-secret', SUPABASE_URL: `http://127.0.0.1:${port}` }, async () => {
        const res = await call({ authorization: 'Bearer bad.token.value' })
        expect(res.status).toBe(401)
        expect(await res.text()).not.toContain('test-secret')
      })
    } finally { srv.close() }
  })
})

describe('parseBound', () => {
  it('to 가 날짜만이면 그날 끝까지 포함한다', () => {
    expect(parseBound('2026-11-04', true)).toBe('2026-11-04T23:59:59.999Z')
    expect(parseBound('2026-11-04', false)).toBe('2026-11-04T00:00:00.000Z')
  })
  it('시각이 있으면 그대로, 비면 null, 잘못되면 bad', () => {
    expect(parseBound('2026-11-04T05:00:00Z', true)).toBe('2026-11-04T05:00:00.000Z')
    expect(parseBound(null, true)).toBeNull()
    expect(parseBound('내일', true)).toBe('bad')
  })
})
