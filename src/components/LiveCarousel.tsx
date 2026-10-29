import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { reduced } from '../ui'

/**
 * 끝없이 이어 도는 카드 슬라이더.
 * · 같은 카드를 두 번 이어 붙인 가로 스크롤 영역을 천천히 자동으로 굴려요. 끝에 닿으면 반대편 복제본으로 이어져서 이음매가 안 보여요.
 * · 양쪽 화살표로 한 장씩 앞뒤로 넘기고, 손가락·휠 스크롤도 돼요. 마우스를 올리거나 포커스가 있으면 멈춰요.
 * · 모션 줄이기: CSS 에서 격자로 보여 주고 화살표는 숨겨요.
 */
export function LiveCarousel({ items, label }: { items: ReactNode[]; label: string }) {
  const view = useRef<HTMLDivElement>(null)
  const hold = useRef(false)
  const resume = useRef(0)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  pausedRef.current = paused

  useEffect(() => {
    const el = view.current
    if (!el || reduced()) return
    const half = () => el.scrollWidth / 2
    el.scrollLeft = half()
    let raf = 0, last = 0, pos = el.scrollLeft
    const wrap = () => {
      if (el.scrollLeft >= half()) el.scrollLeft -= half()
      else if (el.scrollLeft <= 0) el.scrollLeft += half()
    }
    const tick = (t: number) => {
      const idle = hold.current || pausedRef.current || t < resume.current
      if (idle) pos = el.scrollLeft
      else { pos += (t - last) * 0.04; el.scrollLeft = pos }
      last = t
      wrap()
      if (!idle) pos = el.scrollLeft
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const go = (dir: -1 | 1) => {
    const el = view.current
    const slot = el?.querySelector('.lc-slot') as HTMLElement | null
    if (!el || !slot) return
    resume.current = performance.now() + 3500
    el.scrollBy({ left: dir * (slot.offsetWidth + 22), behavior: 'smooth' })
  }
  const on = (v: boolean) => () => { hold.current = v }

  return (
    <div className={`lc${paused ? ' paused' : ''}`} role="region" aria-roledescription="carousel" aria-label={label}
      onMouseEnter={on(true)} onMouseLeave={on(false)} onFocus={on(true)} onBlur={on(false)} onTouchStart={on(true)} onTouchEnd={() => { resume.current = performance.now() + 2500; hold.current = false }}>
      <button type="button" className="lc-arrow prev" aria-label="이전 카드" onClick={() => go(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg></button>
      <button type="button" className="lc-arrow next" aria-label="다음 카드" onClick={() => go(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
      <div className="lc-view" ref={view}>
        <ul className="lc-track">
          {items.map((c, i) => <li className="lc-slot" key={i}>{c}</li>)}
          {items.map((c, i) => <li className="lc-slot lc-dup" key={`d${i}`} aria-hidden="true" inert>{c}</li>)}
        </ul>
      </div>
      <button type="button" className="lc-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
        {paused ? '▶ 자동 회전 켜기' : '❚❚ 자동 회전 멈추기'}
      </button>
    </div>
  )
}
