import { useState } from 'react'
import { Btn } from '../ui'

const OPTIONS = [
  { id: 'agent', t: '중개보수 (부동산 수수료)', d: '집 계약할 때 부동산에 내는 돈' },
  { id: 'move', t: '이사비', d: '짐 옮기는 비용, 청소, 입주 준비' },
  { id: 'guarantee', t: '보증료', d: '보증금 보호 보험·대출 보증 수수료' },
  { id: 'deposit', t: '보증금 자체', d: '큰 목돈을 한 번에 마련하는 일' },
  { id: 'rent', t: '매달 월세', d: '매달 나가는 월세 부담' },
  { id: 'gap', t: '지원을 못 받는 기간', d: '이사한 뒤 접수 때까지 기다려야 하는 기간' },
]
const KEY = 'cjsj.feedback'

// 역제안 수집 (S2). 데모: 이 기기에만 저장하고 서버로 보내지 않는다.
export function Feedback() {
  const [sel, setSel] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  })
  const [done, setDone] = useState(false)
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const submit = () => {
    try { localStorage.setItem(KEY, JSON.stringify(sel)) } catch { /* noop */ }
    setDone(true)
  }
  return (
    <div>
      <div className="choices" role="group" aria-label="집 구할 때 가장 마음 쓰이는 비용 (여러 개 선택 가능)">
        {OPTIONS.map((o, i) => (
          <button key={o.id} type="button" className="choice" aria-pressed={sel.includes(o.id)} onClick={() => toggle(o.id)}>
            <span className="k">{String.fromCharCode(65 + i)}</span>
            <span><b>{o.t}</b><small>{o.d}</small></span>
            <span className="tick" aria-hidden="true">{sel.includes(o.id) ? '✓' : ''}</span>
          </button>
        ))}
      </div>
      <div className="nav-row">
        <span className="hint">개인정보는 받지 않아요. 여러 개를 골라 주셔도 좋아요.</span>
        <Btn disabled={sel.length === 0} onClick={submit}>의견 보내기</Btn>
      </div>
      {done && <div className="thanks" role="status">소중한 이야기 고마워요! 이 기기에 저장해 두었어요. (체험 단계라 서버로는 전송되지 않아요)</div>}
    </div>
  )
}
