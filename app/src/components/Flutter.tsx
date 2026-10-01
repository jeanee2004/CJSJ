import { useEffect, useRef } from 'react'
import { reduced } from '../ui'

// 나비·꽃잎 효과 엔진 (unseen.co의 Blossom 실험에서 영감)
//  · 히어로: 나비 7마리가 날아다니다가 커서 주변을 맴돈다
//  · 커서 이동: 꽃잎·가끔 나비가 흩날리며 사라진다
//  · 버튼/목록/카드에 올리면: 그 자리에서 나비가 날아오른다
//  · 클릭/터치: 꽃잎과 나비가 터져 나온다
// 캔버스 1장, 입자 최대 110개. 모션 줄이기 설정이면 아예 켜지지 않는다.

interface P {
  kind: 0 | 1 // 0 나비, 1 꽃잎
  mode: 0 | 1 | 2 // 0 버스트, 1 상주(히어로), 2 트레일
  x: number; y: number; vx: number; vy: number
  a: number; va: number; size: number; ph: number; seed: number
  age: number; life: number; fade: number
  c: [string, string]
}

const PAL: [string, string][] = [
  ['#ff8fba', '#ffd9e8'], ['#ffb0cf', '#fff0f6'], ['#7fcfff', '#d9f1ff'],
  ['#8fe8cc', '#e4fff6'], ['#c7bcff', '#f0ebff'], ['#ff7aa8', '#ffe3ee'],
]
const HOVER_SEL = '.btn, .idx-head, .fchip, .choice, .circle, .hero-logo, .step, .gl-row, .nav a, .social button, .preset button, .cmp, .intro-play, .vd'
const MAX = 110
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = () => PAL[(Math.random() * PAL.length) | 0]

function drawButterfly(ctx: CanvasRenderingContext2D, p: P, t: number, alpha: number) {
  const s = p.size
  const flap = 0.38 + 0.62 * Math.abs(Math.cos(t * (p.mode === 1 ? 0.011 : 0.016) + p.ph))
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.a + Math.PI / 2)
  ctx.globalAlpha = alpha
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.scale(side * flap, 1)
    const g = ctx.createLinearGradient(0, -s, s * 1.2, s * 0.4)
    g.addColorStop(0, p.c[0]); g.addColorStop(1, p.c[1])
    ctx.fillStyle = g
    ctx.beginPath() // 위쪽 큰 날개
    ctx.moveTo(0, -s * 0.1)
    ctx.bezierCurveTo(s * 0.9, -s * 1.35, s * 1.55, -s * 0.2, s * 0.2, s * 0.15)
    ctx.closePath(); ctx.fill()
    ctx.beginPath() // 아래쪽 작은 날개
    ctx.moveTo(0, s * 0.05)
    ctx.bezierCurveTo(s * 1.0, s * 0.15, s * 0.85, s * 1.1, s * 0.05, s * 0.72)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = 'rgba(23,35,77,0.7)'
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.07, s * 0.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawPetal(ctx: CanvasRenderingContext2D, p: P, alpha: number) {
  const s = p.size
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.a)
  ctx.globalAlpha = alpha
  const g = ctx.createLinearGradient(0, -s, 0, s)
  g.addColorStop(0, p.c[0]); g.addColorStop(1, p.c[1])
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.bezierCurveTo(s * 0.9, -s * 0.4, s * 0.6, s * 0.8, 0, s)
  ctx.bezierCurveTo(-s * 0.6, s * 0.8, -s * 0.9, -s * 0.4, 0, -s)
  ctx.fill()
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
    let mx = W / 2, my = H / 2, lastMove = -1e9, lx = 0, ly = 0, now = 0
    const hoverAt = new WeakMap<Element, number>()

    const trim = () => {
      while (ps.length > MAX) {
        const i = ps.findIndex((p) => p.mode !== 1)
        if (i < 0) break
        ps.splice(i, 1)
      }
    }
    const burst = (x: number, y: number, n: number, power: number, bf: number) => {
      for (let i = 0; i < n; i++) {
        const ang = rnd(-Math.PI * 0.97, -Math.PI * 0.03)
        const sp = rnd(1.4, 3.4) * power
        const isBf = Math.random() < bf
        ps.push({
          kind: isBf ? 0 : 1, mode: 0, x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          a: ang, va: rnd(-0.1, 0.1), size: isBf ? rnd(16, 26) : rnd(6, 10), ph: rnd(0, 6.28), seed: rnd(0, 100),
          age: 0, life: rnd(1500, 2300), fade: 1, c: pick(),
        })
      }
      trim()
    }
    const ambientCount = () => ps.filter((p) => p.mode === 1).length

    const step = (dt: number) => {
      now += dt
      const heroVisible = window.scrollY < H * 0.85 && fine
      // 상주 나비: 히어로가 보일 때만 7마리
      if (heroVisible && ambientCount() < 7 && Math.random() < 0.05) {
        const fromLeft = Math.random() < 0.5
        ps.push({
          kind: 0, mode: 1, x: fromLeft ? -20 : W + 20, y: rnd(H * 0.2, H * 0.8), vx: 0, vy: 0,
          a: fromLeft ? 0 : Math.PI, va: 0, size: rnd(20, 30), ph: rnd(0, 6.28), seed: rnd(0, 100),
          age: 0, life: 1e9, fade: 0, c: pick(),
        })
      }
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.age += dt
        if (p.mode === 1) {
          const target = heroVisible ? 1 : 0
          p.fade += (target - p.fade) * 0.04
          if (target === 0 && p.fade < 0.03) { ps.splice(i, 1); continue }
          const follow = now - lastMove < 2600
          let speed = 1.1
          if (follow) {
            const tx = mx + Math.cos(now * 0.0021 + p.seed) * 70
            const ty = my + Math.sin(now * 0.0027 + p.seed) * 46
            const want = Math.atan2(ty - p.y, tx - p.x)
            let diff = want - p.a
            while (diff > Math.PI) diff -= Math.PI * 2
            while (diff < -Math.PI) diff += Math.PI * 2
            p.a += Math.max(-0.07, Math.min(0.07, diff))
            speed = Math.max(0.8, Math.min(3.4, Math.hypot(tx - p.x, ty - p.y) * 0.025))
          } else {
            p.a += Math.sin(now * 0.0013 + p.seed) * 0.022 + (Math.random() - 0.5) * 0.03
            if (p.x < 30 || p.x > W - 30 || p.y < 90 || p.y > H - 30) {
              const want = Math.atan2(H / 2 - p.y, W / 2 - p.x)
              let diff = want - p.a
              while (diff > Math.PI) diff -= Math.PI * 2
              while (diff < -Math.PI) diff += Math.PI * 2
              p.a += Math.max(-0.05, Math.min(0.05, diff))
            }
          }
          p.vx = Math.cos(p.a) * speed
          p.vy = Math.sin(p.a) * speed
          p.x += p.vx
          p.y += p.vy
          continue
        }
        if (p.age >= p.life) { ps.splice(i, 1); continue }
        if (p.kind === 0) {
          p.vx *= 0.985
          p.vy = p.vy * 0.985 - 0.012
          p.x += p.vx + Math.sin(p.age * 0.008 + p.ph) * 0.55
          p.y += p.vy + Math.cos(p.age * 0.006 + p.ph) * 0.3
          p.a = Math.atan2(p.vy, p.vx)
        } else {
          p.vx *= 0.99
          p.vy += 0.018
          p.x += p.vx + Math.sin(p.age * 0.004 + p.ph) * 0.4
          p.y += p.vy
          p.a += p.va
        }
      }
      ctx.clearRect(0, 0, W, H)
      for (const p of ps) {
        const fadeIn = Math.min(1, p.age / 120)
        const fadeOut = p.mode === 1 ? p.fade : Math.min(1, (p.life - p.age) / 600)
        const alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * (p.mode === 1 ? 0.95 : 0.9)
        if (alpha <= 0.01) continue
        if (p.kind === 0) drawButterfly(ctx, p, now, alpha)
        else drawPetal(ctx, p, alpha)
      }
    }

    let last = performance.now(), raf = 0
    const frame = (ts: number) => {
      step(Math.min(48, ts - last))
      last = ts
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY; lastMove = now
      if (!fine) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea')) return
      if (Math.hypot(mx - lx, my - ly) > 34) {
        lx = mx; ly = my
        const isBf = Math.random() < 0.09
        ps.push({
          kind: isBf ? 0 : 1, mode: 2, x: mx, y: my, vx: rnd(-0.5, 0.5), vy: isBf ? rnd(-1, -0.2) : rnd(-0.3, 0.2),
          a: rnd(0, 6.28), va: rnd(-0.06, 0.06), size: isBf ? rnd(12, 16) : rnd(5, 8), ph: rnd(0, 6.28), seed: 0,
          age: 0, life: rnd(900, 1500), fade: 1, c: pick(),
        })
        trim()
      }
    }
    const onOver = (e: MouseEvent) => {
      if (!fine) return
      const el = (e.target as HTMLElement).closest?.(HOVER_SEL)
      if (!el || el.contains(e.relatedTarget as Node)) return
      const t = performance.now()
      if (t - (hoverAt.get(el) ?? 0) < 700) return
      hoverAt.set(el, t)
      burst(e.clientX, e.clientY, 6, 1, 0.65)
    }
    const onDown = (e: PointerEvent) => burst(e.clientX, e.clientY, 12, 1.4, 0.5)

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    window.addEventListener('pointerdown', onDown)

    if (import.meta.env.DEV) {
      ;(window as unknown as { __fl: unknown }).__fl = { burst, step, count: () => ps.length }
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])
  return <canvas ref={ref} className="flutter" aria-hidden="true" />
}
