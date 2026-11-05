import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { reduced } from '../ui'

const KEY = 'cjsj.seen'
export const LOADER_MS = 1250

// 첫 방문에만, 1.2초 남짓: 로고와 '청정 세종'이 서서히 나타나고, 가는 선이 차오른 뒤 막이 위로 걷힌다. 건너뛰기 가능.
// 재방문(sessionStorage)과 '동작 줄이기' 설정에서는 보이지 않는다. 본문은 막 뒤에서 이미 그려져 있어 접근을 막지 않는다.
export function Loader() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem(KEY) && !reduced() } catch { return false }
  })
  useEffect(() => {
    if (!show) return
    const t = setTimeout(close, LOADER_MS)
    return () => clearTimeout(t)
  }, [show])
  function close() {
    try { sessionStorage.setItem(KEY, '1') } catch { /* noop */ }
    setShow(false)
  }
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="loader lx" role="status" aria-label="불러오는 중" exit={{ y: '-100%' }} transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}>
          <div className="lx-center">
            <img className="lx-logo" src="/logo-sm.png" alt="" />
            <p className="lx-word" aria-hidden="true">청정 세종</p>
            <p className="lx-sub" aria-hidden="true">SEJONG // HOUSING GUIDE</p>
            <span className="lx-line" aria-hidden="true"><i /></span>
          </div>
          <button className="ld-skip" type="button" onClick={close}>건너뛰기</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
