import { describe, expect, it } from 'vitest'
import { landingProps } from './track'

describe('landingProps (유입 경로)', () => {
  it('외부 도메인만 남기고 주소 전체는 버린다', () => {
    expect(landingProps('https://www.instagram.com/p/abc?x=1', '', 'cjsj-one.vercel.app')).toEqual({ ref: 'instagram.com' })
  })
  it('같은 사이트 이동은 빼고, utm_source 는 정리해서 보낸다', () => {
    expect(landingProps('https://cjsj-one.vercel.app/admin', '', 'cjsj-one.vercel.app')).toBeUndefined()
    expect(landingProps('', '?utm_source=Insta Gram!&utm_medium=x', 'h')).toEqual({ utm: 'instagram' })
  })
  it('잘못된 referrer·빈 값은 무시한다', () => {
    expect(landingProps('not a url', '', 'h')).toBeUndefined()
    expect(landingProps('', '', 'h')).toBeUndefined()
  })
})
