import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { reduced } from '../ui'
import { scrollToTarget, setLenis } from '../lib/smooth'
import '../effects.css'

// 홈페이지의 고급스러운 인터랙션 모음: 부드러운 스크롤, 스크롤 진행 선, 히어로 패럴랙스, 필름 그레인.
// 관리자(/admin)·터치 기기·'동작 줄이기' 설정에서는 해당 효과를 켜지 않는다.
const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

export function Effects() {
  const { pathname } = useLocation()
  if (pathname === '/admin') return null
  return (
    <>
      <Progress />
      <SmoothScroll />
      <HeroParallax active={pathname === '/' || !['/result', '/privacy'].includes(pathname)} />
    </>
  )
}

/** 위쪽 1px 스크롤 진행 선 (transform 만 바꾼다) */
function Progress() {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = 0
      const h = document.documentElement.scrollHeight - window.innerHeight
      bar.current?.style.setProperty('transform', `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(draw) }
    draw()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on, { passive: true })
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [])
  return <div className="fx-progress" aria-hidden="true"><div ref={bar} /></div>
}

/** 아주 옅은 필름 그레인(고정 이미지 한 장, 애니메이션 없음) */
/** 부드러운 스크롤(lenis): 데스크톱에서만, 모달·메뉴로 body 가 잠기면 멈춘다. 라이브러리는 첫 화면이 그려진 뒤에 불러온다 */
function SmoothScroll() {
  useEffect(() => {
    if (reduced() || !fine()) return
    let raf = 0, off = false, stopObs: MutationObserver | null = null
    let destroy = () => {}
    const boot = async () => {
      const { default: Lenis } = await import('lenis')
      if (off) return
      const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, allowNestedScroll: true })
      setLenis(lenis)
      const tick = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(tick) }
      raf = requestAnimationFrame(tick)
      const sync = () => { if (document.body.style.overflow === 'hidden') lenis.stop(); else lenis.start() }
      stopObs = new MutationObserver(sync)
      stopObs.observe(document.body, { attributes: true, attributeFilter: ['style'] })
      sync()
      // '맨 위로' 버튼은 브라우저 기본 smooth 대신 같은 곡선으로 올라가게 한다
      const top = (e: MouseEvent) => {
        if (!(e.target as Element | null)?.closest?.('.to-top')) return
        e.preventDefault(); e.stopPropagation()
        scrollToTarget(0)
      }
      document.addEventListener('click', top, true)
      destroy = () => { document.removeEventListener('click', top, true); lenis.destroy(); setLenis(null) }
    }
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void, o?: object) => number }).requestIdleCallback
    const h = idle ? idle(() => void boot(), { timeout: 1500 }) : window.setTimeout(() => void boot(), 600)
    return () => {
      off = true; cancelAnimationFrame(raf); stopObs?.disconnect(); destroy()
      if (idle) (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(h); else clearTimeout(h)
    }
  }, [])
  return null
}

/** 히어로: 스크롤하면 영상이 살짝 커지고 글이 천천히 위로 올라가며 옅어진다 (transform/opacity 만, rAF 하나) */
function HeroParallax({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active || reduced()) return
    let raf = 0, media: HTMLElement | null = null, inner: HTMLElement | null = null
    const draw = () => {
      raf = 0
      if (!media?.isConnected) { media = document.querySelector('.vhero-media'); inner = document.querySelector('.vhero-inner') }
      if (!media || !inner) return
      const p = Math.min(1, Math.max(0, window.scrollY / window.innerHeight))
      media.style.transform = `scale(${1 + p * 0.1})`
      inner.style.transform = `translate3d(0, ${p * -48}px, 0)`
      inner.style.opacity = String(1 - p * 0.7)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(draw) }
    draw()
    window.addEventListener('scroll', on, { passive: true })
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('scroll', on)
      if (media) media.style.transform = ''
      if (inner) { inner.style.transform = ''; inner.style.opacity = '' }
    }
  }, [active])
  return null
}
