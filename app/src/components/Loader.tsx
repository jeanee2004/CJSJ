import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { reduced } from '../ui'

const KEY = 'cjsj.seen'
const CHARS = ['靑', '定', '世', '宗']

// 첫 방문에만, 2초 이내. 건너뛰기 가능. (design.md §9: 3초 이상 붙잡지 않기)
export function Loader() {
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem(KEY) && !reduced()
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (!show) return
    const t = setTimeout(close, 1900)
    return () => clearTimeout(t)
  }, [show])
  function close() {
    try { sessionStorage.setItem(KEY, '1') } catch { /* noop */ }
    setShow(false)
  }
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="loader" role="status" aria-label="불러오는 중" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <div className="chars" aria-hidden="true">
            {CHARS.map((c, i) => (
              <motion.span key={c} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 + i * 0.22, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                {c}
              </motion.span>
            ))}
          </div>
          <button className="pill white sm skip" type="button" onClick={close}>건너뛰기 ↘</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
