import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Roll } from '../ui'
import { useStore } from '../store'

export const NAV = [
  { n: '01', label: '내 상황 확인', to: '/diagnose' },
  { n: '02', label: '지원 제도', to: '/#policies' },
  { n: '03', label: '숫자로 보기', to: '/#data' },
  { n: '04', label: '쉬운 용어', to: '/#glossary' },
  { n: '05', label: '의견 보내기', to: '/#feedback' },
]

export function Header() {
  const { user, logout, setLoginOpen } = useStore()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()

  useEffect(() => setMenu(false), [loc.pathname, loc.hash])
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [menu])

  return (
    <>
      <header className="header">
        <div className="wrap">
          <Link to="/" className="brand" aria-label="청정 세종 홈">
            <img src="/logo-sm.png" alt="" />
            <b>청정 세종</b>
          </Link>
          <nav className="nav" aria-label="주요 메뉴">
            {NAV.map((m) => (
              <Link key={m.n} to={m.to}>
                <i>{m.n}</i>
                <Roll>{m.label}</Roll>
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <button className="avatar" type="button" onClick={logout} title="로그아웃" aria-label={`${user.name}님, 눌러서 로그아웃`}>
                  {user.name.slice(0, 1)}
                </button>
              </>
            ) : (
              <button className="pill white sm" type="button" onClick={() => setLoginOpen(true)}>
                <Roll>로그인</Roll>
              </button>
            )}
            <button className="icon-btn menu-btn" type="button" aria-label="메뉴 열기" onClick={() => setMenu(true)}>
              <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><path d="M0 1h18M0 11h12" stroke="#1e2230" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div className="fullmenu" role="dialog" aria-label="전체 메뉴" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="icon-btn close" type="button" aria-label="메뉴 닫기" onClick={() => setMenu(false)}>✕</button>
            {NAV.map((m) => (
              <Link key={m.n} to={m.to}>
                <i>{m.n}</i>
                {m.label}
              </Link>
            ))}
            {!user && (
              <button className="pill" style={{ marginTop: 20, width: 'fit-content' }} type="button" onClick={() => { setMenu(false); setLoginOpen(true) }}>
                로그인
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
