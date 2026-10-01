import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { DiagnoseFlow } from '../pages/Diagnose'
import { Feedback } from './Feedback'
import { useStore } from '../store'
import type { Modal } from '../store'

// 누른 사람이 직접 열었을 때만 뜨는 팝업. 스크롤하다가 갑자기 나타나지 않는다.
function Popup({ open, onClose, label, wide, children }: { open: boolean; onClose: () => void; label: string; wide?: boolean; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    box.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', esc)
      prev?.focus?.()
    }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <motion.div
            ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label}
            className={`pop ${wide ? 'pop-wide' : ''}`} onClick={(e) => e.stopPropagation()}
            initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <button className="circle close" type="button" aria-label="닫기" onClick={onClose}>✕</button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Modals() {
  const { modal, closeModal } = useStore()
  return (
    <>
      <Popup open={modal === 'diagnose'} onClose={closeModal} label="내 상황 확인" wide>
        {modal === 'diagnose' && <DiagnoseFlow onClose={closeModal} />}
      </Popup>
      <Popup open={modal === 'feedback'} onClose={closeModal} label="의견 남기기">
        {modal === 'feedback' && (
          <div className="pop-feedback">
            <span className="label">의견 남기기</span>
            <h2>집을 구할 때 가장 <span className="em">마음 쓰이는</span> 비용은?</h2>
            <p className="pop-lead">들려주신 이야기는 이름 없이 모아서, 세종시에 필요한 지원을 전할 때 소중하게 쓸게요.</p>
            <Feedback />
          </div>
        )}
      </Popup>
    </>
  )
}

/** 옛 주소(/diagnose)로 들어와도 홈 위에 팝업으로 열어 준다 */
export function OpenModalRedirect({ kind }: { kind: Exclude<Modal, null> }) {
  const { openModal } = useStore()
  useEffect(() => { openModal(kind) }, [kind, openModal])
  return <Navigate to="/" replace />
}
