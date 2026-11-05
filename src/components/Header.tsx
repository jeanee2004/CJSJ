import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn, Roll, useMagnetic } from '../ui'
import { useStore } from '../store'
import './Menu.css'

// action 이 있는 항목은 눌러도 페이지 이동 없이 팝업이 열리고, 주소(/#survey, /#feedback)로 들어와도 같은 팝업이 열린다
export const NAV: { n: string; label: string; to?: string; action?: 'survey' | 'feedback' }[] = [
  { n: '01', label: '실시간 정보', to: '/#live' },
  { n: '02', label: '지원 제도', to: '/#policies' },
  { n: '03', label: '숫자로 보기', to: '/#data' },
  { n: '04', label: '내 상황 확인', action: 'survey' },
  { n: '05', label: '의견 남기기', action: 'feedback' },
]
const hrefOf = (m: (typeof NAV)[number]) => m.to ?? `/#${m.action}`

export function Header() {
  const { user, setLoginOpen, openModal } = useStore()
  const [menu, setMenu] = useState(false)
  const [stuck, setStuck] = useState(false)
  const loc = useLocation()
  const menuRef = useMagnetic<HTMLButtonElement>(8)
  const panel = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const here = loc.pathname + loc.hash
  const isHere = (m: (typeof NAV)[number]) => (m.to ? m.to === here : false)
  // 새 탭·복사 등 보통의 링크 동작은 살리고, 그냥 클릭일 때만 팝업으로 연다
  const onAction = (m: (typeof NAV)[number], after?: () => void) => (e: MouseEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    after?.()
    openModal(m.action!)
  }

  useEffect(() => setMenu(false), [loc.pathname, loc.hash])
  useEffect(() => {
    const on = () => setStuck(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!menu) return
    document.body.style.overflow = 'hidden'
    const opener = document.activeElement as HTMLElement | null
    closeBtn.current?.focus()
    // ESC 로 닫기 + Tab 이 패널 밖으로 나가지 않게 가둔다
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setMenu(false)
      if (e.key !== 'Tab' || !panel.current) return
      const f = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
      if (f.length === 0) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', key)
      opener?.focus?.()
    }
  }, [menu])

  return (
    <>
      <header className={`header ${stuck ? 'stuck' : ''} ${loc.pathname === '/' && !stuck ? 'on-dark' : ''}`}>
        <div className="wrap">
          <Link to="/" className="brand" aria-label="청정 세종 홈">
            <img src="/logo-sm.png" alt="" />
            <b>청정 세종</b>
          </Link>
          <nav className="nav" aria-label="주요 메뉴">
            {NAV.map((m) =>
              m.action ? (
                <Link key={m.n} to={hrefOf(m)} data-track={`nav_${m.action}`} onClick={onAction(m)}><i>{m.n}</i><Roll>{m.label}</Roll></Link>
              ) : (
                <Link key={m.n} to={m.to!}><i>{m.n}</i><Roll>{m.label}</Roll></Link>
              ),
            )}
            {user?.isAdmin && <Link to="/admin"><i>A</i><Roll>대시보드</Roll></Link>}
          </nav>
          <div className="header-actions">
            {user ? (
              <button className="circle avatar" type="button" onClick={() => openModal('mypage')} title="마이페이지" aria-label={`${user.name}님, 마이페이지 열기`}>
                {user.name.slice(0, 1)}
              </button>
            ) : (
              <Btn variant="light" size="sm" track="login_open" onClick={() => setLoginOpen(true)}>로그인</Btn>
            )}
            <button ref={menuRef} className="circle menu-btn" type="button" aria-label="메뉴 열기" onClick={() => setMenu(true)}>
              <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><path d="M0 1h20M6 11h14" stroke="#0b1220" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div className="fm-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="fm-dim" aria-hidden="true" onClick={() => setMenu(false)} />
            <motion.div ref={panel} className="fullmenu" role="dialog" aria-modal="true" aria-label="전체 메뉴" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              <div className="fm-head">
                <span className="fm-title">메뉴</span>
                <button ref={closeBtn} className="circle close" type="button" aria-label="메뉴 닫기" onClick={() => setMenu(false)}>✕</button>
              </div>
              <ul className="fm-list">
                {NAV.map((m) => (
                  <li key={m.n}>
                    {m.action ? (
                      <Link className="fm-item" to={hrefOf(m)} onClick={onAction(m, () => setMenu(false))}><i>{m.n}</i>{m.label}<span className="fm-arrow" aria-hidden="true">→</span></Link>
                    ) : (
                      <Link className="fm-item" to={m.to!} aria-current={isHere(m) ? 'page' : undefined}><i>{m.n}</i>{m.label}<span className="fm-arrow" aria-hidden="true">→</span></Link>
                    )}
                  </li>
                ))}
                {user?.isAdmin && <li><Link className="fm-item" to="/admin" aria-current={loc.pathname === '/admin' ? 'page' : undefined}><i>A</i>대시보드<span className="fm-arrow" aria-hidden="true">→</span></Link></li>}
              </ul>
              <div className="fm-foot">
                {user ? (
                  <button type="button" className="fm-me" onClick={() => { setMenu(false); openModal('mypage') }}>
                    <span className="fm-av" aria-hidden="true">{user.name.slice(0, 1)}</span>
                    <span><b>{user.profile.nickname || user.name}님</b><span>마이페이지 열기</span></span>
                  </button>
                ) : (
                  <>
                    <Btn variant="light" track="login_open" onClick={() => { setMenu(false); setLoginOpen(true) }}>로그인</Btn>
                    <small>로그인하면 결과와 서류를 계정에 모아 둘 수 있어요.</small>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
