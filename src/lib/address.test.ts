import { describe, expect, it } from 'vitest'
import { lotFromPostcode } from './address'

describe('우편번호 → 건축물대장 코드', () => {
  it('일반 지번', () => {
    expect(lotFromPostcode({ bcode: '3611025032', jibunAddress: '세종특별자치시 조치원읍 신안리 151' }))
      .toEqual({ sigunguCd: '36110', bjdongCd: '25032', bun: '0151', ji: '0000', platGbCd: '0' })
  })
  it('부번이 있는 지번', () => {
    expect(lotFromPostcode({ bcode: '3611025032', jibunAddress: '세종특별자치시 조치원읍 신안리 140-7' })?.ji).toBe('0007')
  })
  it('산 지번은 platGbCd=1 (붙여 쓰기·띄어 쓰기 모두)', () => {
    expect(lotFromPostcode({ bcode: '3611031021', jibunAddress: '세종특별자치시 연기면 세종리 산12-3' })).toMatchObject({ bun: '0012', ji: '0003', platGbCd: '1' })
    expect(lotFromPostcode({ bcode: '3611031021', jibunAddress: '세종특별자치시 연기면 세종리 산 12' })).toMatchObject({ bun: '0012', platGbCd: '1' })
  })
  it('도로명을 골랐으면 autoJibunAddress 를 쓴다', () => {
    expect(lotFromPostcode({ bcode: '3611025021', jibunAddress: '', autoJibunAddress: '세종특별자치시 조치원읍 원리 2-3' })?.bun).toBe('0002')
  })
  it('지번이 없거나 bcode 가 이상하면 null', () => {
    expect(lotFromPostcode({ bcode: '3611025021', jibunAddress: '', autoJibunAddress: '' })).toBeNull()
    expect(lotFromPostcode({ bcode: '36110', jibunAddress: '세종특별자치시 조치원읍 원리 2-3' })).toBeNull()
  })
})
