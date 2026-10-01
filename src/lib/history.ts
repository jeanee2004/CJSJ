// "지난 결과" 저장 규칙 (회원 전용).
//  · 비회원: 결과를 저장하지 않는다(화면 메모리에만 있다가 새로고침·로그아웃하면 사라진다)
//  · 회원: 이름별 키에 저장하고, 다시 로그인하면 불러온다
//  · 비회원으로 방금 진단한 결과가 있는 상태에서 로그인하면 그 결과를 내 계정에 저장한다
import type { Answers } from './eligibility'

export interface KV {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export const LEGACY_KEY = 'cjsj.answers' // 로그인과 무관하게 남기던 이전 버전의 저장 결과
export const savedKey = (name: string) => `cjsj.answers.${name}`

const parse = (s: string | null): Answers | null => {
  if (!s) return null
  try { return JSON.parse(s) as Answers } catch { return null }
}

/** 시작할 때: 예전 공용 저장 결과를 지운다 */
export function cleanupLegacy(kv: KV) { kv.remove(LEGACY_KEY) }

/** 시작할 때 보여줄 결과: 로그인 상태일 때만 저장된 결과를 불러온다 */
export function initialAnswers(userName: string | null, kv: KV): Answers | null {
  return userName ? parse(kv.get(savedKey(userName))) : null
}

/** 진단을 마쳤을 때: 회원만 저장한다 */
export function saveIfMember(userName: string | null, answers: Answers, kv: KV) {
  if (userName) kv.set(savedKey(userName), JSON.stringify(answers))
}

/** 로그인했을 때 화면에 보일 결과를 돌려준다 */
export function onLogin(userName: string, inMemory: Answers | null, kv: KV): Answers | null {
  if (inMemory) {
    kv.set(savedKey(userName), JSON.stringify(inMemory))
    return inMemory
  }
  return parse(kv.get(savedKey(userName)))
}

/** 로그아웃하면 화면에서 결과를 치운다(계정에 저장된 결과는 남는다) */
export const onLogout = (): null => null
