import { useEffect, useRef } from 'react'
import { reduced } from '../ui'

// 흰 나비 효과 (unseen.co의 Blossom 실험처럼 절제된 화이트 톤)
//  · 첫 화면: 나비 3마리가 천천히 날다가 커서 주변을 맴돈다
//  · 주요 버튼·로고 위: 나비 2마리가 날아오른다 (그 외 요소는 반응 없음)
//  · 클릭/터치: 나비 3마리
// 캔버스 1장, 입자 최대 14개. 모션 줄이기 설정이면 켜지지 않는다.

interface P {
  mode: 0 | 1 // 0 버스트, 1 상주
  x: number; y: number; vx: number; vy: number
  a: number; size: number; ph: number; seed: number
  age: number; life: number; fade: number
}

const HOVER_SEL = '.hero-cta .btn, .hero-logo, .vhero .btn'
const MAX = 14
const AMBIENT = 3
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

function drawButterfly(ctx: CanvasRenderingContext2D, p: P, t: number, alpha: number) {
  const s = p.size
  const flap = 0.4 + 0.6 * Math.abs(Math.cos(t * (p.mode === 1 ? 0.0075 : 0.012) + p.ph))
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.a + Math.PI / 2)
  ctx.globalAlpha = alpha
  ctx.shadowColor = 'rgba(30, 40, 80, 0.3)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 3
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.scale(side * flap, 1)
    const g = ctx.createLinearGradient(0, -s, s * 1.2, s * 0.5)
    g.addColorStop(0, 'rgba(255,255,255,0.96)')
    g.addColorStop(1, 'rgba(236,241,255,0.6)')
    ctx.fillStyle = g
    ctx.strokeStyle = 'rgba(130,142,185,0.4)'
    ctx.lineWidth = 0.8
    ctx.beginPath() // 위쪽 큰 날개
    ctx.moveTo(0, -s * 0.1)
    ctx.bezierCurveTo(s * 0.9, -s * 1.35, s * 1.55, -s * 0.2, s * 0.2, s * 0.15)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.beginPath() // 아래쪽 작은 날개
    ctx.moveTo(0, s * 0.05)
    ctx.bezierCurveTo(s * 1.0, s * 0.15, s * 0.85, s * 1.1, s * 0.05, s * 0.72)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.shadowColor = 'transparent'
    ctx.beginPath() // 날개맥
    ctx.moveTo(s * 0.12, -s * 0.05); ctx.lineTo(s * 0.9, -s * 0.55)
    ctx.moveTo(s * 0.12, 0); ctx.lineTo(s * 0.7, s * 0.3)
    ctx.stroke()
    ctx.restore()
  }
  ctx.shadowColor = 'transparent'
  ctx.fillStyle = 'rgba(40,50,90,0.55)'
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.06, s * 0.46, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

export function Flutter() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv || reduced()) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    let W = 0, H = 0
    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth; H = window.innerHeight
      cv.width = W * d; cv.height = H * d
      ctx.setTransform(d, 0, 0, d, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const ps: P[] = []
    let dirty: [number, number, number, number] | null = null // 마지막으로 그린 영역(전체 캔버스를 매번 지우지 않는다)
    let ambCount = 0
    let mx = W / 2, my = H / 2, lastMove = -1e9, now = 0
    const hoverAt = new WeakMap<Element, number>()

    const burst = (x: number, y: number, n: number, power: number) => {
      for (let i = 0; i < n; i++) {
        const ang = rnd(-Math.PI * 0.9, -Math.PI * 0.1)
        const sp = rnd(1.2, 2.4) * power
        ps.push({
          mode: 0, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, a: ang,
          size: rnd(15, 22), ph: rnd(0, 6.28), seed: rnd(0, 100), age: 0, life: rnd(1600, 2400), fade: 1,
        })
      }
      while (ps.length > MAX) {
        const i = ps.findIndex((p) => p.mode === 0)
        if (i < 0) break
        ps.splice(i, 1)
      }
    }
    const turn = (p: P, want: number, max: number) => {
      let diff = want - p.a
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      p.a += Math.max(-max, Math.min(max, diff))
    }

    const step = (dt: number) => {
      now += dt
      const active = fine && window.location.pathname === '/' && window.scrollY < H * 1.7 && !document.body.classList.contains('has-popup')
      const amb = ambCount
      if (active && amb < AMBIENT && Math.random() < 0.02) {
        const left = Math.random() < 0.5
        ambCount++
        ps.push({
          mode: 1, x: left ? -30 : W + 30, y: rnd(H * 0.25, H * 0.75), vx: 0, vy: 0, a: left ? 0 : Math.PI,
          size: rnd(22, 30), ph: rnd(0, 6.28), seed: rnd(0, 100), age: 0, life: 1e9, fade: 0,
        })
      }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.age += dt
        if (p.mode === 1) {
          p.fade += ((active ? 1 : 0) - p.fade) * 0.03
          if (!active && p.fade < 0.03) { ps.splice(i, 1); ambCount--; continue }
          let speed = 0.8
          if (now - lastMove < 2400) {
            const tx = mx + Math.cos(now * 0.0016 + p.seed) * 90
            const ty = my + Math.sin(now * 0.0021 + p.seed) * 60
            turn(p, Math.atan2(ty - p.y, tx - p.x), 0.045)
            speed = Math.max(0.6, Math.min(2.4, Math.hypot(tx - p.x, ty - p.y) * 0.02))
          } else {
            p.a += Math.sin(now * 0.0011 + p.seed) * 0.018 + (Math.random() - 0.5) * 0.02
            if (p.x < 40 || p.x > W - 40 || p.y < 90 || p.y > H - 40) turn(p, Math.atan2(H / 2 - p.y, W / 2 - p.x), 0.04)
          }
          p.vx = Math.cos(p.a) * speed; p.vy = Math.sin(p.a) * speed
          p.x += p.vx; p.y += p.vy
          continue
        }
        if (p.age >= p.life) { ps.splice(i, 1); continue }
        p.vx *= 0.985; p.vy = p.vy * 0.985 - 0.01
        p.x += p.vx + Math.sin(p.age * 0.006 + p.ph) * 0.4
        p.y += p.vy + Math.cos(p.age * 0.005 + p.ph) * 0.25
        p.a = Math.atan2(p.vy, p.vx)
      }
      if (dirty) { ctx.clearRect(dirty[0], dirty[1], dirty[2] - dirty[0], dirty[3] - dirty[1]); dirty = null }
      if (ps.length === 0) return
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
      for (const p of ps) {
        const m = p.size * 2.4 + 16 // 날개·그림자가 닿는 반경
        if (p.x - m < x0) x0 = p.x - m
        if (p.y - m < y0) y0 = p.y - m
        if (p.x + m > x1) x1 = p.x + m
        if (p.y + m > y1) y1 = p.y + m
      }
      dirty = [Math.max(0, Math.floor(x0)), Math.max(0, Math.floor(y0)), Math.min(W, Math.ceil(x1)), Math.min(H, Math.ceil(y1))]
      for (const p of ps) {
        const fadeIn = Math.min(1, p.age / 200)
        const fadeOut = p.mode === 1 ? p.fade : Math.min(1, (p.life - p.age) / 700)
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.95
        if (alpha > 0.01) drawButterfly(ctx, p, now, alpha)
      }
    }

    // 나비가 없고 나타날 조건도 아니면(다른 페이지·스크롤 아래·팝업·숨은 탭) rAF 를 돌리지 않고 느리게 확인만 한다
    let last = performance.now(), raf = 0, idleTimer = 0, idling = false
    const wantsFrames = () =>
      ps.length > 0 || (fine && window.location.pathname === '/' && window.scrollY < H * 1.7 && !document.body.classList.contains('has-popup'))
    const schedule = () => {
      if (document.hidden) return // visibilitychange 에서 다시 시작
      if (wantsFrames()) { raf = requestAnimationFrame(frame) }
      else { idling = true; idleTimer = window.setTimeout(() => { idling = false; last = performance.now(); schedule() }, 300) }
    }
    const frame = (ts: number) => { step(Math.min(48, ts - last)); last = ts; schedule() }
    const onVis = () => {
      cancelAnimationFrame(raf); clearTimeout(idleTimer); idling = false
      if (!document.hidden) { last = performance.now(); schedule() }
    }
    document.addEventListener('visibilitychange', onVis)
    schedule()

    const wake = () => { if (idling && !document.hidden) { idling = false; clearTimeout(idleTimer); last = performance.now(); schedule() } }
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; lastMove = now }
    const onOver = (e: MouseEvent) => {
      if (!fine) return
      const el = (e.target as HTMLElement).closest?.(HOVER_SEL)
      if (!el || el.contains(e.relatedTarget as Node)) return
      const t = performance.now()
      if (t - (hoverAt.get(el) ?? 0) < 1500) return
      hoverAt.set(el, t)
      burst(e.clientX, e.clientY, 2, 1)
      wake()
    }
    // 버튼·링크를 누를 때는 나비를 띄우지 않는다(모바일에서 '영상 재생' 같은 버튼을 가리지 않게)
    const onDown = (e: PointerEvent) => { if ((e.target as Element | null)?.closest?.('button, a, [role="button"]')) return; burst(e.clientX, e.clientY, 3, 1.2); wake() }
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)

    if (import.meta.env.DEV) {
      ;(window as unknown as { __fl: unknown }).__fl = { burst: (x: number, y: number, n = 3) => burst(x, y, n, 1.2), step, count: () => ps.length }
    }
    return () => {
      cancelAnimationFrame(raf); clearTimeout(idleTimer)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])
  return <canvas ref={ref} className="flutter" aria-hidden="true" />
}
