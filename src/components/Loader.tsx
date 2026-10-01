import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { reduced } from '../ui'

const KEY = 'cjsj.seen'

// 집 모양 도형: LOADING... 의 점 자리를 대신한다 (문 부분은 구멍)
const House = ({ i }: { i: number }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ ['--i' as string]: i }}>
    <path fillRule="evenodd" d="M8 1.2 15 7.4h-2v7.4H3V7.4H1L8 1.2Zm-1.5 13.6v-4.3h3v4.3h-3Z" />
  </svg>
)

// 첫 방문에만, 2초 안팎. 건너뛰기 가능. 막이 위로 걷히며 사라진다.
export function Loader() {
  const [show, setShow] = useState(() => {
    try { return !sessionStorage.getItem(KEY) && !reduced() } catch { return false }
  })
  useEffect(() => {
    if (!show) return
    const t = setTimeout(close, 2100)
    return () => clearTimeout(t)
  }, [show])
  function close() {
    try { sessionStorage.setItem(KEY, '1') } catch { /* noop */ }
    setShow(false)
  }
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="loader" role="status" aria-label="불러오는 중" exit={{ y: '-100%' }} transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}>
          <div className="ld-center">
            <img className="ld-logo" src="/logo-sm.png" alt="CJSJ" />
            <p className="ld-text" aria-hidden="true">
              LOADING
              <span className="ld-houses"><House i={0} /><House i={1} /><House i={2} /></span>
            </p>
          </div>
          <button className="ld-skip" type="button" onClick={close}>건너뛰기</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
