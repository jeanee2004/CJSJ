import { useState } from 'react'

const OPTIONS = [
  { id: 'agent', t: '중개보수(부동산 수수료)', d: '집 계약할 때 부동산에 내는 돈' },
  { id: 'move', t: '이사비', d: '짐 옮기는 비용, 청소, 입주 준비' },
  { id: 'guarantee', t: '보증료', d: '보증금 보호 보험·대출 보증 수수료' },
  { id: 'deposit', t: '보증금 자체', d: '큰 목돈을 한 번에 마련하는 일' },
  { id: 'rent', t: '매달 월세', d: '월세 부담이 계속 쌓여요' },
  { id: 'gap', t: '지원을 못 받는 기간', d: '전입 후 접수 때까지 기다리는 공백' },
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
    <div className="card feedback">
      <p style={{ fontWeight: 700, marginBottom: 14 }}>해당하는 걸 모두 골라주세요.</p>
      <div className="opts">
        {OPTIONS.map((o) => (
          <button key={o.id} type="button" className="opt" aria-pressed={sel.includes(o.id)} onClick={() => toggle(o.id)}>
            {sel.includes(o.id) ? '✓ ' : ''}{o.t}
            <small>{o.d}</small>
          </button>
        ))}
      </div>
      <div className="nav-row">
        <span className="hint">개인정보는 받지 않아요.</span>
        <button className="pill" type="button" disabled={sel.length === 0} onClick={submit}>보내기</button>
      </div>
      {done && <div className="thanks" role="status">고마워요! 이 기기에 저장했어요. (데모 단계라 서버로는 전송되지 않아요)</div>}
    </div>
  )
}
