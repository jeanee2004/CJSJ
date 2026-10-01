import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn } from '../ui'
import { useStore } from '../store'

// 데모용 로그인: 실제 인증·서버 전송 없음. 이름만 이 브라우저에 저장한다.
export function LoginModal() {
  const { loginOpen, setLoginOpen, login, loginReason } = useStore()
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
            <img className="modal-logo" src="/logo-sm.png" alt="" />
            <span className="label">회원등록 · 로그인</span>
            {loginReason === 'history' ? (
              <>
                <h2 id="login-title">지난 결과는<br /><span className="em">회원</span>만 볼 수 있어요</h2>
                <p className="modal-lead">회원등록(로그인)하면 진단 결과가 내 계정에 저장되고, 언제든 다시 볼 수 있어요.</p>
              </>
            ) : (
              <>
                <h2 id="login-title">회원등록하고<br />결과를 <span className="em">저장</span>해 볼까요?</h2>
                <p className="modal-lead">로그인하면 진단 결과가 내 계정에 저장돼서 다음에도 이어서 볼 수 있어요.</p>
              </>
            )}
            <div className="demo-note">
              <b>체험용 화면이에요.</b> 실제 계정은 만들어지지 않고, 입력하신 내용은 이 기기 브라우저에만 저장돼요. 서버로는 보내지 않아요.
            </div>
            <div className="social">
              <button ref={first} className="kakao" type="button" onClick={() => done('kakao', '카카오')}>카카오로 시작하기</button>
              <button type="button" onClick={() => done('google', '구글')}>구글로 시작하기</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); done('email') }}>
              <div className="field">
                <label htmlFor="nick">또는 별명만 입력하기</label>
                <input id="nick" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 세종청년" maxLength={12} />
              </div>
              <Btn type="submit">회원등록하고 시작하기</Btn>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
