import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { QUESTIONS } from '../src/data/survey'

// 서버 검증(validate_survey)이 받아 주는 응답 키 형식과 실제 문항 id 가 어긋나면, 그 설문 응답은 저장되지 않는다.
// (003 에서 심화 문항 Q8-1 등이 거부돼 심화 응답이 모두 빠졌던 일의 재발 방지)
const DIR = new URL('../supabase/migrations/', import.meta.url)
const latestKeyRule = (): RegExp => {
  const files = readdirSync(DIR).filter((f: string) => f.endsWith('.sql')).sort()
  let rule = ''
  for (const f of files) {
    const m = /k !~ '([^']+)'/.exec(readFileSync(new URL(f, DIR), 'utf8'))
    if (m) rule = m[1]
  }
  return new RegExp(rule)
}

describe('설문 응답 키 검증', () => {
  it('모든 문항 id 가 서버 검증 규칙을 통과한다', () => {
    const re = latestKeyRule()
    const bad = QUESTIONS.map((q) => q.id).filter((id) => !re.test(id))
    expect(bad).toEqual([])
  })
})
