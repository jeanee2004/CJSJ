import { useEffect, useRef } from 'react'
import { reduced } from '../ui'

// 데스크톱(마우스) 전용 커서. 상태 3가지:
//  · 기본  : 작은 점 (색 반전 블렌드라 어떤 배경에서도 보임)
//  · 링크  : 링크·버튼 위에서 커진 원
//  · 라벨  : data-cursor="열기" 영역 위에서 라임색 원 + 안내 문구
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const lab = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const d = dot.current, l = lab.current
    if (!d || !l || reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let x = innerWidth / 2, y = innerHeight / 2, lx = x, ly = y, raf = 0
    // 점은 마우스에 지연 없이 붙고, 라벨 원만 가볍게 따라온다
    const tick = () => {
      lx += (x - lx) * 0.4; ly += (y - ly) * 0.4
      l.style.transform = `translate3d(${lx}px, ${ly}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    const move = (e: MouseEvent) => {
      x = e.clientX; y = e.clientY
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`
      const t = e.target as HTMLElement
      const small = !!t.closest('.btn, .circle, .fchip, .choice, .social button, .preset button, .stepper button, .nav a, .brand, .back, .intro-play, .intro-mute, a, button, summary, label, input')
      const lab = small ? undefined : t.closest('[data-cursor]')?.getAttribute('data-cursor')
      const link = small
      const text = !link && !!t.closest('input, textarea')
      d.classList.toggle('link', link && !lab)
      d.classList.toggle('text', text)
      d.style.opacity = lab ? '0' : '1'
      l.classList.toggle('on', !!lab)
      if (lab) l.textContent = lab
    }
    window.addEventListener('mousemove', move)
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])
  return (
    <>
      <div ref={dot} className="cur-dot" aria-hidden="true" />
      <div ref={lab} className="cur-label" aria-hidden="true" />
    </>
  )
}
