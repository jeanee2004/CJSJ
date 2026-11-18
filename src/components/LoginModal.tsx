import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn } from '../ui'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { PASSWORD_MIN, isValidEmail, isValidLoginId, loginAddress, normalizeLoginId } from '../lib/account'

// 아이디+비밀번호 가입·로그인. 가입은 서버(/api/signup)가 만들고 이메일 인증은 하지 않는다.
// 이메일은 "결과 리포트를 메일로 받고 싶은 사람만" 적는 선택 항목이다. 예전에 이메일로 가입한 회원은 로그인 칸에 이메일을 적으면 된다.
const ERR: Record<string, string> = {
  'Invalid login credentials': '아이디 또는 비밀번호가 맞지 않아요.',
  'Email not confirmed': '예전에 이메일로 가입한 계정이라면 받은 편지함의 인증 메일을 먼저 눌러 주세요.',
}
const friendly = (m: string) => ERR[m] ?? (/rate limit/i.test(m) ? '잠시 후 다시 시도해 주세요.' : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.')

export function LoginModal() {
  const { loginOpen, setLoginOpen, loginReason } = useStore()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [email, setEmail] = useState('')
  const [agree, setAgree] = useState(false)
  const [agreeMail, setAgreeMail] = useState(false)
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

  const signIn = async (who: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email: loginAddress(who), password: pw })
    if (error) setMsg({ t: friendly(error.message) }) // 성공하면 store 가 로그인 상태를 받아 이 창을 닫는다
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return setMsg({ t: '로그인 서버에 연결되어 있지 않아요.' })
    if (!id.trim() || !pw) return setMsg({ t: mode === 'in' ? '아이디와 비밀번호를 입력해 주세요.' : '아이디와 비밀번호를 정해 주세요.' })
    if (mode === 'in') { setBusy(true); setMsg(null); await signIn(id); setBusy(false); return }

    if (!isValidLoginId(id)) return setMsg({ t: '아이디는 영문 소문자로 시작하는 4~20자(영문 소문자·숫자·_)로 정해 주세요.' })
    if (pw.length < PASSWORD_MIN) return setMsg({ t: `비밀번호는 ${PASSWORD_MIN}자 이상으로 정해 주세요.` })
    if (pw !== pw2) return setMsg({ t: '비밀번호가 서로 달라요. 다시 확인해 주세요.' })
    if (email.trim() && !isValidEmail(email)) return setMsg({ t: '이메일 형식을 확인해 주세요. 받지 않으려면 비워 두세요.' })
    if (email.trim() && !agreeMail) return setMsg({ t: '리포트를 메일로 받으려면 이메일 수집·이용(선택)에 동의해 주세요. 받지 않으려면 이메일 칸을 비워 두세요.' })
    if (!agree) return setMsg({ t: '필수 항목 수집·이용에 동의해 주세요.' })
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/signup', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: normalizeLoginId(id), password: pw, consent: true, reportEmail: email.trim() || undefined, reportConsent: email.trim() ? agreeMail : undefined }),
      })
      const body = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string }
      if (!r.ok || !body.ok) setMsg({ t: body.message ? `${body.message}.`.replace(/\.\.$/, '.') : '가입하지 못했어요. 잠시 후 다시 시도해 주세요.' })
      else { setMsg({ ok: true, t: '가입했어요. 로그인하는 중이에요…' }); await signIn(id) } // 가입이 끝나면 바로 로그인한다
    } catch { setMsg({ t: '연결에 실패했어요. 잠시 후 다시 시도해 주세요.' }) }
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
                <p className="modal-lead">로그인하면 더 자세한 질문으로 내 상황을 꼼꼼히 점검해 볼 수 있어요. 로그인이 끝나면 바로 이어져요.</p>
              </>
            ) : loginReason === 'history' ? (
              <>
                <h2 id="login-title">지난 결과는<br /><span className="em">회원</span>만 볼 수 있어요</h2>
                <p className="modal-lead">로그인하면 설문 결과가 내 계정에 저장되고, 언제든 다시 볼 수 있어요.</p>
              </>
            ) : (
              <>
                <h2 id="login-title">로그인하고<br />결과를 <span className="em">저장</span>해 볼까요?</h2>
                <p className="modal-lead">로그인하면 설문 결과가 저장돼서 다음에도 이어서 볼 수 있어요.</p>
              </>
            )}
            <div className="demo-note">
              {mode === 'in'
                ? <>아이디로 로그인해요. 예전에 <b>이메일로 가입</b>했다면 아이디 칸에 이메일을 적으세요. 설문 응답은 아이디·이메일과 연결하지 않고 <b>구간 값으로만</b> 통계에 써요. <Link to="/privacy" onClick={() => setLoginOpen(false)}>개인정보처리방침</Link></>
                : <>이메일 인증 없이 <b>아이디와 비밀번호만</b>으로 가입해요. 이메일은 <b>결과 리포트를 메일로 받고 싶을 때만</b> 적으세요(선택). <Link to="/privacy" onClick={() => setLoginOpen(false)}>개인정보처리방침</Link></>}
            </div>
            <div className="auth-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setMsg(null) }}>로그인</button>
              <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setMsg(null) }}>회원가입</button>
            </div>
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="lid">{mode === 'in' ? '아이디 (예전 가입자는 이메일)' : '아이디 (영문 소문자·숫자·_ 4~20자)'}</label>
                <input id="lid" ref={first} type="text" required autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" maxLength={mode === 'in' ? 254 : 20} value={id} onChange={(e) => setId(e.target.value)} placeholder={mode === 'in' ? 'sejong_youth' : '예: sejong_youth'} />
              </div>
              <div className="field">
                <label htmlFor="pw">{mode === 'in' ? '비밀번호' : `비밀번호 (${PASSWORD_MIN}자 이상)`}</label>
                <input id="pw" type="password" required minLength={mode === 'in' ? 1 : PASSWORD_MIN} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              {mode === 'up' && (
                <div className="field">
                  <label htmlFor="pw2">비밀번호 확인</label>
                  <input id="pw2" type="password" required minLength={PASSWORD_MIN} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </div>
              )}
              {mode === 'up' && (
                <div className="field">
                  <label htmlFor="rem">이메일 (선택 · 결과 리포트 받기용)</label>
                  <input id="rem" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="비워 두면 메일을 보내지 않아요" />
                </div>
              )}
              {mode === 'up' && (
                <label className="consent">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>(필수) 아이디·비밀번호를 로그인과 결과 저장 목적으로 수집·이용하는 데 동의합니다. <Link to="/privacy" onClick={() => setLoginOpen(false)}>자세히 보기</Link></span>
                </label>
              )}
              {mode === 'up' && email.trim() !== '' && (
                <label className="consent">
                  <input type="checkbox" checked={agreeMail} onChange={(e) => setAgreeMail(e.target.checked)} />
                  <span>(선택) 이메일을 설문 결과 리포트 발송 목적으로 수집·이용하는 데 동의합니다. 계정을 지우거나 마이페이지에서 이메일을 지우면 바로 삭제돼요.</span>
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
