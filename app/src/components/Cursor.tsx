import { useEffect, useRef } from 'react'
import { reduced } from '../ui'

// 데스크톱(마우스) 전용 커스텀 커서. 영역에 따라 라벨이 바뀐다 (design.md §7)
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0
    const tick = () => {
      cx += (x - cx) * 0.22
      cy += (y - cy) * 0.22
      el.style.transform = `translate(${cx}px, ${cy}px)`
      raf = requestAnimationFrame(tick)
    }
    const move = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      const t = (e.target as HTMLElement).closest('[data-cursor]')
      const label = t?.getAttribute('data-cursor') ?? ''
      el.classList.toggle('big', !!label)
      el.textContent = label ?? ''
    }
    window.addEventListener('mousemove', move)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', move)
      cancelAnimationFrame(raf)
    }
  }, [])
  return <div ref={ref} className="cursor" aria-hidden="true" />
}
