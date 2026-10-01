import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './store'
import { Header } from './components/Header'
import { LoginModal } from './components/LoginModal'
import { Loader } from './components/Loader'
import { Cursor } from './components/Cursor'
import { Flutter } from './components/Flutter'
import Home from './pages/Home'
import Diagnose from './pages/Diagnose'
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
      <Flutter />
      <Cursor />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/diagnose" element={<Diagnose />} />
        <Route path="/result" element={<Result />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <LoginModal />
    </StoreProvider>
  )
}
