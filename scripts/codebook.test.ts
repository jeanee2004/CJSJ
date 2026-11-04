// api/_lib/codebook.ts 는 src/data/survey.tsx 를 api 빌드에서 import 할 수 없어 복제한 것이다.
// 이 테스트가 두 쪽이 어긋나면 실패한다. 갱신: GEN_CODEBOOK=1 npx vitest run scripts/codebook.test.ts
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { QUESTIONS, SIMPLE_IDS } from '../src/data/survey'
import { CODEBOOK, SIMPLE_IDS as API_SIMPLE } from '../api/_lib/codebook'

const build = () => QUESTIONS.map((q) => ({
  id: q.id,
  title: q.title,
  kind: q.kind,
  columns: q.kind === 'matrix' ? (q.rows ?? []).map((r) => ({ key: `${q.id}_${r.k}`, label: r.t }))
    : q.kind === 'numbers' ? (q.fields ?? []).map((f) => ({ key: `${q.id}_${f.k}`, label: `${f.label} (${f.unit}, 구간 하한)` }))
    : [{ key: q.id, label: q.title }],
  opts: [...(q.kind === 'matrix' ? q.cols ?? [] : q.opts ?? []).map((x) => ({ v: x.v, t: x.t })), ...(q.unk ? [{ v: 'unk', t: '잘 모르겠어요' }] : [])],
}))

describe('codebook', () => {
  it('src 문항과 일치', () => {
    if (process.env.GEN_CODEBOOK) {
      writeFileSync(new URL('../api/_lib/codebook.ts', import.meta.url),
        `// 자동 생성: GEN_CODEBOOK=1 npx vitest run scripts/codebook.test.ts (원본 src/data/survey.tsx)\nexport interface CodeQ { id: string; title: string; kind: string; columns: { key: string; label: string }[]; opts: { v: string; t: string }[] }\nexport const SIMPLE_IDS: string[] = ${JSON.stringify(SIMPLE_IDS)}\nexport const CODEBOOK: CodeQ[] = ${JSON.stringify(build())}\n`)
      return
    }
    expect(CODEBOOK).toEqual(build())
    expect(API_SIMPLE).toEqual(SIMPLE_IDS)
  })
})
