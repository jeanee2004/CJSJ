import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { Header } from './components/Header'
import { LoginModal } from './components/LoginModal'
import { Loader } from './components/Loader'
import { ScrollTop } from './components/ScrollTop'
import { GlossaryFab } from './components/GlossaryFab'
import { Effects } from './components/Effects'
import { scrollToTarget } from './lib/smooth'
import { Flutter } from './components/Flutter'
import Home from './pages/Home'
import { Modals, OpenModalRedirect } from './components/Modals'
const Result = lazy(() => import('./pages/Result'))
const Admin = lazy(() => import('./pages/Admin'))
const Privacy = lazy(() => import('./pages/Privacy'))
import { initTracking, observeSections, track } from './lib/track'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => { const el = document.querySelector(hash); if (el) scrollToTarget(el) }, 60)
      return () => clearTimeout(t)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/** 주소 해시(#survey, #feedback)로 들어오면 해당 팝업을 연다 (메뉴 항목의 공유·새 탭 열기용) */
function HashModal() {
  const { hash } = useLocation()
  const { openModal } = useStore()
  useEffect(() => {
    if (hash === '#survey') openModal('survey')
    else if (hash === '#feedback') openModal('feedback')
  }, [hash, openModal])
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
      <HashModal />
      <Loader />
      <Effects />
      <div className="aurora" aria-hidden="true" />
      <Flutter />
      <Header />
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/diagnose" element={<OpenModalRedirect kind="survey" />} />
        <Route path="/result" element={<Result />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </Suspense>
      <LoginModal />
      <Modals />
      <ScrollTop />
      <GlossaryFab />
    </StoreProvider>
  )
}
