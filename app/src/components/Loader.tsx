import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Btn, reduced } from '../ui'

const KEY = 'cjsj.seen'
const shown = ['청', '정', '세', '종']

// 첫 방문에만, 2초 이내. 건너뛰기 가능. 막이 위로 걷히며 사라진다.
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
          <div className="chars" aria-hidden="true">
            {shown.map((c, i) => (
              <motion.span key={c} initial={{ y: '60%', opacity: 0, rotate: 6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.15 + i * 0.2, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                {c}
              </motion.span>
            ))}
          </div>
          <div className="skip"><Btn variant="light" size="sm" onClick={close}>건너뛰기</Btn></div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
