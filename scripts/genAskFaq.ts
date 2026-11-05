// 자주 묻는 질문 답을 만들어 src/data/askFaq.ts 에 저장한다. (한 번만 돌리고 결과를 커밋한다)
// 실행: GEMINI_API_KEY=... npx tsx scripts/genAskFaq.ts [시작번호] — 무료 사용량을 지키려고 4개씩 묶어 한 번에 부르고, 호출 사이를 9초 띄운다.
// 실패하면 바로 멈춘다(재시도 폭주 없음). 중간 결과는 scratch 파일에 남아 이어서 돌릴 수 있다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { generate } from '../api/_lib/gemini.js'
import { ASK_LINKS, ASK_SECTIONS, sanitize } from '../api/_lib/askCore.js'
import { ASK_POLICIES, ASK_TERMS } from '../api/_lib/askCatalog.js'
import { SEEDS } from './askFaqSeeds.js'

const PROGRESS = process.env.FAQ_PROGRESS ?? '/tmp/askfaq.progress.json'
const BATCH = 4
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const list = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join(', ')

const prompt = (seeds: typeof SEEDS) => `너는 세종시 청년의 집 구하기 안내 사이트 "청정 세종"의 도우미야. 부동산을 처음 접하는 초보가 읽는 "미리 정리해 둔 답"을 만든다.
각 질문마다 아래 형식의 객체를 만들어 JSON 배열 하나로만 답해: [{"id":"","answer":"","followups":[],"policies":[],"terms":[],"links":[],"sections":[]}]
규칙:
- answer: 3~4문장, 중학생도 알 쉬운 말, 용어는 풀어서. 구체적인 금액·비율·기간·마감일은 바뀔 수 있으니 숫자를 쓰지 말고 "보통", "일반적으로"로 쓰고 공식 사이트 확인을 안내. 확실하지 않은 사실은 쓰지 마. 투자·법률 자문처럼 쓰지 마. 첫 문장에 바로 핵심을 말해.
- followups: 이어서 궁금해할 만한 질문 2~3개, 각 30자 이내, "~가 궁금하신가요?" 형태.
- policies/terms/links/sections: 아래 목록의 키만. 질문과 정말 관련 있는 것만(제도 최대 4, 용어 최대 4, 링크 최대 3, 화면 최대 2).
[제도 키] ${list(ASK_POLICIES)}
[용어 키] ${list(ASK_TERMS)}
[링크 키] ${Object.entries(ASK_LINKS).map(([k, v]) => `${k}=${v.name}(${v.about})`).join(', ')}
[화면 키] live=실시간 집 소식·실거래가, policies=세종 주요 지원 제도, survey=내 상황 설문, data=숫자로 보는 세종 청년의 집
[질문]
${seeds.map((s) => `${s.id}: ${s.q}`).join('\n')}`

const done: Record<string, ReturnType<typeof sanitize>> = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf8')) : {}
const todo = SEEDS.filter((s) => !done[s.id])
console.log(`남은 질문 ${todo.length}개 / 호출 ${Math.ceil(todo.length / BATCH)}회 예정`)
for (let i = 0; i < todo.length; i += BATCH) {
  const part = todo.slice(i, i + BATCH)
  const text = await generate(prompt(part), { json: true, maxTokens: 4000, perModelMs: 30_000 })
  if (!text) { console.error('호출 실패 — 여기서 멈춥니다(사용량 보호). 잠시 뒤 다시 실행하면 이어서 합니다.'); break }
  let arr: unknown[] = []
  try { arr = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim()) } catch { console.error('JSON 해석 실패 — 멈춥니다'); break }
  for (const item of arr as { id?: string }[]) {
    const seed = part.find((s) => s.id === item.id)
    const ok = seed && sanitize(item)
    if (seed && ok) done[seed.id] = ok
  }
  writeFileSync(PROGRESS, JSON.stringify(done))
  console.log(`진행 ${Object.keys(done).length}/${SEEDS.length}`)
  if (i + BATCH < todo.length) await wait(9000)
}

const missing = SEEDS.filter((s) => !done[s.id]).map((s) => s.id)
if (missing.length) { console.error('아직 없는 항목:', missing.join(', ')); process.exit(missing.length === SEEDS.length ? 1 : 0) }
const entries = SEEDS.map((s) => {
  const a = done[s.id]!
  return { id: s.id, q: s.q, keys: s.keys, answer: a.answer, followups: a.followups, policies: a.policies, terms: a.terms,
    links: a.links.map((k) => ({ key: k, ...ASK_LINKS[k] })), sections: a.sections.map((k) => ({ key: k, ...ASK_SECTIONS[k] })) }
})
writeFileSync(new URL('../src/data/askFaq.ts', import.meta.url), `// 자동 생성: npx tsx scripts/genAskFaq.ts (씨앗: scripts/askFaqSeeds.ts). 직접 고쳐도 되지만 다시 생성하면 덮어쓴다.\nimport type { FaqEntry } from '../lib/askFaq'\nexport const FAQ: FaqEntry[] = ${JSON.stringify(entries, null, 1)}\n`)
console.log('저장 완료:', entries.length, '개')
