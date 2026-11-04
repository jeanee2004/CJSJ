import type { SurveyType } from '../data/survey'
import { sessionId } from './session'
import { supabase } from './supabase'

// 사용 행동 추적: 가명 세션 ID 와 화면 이름만 모은다. 이메일·IP·계정 ID 는 절대 넣지 않는다.
// 큐에 모았다가 묶어서 보내고, 실패해도 사이트 동작에는 영향이 없다. Supabase 가 없으면 아무것도 하지 않는다.
export type EventType = 'page_view' | 'section_view' | 'click' | 'survey_start' | 'survey_answer' | 'survey_complete' | 'survey_abandon'
interface Row {
  session_id: string; event_type: EventType; name?: string; path?: string
  survey_type?: SurveyType; duration_ms?: number; device: 'mobile' | 'desktop'
}
interface Extra { name?: string; survey_type?: SurveyType; duration_ms?: number }

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const MAX_QUEUE = 200
const BATCH = 20
let queue: Row[] = []
let timer = 0

const device = (): 'mobile' | 'desktop' => {
  try { return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768 ? 'mobile' : 'desktop' } catch { return 'desktop' }
}

// 팀원 기기 제외: 주소에 ?internal=1 로 한 번 들어오면 이 기기의 기록을 보내지 않는다 (?internal=0 으로 해제)
const internal = (() => {
  try {
    const q = new URLSearchParams(location.search).get('internal')
    if (q === '1') localStorage.setItem('cjsj.internal', '1')
    if (q === '0') localStorage.removeItem('cjsj.internal')
    return localStorage.getItem('cjsj.internal') === '1'
  } catch { return false }
})()

export function track(event_type: EventType, extra: Extra = {}): void {
  if (!supabase || internal) return
  try {
    const row: Row = { session_id: sessionId(), event_type, path: location.pathname.slice(0, 200), device: device() }
    if (extra.name) row.name = extra.name.slice(0, 80)
    if (extra.survey_type) row.survey_type = extra.survey_type
    if (typeof extra.duration_ms === 'number' && Number.isFinite(extra.duration_ms))
      row.duration_ms = Math.min(86_400_000, Math.max(0, Math.round(extra.duration_ms)))
    if (queue.length >= MAX_QUEUE) queue.shift()
    queue.push(row)
    if (queue.length >= BATCH) void flush()
    else if (!timer) timer = window.setTimeout(() => { void flush() }, 5000)
  } catch { /* 추적 실패는 무시 */ }
}

/** 큐를 서버로 보낸다. 페이지가 닫히는 중(unload)에는 keepalive 요청으로 보낸다 */
export async function flush(unloading = false): Promise<void> {
  if (timer) { clearTimeout(timer); timer = 0 }
  if (!supabase || queue.length === 0) return
  const rows = queue
  queue = []
  try {
    if (unloading && URL_ && KEY) {
      void fetch(`${URL_}/rest/v1/events`, {
        method: 'POST', keepalive: true,
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(rows),
      }).catch(() => { /* noop */ })
    } else {
      const { error } = await supabase.from('events').insert(rows)
      if (error) throw error
    }
  } catch { /* 실패한 묶음은 버린다(재시도로 사이트가 느려지지 않게) */ }
}

// 홈 섹션: [이름, CSS 선택자]
const SECTIONS: [string, string][] = [
  ['hero', '.vhero'], ['intro', '#intro'], ['how', '#how'], ['live', '#live'], ['policies', '#policies'], ['data', '#data'],
]

/** 홈 섹션이 화면에 보인 시간을 잰다. 반환값은 정리 함수 */
export function observeSections(): () => void {
  if (!supabase || typeof IntersectionObserver === 'undefined') return () => {}
  const since = new Map<string, number>() // 이름 → 보이기 시작한 시각
  const inView = new Set<string>()
  const close = (name: string) => {
    const t = since.get(name)
    since.delete(name)
    if (t !== undefined && performance.now() - t >= 500) track('section_view', { name, duration_ms: performance.now() - t })
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const name = (e.target as HTMLElement).dataset.trackSec
      if (!name) continue
      if (e.isIntersecting) { inView.add(name); if (!document.hidden && !since.has(name)) since.set(name, performance.now()) }
      else { inView.delete(name); close(name) }
    }
  }, { threshold: [0.25] })
  for (const [name, sel] of SECTIONS) {
    const el = document.querySelector<HTMLElement>(sel)
    if (el) { el.dataset.trackSec = name; io.observe(el) }
  }
  const onVis = () => {
    if (document.hidden) [...since.keys()].forEach(close)
    else inView.forEach((n) => { if (!since.has(n)) since.set(n, performance.now()) })
  }
  document.addEventListener('visibilitychange', onVis)
  return () => {
    document.removeEventListener('visibilitychange', onVis)
    io.disconnect()
    ;[...since.keys()].forEach(close)
  }
}

/** 앱 시작 때 한 번: 클릭 위임 + 페이지 숨김/종료 시 전송 */
export function initTracking(): () => void {
  if (!supabase) return () => {}
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.('[data-track]')
    const name = el?.getAttribute('data-track')
    if (name) track('click', { name })
  }
  const onHide = () => { if (document.hidden) void flush(true) }
  const onPageHide = () => { void flush(true) }
  document.addEventListener('click', onClick, true)
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', onPageHide)
  return () => {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', onPageHide)
  }
}
