import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn } from '../ui'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'

// 이메일+비밀번호 가입·로그인 (Supabase Auth). 가입은 이메일 인증을 마쳐야 완료된다.
const ERR: Record<string, string> = {
  'Invalid login credentials': '이메일 또는 비밀번호가 맞지 않아요.',
  'Email not confirmed': '이메일 인증이 아직이에요. 받은 편지함의 인증 메일을 눌러 주세요.',
  'User already registered': '이미 가입된 이메일이에요. 로그인해 주세요.',
}
const friendly = (m: string) => ERR[m] ?? (/password/i.test(m) ? '비밀번호는 6자 이상으로 입력해 주세요.' : /rate limit/i.test(m) ? '잠시 후 다시 시도해 주세요.' : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.')

export function LoginModal() {
  const { loginOpen, setLoginOpen, loginReason } = useStore()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: string; ok?: boolean } | null>(null)
  const first = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loginOpen) return
    first.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setLoginOpen(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [loginOpen, setLoginOpen])
  useEffect(() => { if (!loginOpen) { setPw(''); setPw2(''); setMsg(null) } }, [loginOpen])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return setMsg({ t: '로그인 서버에 연결되어 있지 않아요.' })
    if (mode === 'up' && pw !== pw2) return setMsg({ t: '비밀번호가 서로 달라요. 다시 확인해 주세요.' })
    if (mode === 'up' && !agree) return setMsg({ t: '개인정보 수집·이용에 동의해 주세요.' })
    setBusy(true); setMsg(null)
    if (mode === 'up') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(), password: pw,
        options: { emailRedirectTo: window.location.origin, data: { consent_at: new Date().toISOString() } },
      })
      if (error) setMsg({ t: friendly(error.message) })
      // 이미 가입된 이메일이면 identities 가 비어 돌아온다
      else if (data.user && data.user.identities?.length === 0) setMsg({ t: friendly('User already registered') })
      else setMsg({ ok: true, t: '인증 메일을 보냈어요. 메일의 링크를 누르면 가입이 끝나요. 그다음 로그인해 주세요.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      if (error) setMsg({ t: friendly(error.message) }) // 성공하면 store 가 로그인 상태를 받아 이 창을 닫는다
    }
    setBusy(false)
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
            <span className="label">{mode === 'in' ? '로그인' : '회원가입'}</span>
            {loginReason === 'deep' ? (
              <>
                <h2 id="login-title">심화 설문은<br /><span className="em">로그인</span> 후에 할 수 있어요</h2>
                <p className="modal-lead">로그인하면 더 자세한 질문으로 내 상황을 꼼꼼히 점검해 볼 수 있어요. 로그인이 끝나면 바로 이어집니다.</p>
              </>
            ) : loginReason === 'history' ? (
              <>
                <h2 id="login-title">지난 결과는<br /><span className="em">회원</span>만 볼 수 있어요</h2>
                <p className="modal-lead">로그인하면 진단 결과가 내 계정에 저장되고, 언제든 다시 볼 수 있어요.</p>
              </>
            ) : (
              <>
                <h2 id="login-title">로그인하고<br />결과를 <span className="em">저장</span>해 볼까요?</h2>
                <p className="modal-lead">로그인하면 진단 결과가 저장돼서 다음에도 이어서 볼 수 있어요.</p>
              </>
            )}
            <div className="demo-note">
              이메일은 <b>로그인에만</b> 쓰여요. 설문 응답은 이름·이메일과 연결하지 않고 <b>구간 값으로만</b> 통계에 써요. <Link to="/privacy" onClick={() => setLoginOpen(false)}>개인정보처리방침</Link>
            </div>
            <div className="auth-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setMsg(null) }}>로그인</button>
              <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setMsg(null) }}>회원가입</button>
            </div>
            <form onSubmit={submit} noValidate={false}>
              <div className="field">
                <label htmlFor="em">이메일</label>
                <input id="em" ref={first} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" />
              </div>
              <div className="field">
                <label htmlFor="pw">비밀번호 (6자 이상)</label>
                <input id="pw" type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              {mode === 'up' && (
                <div className="field">
                  <label htmlFor="pw2">비밀번호 확인</label>
                  <input id="pw2" type="password" required minLength={6} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </div>
              )}
              {mode === 'up' && (
                <label className="consent">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>(필수) 이메일을 로그인 목적으로 수집·이용하는 데 동의합니다. <Link to="/privacy" onClick={() => setLoginOpen(false)}>자세히 보기</Link></span>
                </label>
              )}
              {msg && <p className={`login-msg ${msg.ok ? 'ok' : ''}`} role="status">{msg.t}</p>}
              <Btn type="submit" disabled={busy}>{busy ? '처리 중…' : mode === 'in' ? '로그인' : '회원가입'}</Btn>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
