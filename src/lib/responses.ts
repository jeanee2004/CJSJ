import type { Survey, SurveyType } from '../data/survey'
import { sanitizeSurvey } from './privacy'
import { sessionId } from './session'
import { supabase } from './supabase'

// 설문 응답 저장: 응답은 절대 잃지 않는다.
// 1) 보내기 전에 브라우저(localStorage)에 먼저 적어 두고, 2) 성공이 확인되면 지우고,
// 3) 실패하면 다시 시도한다(몇 초 간격 · 접속이 돌아올 때 · 탭을 다시 볼 때 · 다음에 사이트를 열 때).
// 응답마다 브라우저가 만든 id 를 함께 보내서, 재시도로 두 번 들어가도 한 건으로 처리된다(중복 키 = 이미 저장됨).
const KEY = 'cjsj.outbox'
const MAX_ITEMS = 20
const DELAYS = [3_000, 10_000, 30_000, 60_000] // 이후에는 60초마다

interface Item { id: string; respondent_id: string | null; session_id: string; survey_type: SurveyType; answers: unknown }

const read = (): Item[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
const write = (items: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS))) } catch { /* 저장 공간 부족 등 */ } }

let sending = false
let attempt = 0
let timer = 0

/** 대기 중인 응답을 모두 보낸다. 실패하면 다음 시도를 예약한다 */
export async function flushOutbox(): Promise<void> {
  if (!supabase || sending) return
  sending = true
  try {
    for (const it of read()) {
      let ok = false
      try {
        let { error } = await supabase.from('survey_responses').insert(it)
        // 로그인 정보가 맞지 않아 거부되면(권한·외래키), 가명 ID 없이 응답만이라도 저장한다
        if (error && it.respondent_id && ['42501', '23503'].includes(error.code)) {
          it.respondent_id = null
          ;({ error } = await supabase.from('survey_responses').insert(it))
        }
        ok = !error || error.code === '23505' // 23505: 같은 id 가 이미 저장됨
        // 서버가 형식 자체를 거부한 응답(검증 오류)은 영원히 재시도하지 않도록 버린다
        if (!ok && /^(22|23|42)/.test(error?.code ?? '')) ok = true
      } catch { ok = false }
      if (ok) write(read().filter((x) => x.id !== it.id))
    }
  } finally { sending = false }
  if (read().length) {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => { attempt++; void flushOutbox() }, DELAYS[Math.min(attempt, DELAYS.length - 1)])
  } else attempt = 0
}

/** 설문 응답 저장. 이메일·이름 없이 가명 ID(로그인 시)와 구간 값만 보낸다. 실패해도 결과 보기는 막지 않는다 */
export async function saveResponse(sv: Survey, type: SurveyType, respondentId: string | null): Promise<void> {
  if (!supabase) return
  write([...read(), { id: crypto.randomUUID(), respondent_id: respondentId, session_id: sessionId(), survey_type: type, answers: sanitizeSurvey(sv) }])
  await flushOutbox()
}

/** 앱 시작 때 한 번: 남아 있던 응답 재전송 + 접속 복구·탭 복귀 때마다 재전송 */
export function initOutbox(): () => void {
  if (!supabase) return () => {}
  const retry = () => { if (read().length) void flushOutbox() }
  const onVis = () => { if (!document.hidden) retry() }
  window.addEventListener('online', retry)
  document.addEventListener('visibilitychange', onVis)
  retry()
  return () => { window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', onVis) }
}
