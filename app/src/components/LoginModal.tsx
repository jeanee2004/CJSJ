import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn } from '../ui'
import { useStore } from '../store'

// 데모용 로그인: 실제 인증·서버 전송 없음. 이름만 이 브라우저에 저장한다.
export function LoginModal() {
  const { loginOpen, setLoginOpen, login } = useStore()
  const [name, setName] = useState('')
  const first = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!loginOpen) return
    first.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setLoginOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [loginOpen, setLoginOpen])

  const done = (via: string, n?: string) => {
    login({ name: (n || name || '청년').trim() || '청년', via })
    setLoginOpen(false)
    setName('')
  }

  return (
    <AnimatePresence>
      {loginOpen && (
        <motion.div className="overlay" onClick={() => setLoginOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="modal" role="dialog" aria-modal="true" aria-labelledby="login-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, rotate: -1.5 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 40, opacity: 0 }}
            transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.6 }}
          >
            <button className="circle close" type="button" aria-label="닫기" onClick={() => setLoginOpen(false)}>✕</button>
            <span className="label">LOG IN · DEMO</span>
            <h2 id="login-title">지난 결과를<br /><span className="it" style={{ fontSize: '1.15em' }}>이어서</span> 볼까요?</h2>
            <div className="demo-note">
              <b>데모 화면이에요.</b> 실제 계정은 만들어지지 않고, 입력한 내용은 이 기기 브라우저에만 저장돼요. 서버로 보내지 않아요.
            </div>
            <div className="social">
              <button ref={first} className="kakao" type="button" onClick={() => done('kakao', '카카오')}>카카오로 계속하기</button>
              <button type="button" onClick={() => done('google', '구글')}>구글로 계속하기</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); done('email') }}>
              <div className="field">
                <label htmlFor="nick">또는 별명만 입력하기</label>
                <input id="nick" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 세종청년" maxLength={12} />
              </div>
              <Btn type="submit">시작하기</Btn>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
