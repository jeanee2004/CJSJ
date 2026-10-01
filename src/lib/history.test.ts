import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_ANSWERS } from './eligibility'
import { LEGACY_KEY, cleanupLegacy, initialAnswers, onLogin, onLogout, saveIfMember, savedKey } from './history'
import type { KV } from './history'

let db: Map<string, string>
const kv: KV = { get: (k) => db.get(k) ?? null, set: (k, v) => void db.set(k, v), remove: (k) => void db.delete(k) }
const A = { ...DEFAULT_ANSWERS, age: 29 }
const B = { ...DEFAULT_ANSWERS, age: 33 }

describe('지난 결과: 회원 전용', () => {
  beforeEach(() => { db = new Map() })

  it('비회원이 진단해도 아무것도 저장되지 않는다', () => {
    saveIfMember(null, A, kv)
    expect(db.size).toBe(0)
  })
  it('비회원이 새로고침하면 결과가 없다', () => {
    saveIfMember(null, A, kv)
    expect(initialAnswers(null, kv)).toBeNull()
  })
  it('예전 버전이 남긴 공용 결과는 비회원에게 보이지 않고, 시작할 때 지워진다', () => {
    db.set(LEGACY_KEY, JSON.stringify(A))
    expect(initialAnswers(null, kv)).toBeNull()
    cleanupLegacy(kv)
    expect(db.has(LEGACY_KEY)).toBe(false)
  })
  it('회원은 자기 이름의 키에 저장하고 다시 불러온다', () => {
    saveIfMember('카카오', A, kv)
    expect(db.has(savedKey('카카오'))).toBe(true)
    expect(initialAnswers('카카오', kv)).toEqual(A)
  })
  it('다른 회원의 결과는 보이지 않는다', () => {
    saveIfMember('카카오', A, kv)
    expect(initialAnswers('구글', kv)).toBeNull()
  })
  it('로그인하면: 방금 비회원으로 한 진단이 있으면 내 계정에 저장한다', () => {
    expect(onLogin('카카오', B, kv)).toEqual(B)
    expect(initialAnswers('카카오', kv)).toEqual(B)
  })
  it('로그인하면: 방금 한 진단이 없으면 저장해 둔 결과를 불러온다', () => {
    saveIfMember('카카오', A, kv)
    expect(onLogin('카카오', null, kv)).toEqual(A)
  })
  it('로그인했는데 아무 결과도 없으면 없음', () => {
    expect(onLogin('카카오', null, kv)).toBeNull()
  })
  it('로그아웃하면 화면에서 치우지만 계정에는 남는다', () => {
    saveIfMember('카카오', A, kv)
    expect(onLogout()).toBeNull()
    expect(initialAnswers(null, kv)).toBeNull()
    expect(initialAnswers('카카오', kv)).toEqual(A)
  })
})
