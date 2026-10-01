import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn, Roll, useMagnetic } from '../ui'
import { useStore } from '../store'

export const NAV = [
  { n: '01', label: '내 상황 확인', to: '/diagnose' },
  { n: '02', label: '지원 제도', to: '/#policies' },
  { n: '03', label: '숫자로 보기', to: '/#data' },
  { n: '04', label: '쉬운 용어', to: '/#glossary' },
  { n: '05', label: '의견 남기기', to: '/#feedback' },
]

export function Header() {
  const { user, logout, setLoginOpen } = useStore()
  const [menu, setMenu] = useState(false)
  const [stuck, setStuck] = useState(false)
  const loc = useLocation()
  const menuRef = useMagnetic<HTMLButtonElement>(8)

  useEffect(() => setMenu(false), [loc.pathname, loc.hash])
  useEffect(() => {
    const on = () => setStuck(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [menu])

  return (
    <>
      <header className={`header ${stuck ? 'stuck' : ''}`}>
        <div className="wrap">
          <Link to="/" className="brand" aria-label="청정 세종 홈">
            <img src="/logo-sm.png" alt="" />
            <b>청정 세종</b>
          </Link>
          <nav className="nav" aria-label="주요 메뉴">
            {NAV.map((m) => (
              <Link key={m.n} to={m.to}><i>{m.n}</i><Roll>{m.label}</Roll></Link>
            ))}
          </nav>
          <div className="header-actions">
            {user ? (
              <button className="circle avatar" type="button" onClick={logout} title="로그아웃" aria-label={`${user.name}님, 눌러서 로그아웃`}>
                {user.name.slice(0, 1)}
              </button>
            ) : (
              <Btn variant="light" size="sm" onClick={() => setLoginOpen(true)}>로그인</Btn>
            )}
            <button ref={menuRef} className="circle menu-btn" type="button" aria-label="메뉴 열기" onClick={() => setMenu(true)}>
              <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><path d="M0 1h20M6 11h14" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div className="fullmenu" role="dialog" aria-label="전체 메뉴" initial={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }} animate={{ clipPath: 'circle(150% at calc(100% - 40px) 40px)' }} exit={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }} transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}>
            <button className="circle close" type="button" aria-label="메뉴 닫기" onClick={() => setMenu(false)}>✕</button>
            {NAV.map((m) => (
              <Link key={m.n} to={m.to}><i>{m.n}</i>{m.label}</Link>
            ))}
            {!user && (
              <div style={{ marginTop: 28 }}>
                <Btn variant="light" onClick={() => { setMenu(false); setLoginOpen(true) }}>로그인</Btn>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
