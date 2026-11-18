import { describe, expect, it } from 'vitest'
import * as server from './account.js'
import * as client from '../../src/lib/account.js'
import { maskEmail, parsePayload, renderReport, safeLink } from './report.js'

describe('아이디 가입 규칙', () => {
  it('서버와 프런트 규칙이 같다', () => {
    expect(client.LOGIN_DOMAIN).toBe(server.LOGIN_DOMAIN)
    expect(client.LOGIN_ID_RE.source).toBe(server.LOGIN_ID_RE.source)
    expect(client.PASSWORD_MIN).toBe(server.PASSWORD_MIN)
    for (const id of ['sejong', 'Sejong_01', ' abcd ', 'abc', '1abcd', 'a'.repeat(21), 'ab-cd', '한글아이디'])
      expect(client.isValidLoginId(id)).toBe(server.isValidLoginId(server.normalizeLoginId(id)))
  })
  it('아이디는 내부 주소로, 이메일은 그대로 로그인한다', () => {
    expect(client.loginAddress(' Sejong_01 ')).toBe('sejong_01@id.cjsj.invalid')
    expect(server.loginEmailOf('Sejong_01')).toBe('sejong_01@id.cjsj.invalid')
    expect(client.loginAddress('old@naver.com')).toBe('old@naver.com')
    expect(client.accountLabel('sejong_01@id.cjsj.invalid')).toBe('sejong_01')
    expect(client.accountLabel('old@naver.com')).toBe('old@naver.com')
  })
  it('리포트 이메일은 선택이고 형식만 본다', () => {
    expect(server.cleanReportEmail(undefined)).toBe('')
    expect(server.cleanReportEmail('  ')).toBe('')
    expect(server.cleanReportEmail(' me@naver.com ')).toBe('me@naver.com')
    expect(server.cleanReportEmail('not-an-email')).toBeNull()
    expect(server.cleanReportEmail('x@id.cjsj.invalid')).toBeNull()
    expect(server.cleanReportEmail(42)).toBeNull()
    expect(client.isValidEmail('me@naver.com')).toBe(true)
    expect(client.isValidEmail('x@id.cjsj.invalid')).toBe(false)
  })
})

describe('결과 리포트 메일', () => {
  const body = {
    name: '세종<b>청년</b>', surveyType: 'deep', counts: { ok: 1, maybe: 1, no: 0 },
    warnings: [{ tone: 'stop', text: '잔금은 <script>alert(1)</script> 기다려요' }],
    unknown: ['정확한 만 나이'],
    items: [
      { name: '세종 임대료 지원', category: '월세지원', status: 'ok', easy: '월세 지원', reasons: ['나이 OK'], todo: ['전입신고'], need: ['등본'], fix: [], applyName: '세종시청', applyUrl: 'https://www.sejong.go.kr/x?a=1' },
      { name: '수상한 제도', category: '대출', status: 'maybe', easy: '', reasons: [], todo: [], need: [], fix: [], applyName: '피싱', applyUrl: 'https://evil.example.com/login' },
      { name: '', status: 'ok' },
      { name: '상태 없음', status: 'weird' },
    ],
  }
  it('형식이 틀리면 거부한다', () => {
    expect(parsePayload(null)).toBeNull()
    expect(parsePayload({ ...body, surveyType: 'x' })).toBeNull()
    expect(parsePayload({ ...body, items: [] })).toBeNull()
  })
  it('잘못된 항목은 빼고, 허용하지 않은 링크는 지운다', () => {
    const p = parsePayload(body)!
    expect(p.items.map((i) => i.name)).toEqual(['세종 임대료 지원', '수상한 제도'])
    expect(p.items[0].applyUrl).toBe('https://www.sejong.go.kr/x?a=1')
    expect(p.items[1].applyUrl).toBe('')
    expect(safeLink('https://www.myhome.go.kr/')).toBe('https://www.myhome.go.kr/')
    expect(safeLink('https://www.applyhome.co.kr/a')).toBe('https://www.applyhome.co.kr/a')
    expect(safeLink('http://www.gov.kr/')).toBe('')
    expect(safeLink('https://gov.kr.evil.com/')).toBe('')
  })
  it('HTML 을 이스케이프한다', () => {
    const m = renderReport(parsePayload(body)!, { site: 'https://cjsj-one.vercel.app', date: '2026-11-18' })
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&lt;script&gt;')
    expect(m.html).not.toContain('evil.example.com')
    expect(m.subject).toContain('심화')
    expect(m.text).toContain('세종 임대료 지원')
  })
  it('받는 주소를 가린다', () => {
    expect(maskEmail('abcdef@naver.com')).toBe('ab****@naver.com')
    expect(maskEmail('a@b.co')).toBe('a*@b.co')
  })
})
