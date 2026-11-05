import { useState } from 'react'
import { Btn } from '../ui'
import { track } from '../lib/track'
import { sessionId } from '../lib/session'
import { supabase } from '../lib/supabase'
import { COMMENT_MAX, FEEDBACK_OPTIONS as OPTIONS } from '../data/feedback'

const KEY = 'cjsj.feedback'

// 의견 남기기: 고른 보기와 선택 입력 한마디를 Supabase feedback 표로 보낸다 (운영팀 대시보드에서만 보임).
// 이름·이메일·계정 ID 는 보내지 않고, 이 기기에도 고른 보기를 기억해 둔다.
export function Feedback() {
  const [sel, setSel] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  })
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'fail'>('idle')
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const submit = async () => {
    setState('sending')
    try { localStorage.setItem(KEY, JSON.stringify(sel)) } catch { /* noop */ }
    track('click', { name: `feedback:${sel.join(',')}` })
    if (!supabase) return setState('done') // 체험 모드: 서버 없이 기록만 남기고 끝낸다
    const { error } = await supabase.from('feedback').insert({
      session_id: sessionId(), choices: sel, comment: comment.trim() || null,
      device: window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768 ? 'mobile' : 'desktop',
    })
    setState(error ? 'fail' : 'done')
  }
  const sent = state === 'done'
  return (
    <div>
      <div className="choices" role="group" aria-label="집 구할 때 가장 마음 쓰이는 비용 (여러 개 선택 가능)">
        {OPTIONS.map((o, i) => (
          <button key={o.id} type="button" className="choice" aria-pressed={sel.includes(o.id)} disabled={sent} onClick={() => toggle(o.id)}>
            <span className="k">{String.fromCharCode(65 + i)}</span>
            <span><b>{o.t}</b><small>{o.d}</small></span>
            <span className="tick" aria-hidden="true">{sel.includes(o.id) ? '✓' : ''}</span>
          </button>
        ))}
      </div>
      <div className="field fb-more">
        <label htmlFor="fb-comment">더 하고 싶은 말이 있나요? (선택)</label>
        <textarea id="fb-comment" rows={3} maxLength={COMMENT_MAX} value={comment} disabled={sent} placeholder="예: 이사하고 나서 접수까지 기다리는 석 달이 제일 힘들었어요"
          onChange={(e) => setComment(e.target.value)} />
        <small className="hint">{comment.length}/{COMMENT_MAX} · 이름·전화번호·이메일은 적지 마세요</small>
      </div>
      <div className="nav-row">
        <span className="hint">보낸 의견은 <b>청정 세종 운영팀의 통계 화면</b>으로만 전달돼요. 이름·이메일은 받지 않고, 개인을 알아볼 수 없게 모아서 봐요.</span>
        <Btn disabled={sel.length === 0 || state === 'sending' || sent} onClick={() => void submit()}>{state === 'sending' ? '보내는 중…' : sent ? '보냈어요' : '의견 보내기'}</Btn>
      </div>
      {sent && <div className="thanks" role="status">소중한 이야기 고마워요! 이름 없이 고른 보기{comment.trim() ? '와 한마디' : ''}만 운영팀에 전달했어요.</div>}
      {state === 'fail' && <div className="thanks" role="status">보내지 못했어요. 잠시 후 다시 눌러 주세요.</div>}
    </div>
  )
}
