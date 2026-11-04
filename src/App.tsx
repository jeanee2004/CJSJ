import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './store'
import { Header } from './components/Header'
import { LoginModal } from './components/LoginModal'
import { Loader } from './components/Loader'
import { ScrollTop } from './components/ScrollTop'
import { GlossaryFab } from './components/GlossaryFab'
import { Flutter } from './components/Flutter'
import Home from './pages/Home'
import { Modals, OpenModalRedirect } from './components/Modals'
import Result from './pages/Result'
import Admin from './pages/Admin'
import { initTracking, observeSections, track } from './lib/track'
import Privacy from './pages/Privacy'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 60)
      return () => clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/** 페이지 조회·홈 섹션 체류·클릭 추적 (Supabase 가 없으면 아무 일도 하지 않는다) */
function Tracker() {
  const { pathname } = useLocation()
  useEffect(() => initTracking(), [])
  useEffect(() => {
    if (pathname === '/admin') return // 관리자 화면은 집계에서 제외
    track('page_view')
    if (pathname !== '/') return
    let stop: () => void = () => {}
    const t = setTimeout(() => { stop = observeSections() }, 300)
    return () => { clearTimeout(t); stop() }
  }, [pathname])
  return null
}

export default function App() {
  return (
    <StoreProvider>
      <ScrollManager />
      <Tracker />
      <Loader />
      <div className="aurora" aria-hidden="true" />
      <Flutter />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/diagnose" element={<OpenModalRedirect kind="survey" />} />
        <Route path="/result" element={<Result />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <LoginModal />
      <Modals />
      <ScrollTop />
      <GlossaryFab />
    </StoreProvider>
  )
}
