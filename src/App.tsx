import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './store'
import { Header } from './components/Header'
import { LoginModal } from './components/LoginModal'
import { Loader } from './components/Loader'
import { ScrollTop } from './components/ScrollTop'
import { Flutter } from './components/Flutter'
import Home from './pages/Home'
import { Modals, OpenModalRedirect } from './components/Modals'
import Result from './pages/Result'

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

export default function App() {
  return (
    <StoreProvider>
      <ScrollManager />
      <Loader />
      <div className="aurora" aria-hidden="true" />
      <Flutter />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/diagnose" element={<OpenModalRedirect kind="diagnose" />} />
        <Route path="/result" element={<Result />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <LoginModal />
      <Modals />
      <ScrollTop />
    </StoreProvider>
  )
}
