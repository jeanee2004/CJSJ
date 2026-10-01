import { useEffect, useState } from 'react'

// 화면을 한 화면 이상 내렸을 때만 나타나는 "맨 위로" 버튼
export function ScrollTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(window.scrollY > window.innerHeight * 0.9)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <button type="button" className={`to-top ${show ? 'show' : ''}`} aria-label="맨 위로 이동" tabIndex={show ? 0 : -1} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <span aria-hidden="true">↑</span>
      <b aria-hidden="true">TOP</b>
    </button>
  )
}
