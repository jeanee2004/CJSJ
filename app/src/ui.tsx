import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { SOURCES, VERIFIED_LABEL } from './data/sources'
import { TERM_MAP } from './data/terms'

export const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/** 글자 롤오버: 같은 글자가 위로 밀려 올라가고 아래에서 새 글자가 올라온다 */
export function Roll({ children }: { children: string }) {
  return (
    <span className="roll" aria-label={children}>
      <span data-t={children} aria-hidden="true">{children}</span>
    </span>
  )
}

/** 마그네틱: 커서 쪽으로 최대 max px 끌려왔다가 spring처럼 복귀 */
export function useMagnetic<T extends HTMLElement>(max = 10) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !canHover()) return
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
      el.style.transition = 'transform .15s linear'
      el.style.transform = `translate(${dx * max}px, ${dy * max}px)`
    }
    const leave = () => {
      el.style.transition = 'transform .8s cubic-bezier(.34,1.56,.64,1)'
      el.style.transform = ''
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    }
  }, [max])
  return ref
}

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M4 4l10 10M14 6v8H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

interface BtnProps {
  to?: string
  href?: string
  onClick?: () => void
  children: string
  variant?: 'ink' | 'light' | 'line' | 'plain' | 'glass'
  size?: 'md' | 'sm'
  disabled?: boolean
  type?: 'button' | 'submit'
  external?: boolean
}
/** 알약 버튼: 호버하면 화살표 원이 번져 전체를 채우고, 글자는 롤오버, 화살표는 회전 */
export function Btn({ to, href, onClick, children, variant = 'ink', size = 'md', disabled, type = 'button', external }: BtnProps) {
  const ref = useMagnetic<HTMLElement>(8)
  const cls = `btn ${variant === 'ink' ? '' : variant} ${size === 'sm' ? 'sm' : ''}`.trim()
  const inner = (
    <>
      <Roll>{children}</Roll>
      {variant !== 'plain' && <span className="dot"><Arrow /></span>}
    </>
  )
  if (to) return <Link ref={ref as never} to={to} className={cls} onClick={onClick}>{inner}</Link>
  if (href)
    return (
      <a ref={ref as never} href={href} className={cls} {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
        {inner}
      </a>
    )
  return <button ref={ref as never} type={type} className={cls} onClick={onClick} disabled={disabled}>{inner}</button>
}

/** 줄 단위 마스크 리빌 제목 — CSS 애니메이션 기반(탭이 백그라운드여도 멈추지 않는다) */
export function Lines({ lines, className = '', as: Tag = 'h2', id, delay = 0 }: { lines: ReactNode[]; className?: string; as?: 'h1' | 'h2' | 'h3'; id?: string; delay?: number }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, margin: '-8% 0px' })
  const [force, setForce] = useState(false)
  // 안전장치: 첫 화면에 이미 보이는 제목은 관찰자 없이도 나타난다
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const top = el.getBoundingClientRect().top
    if (top < window.innerHeight * 0.9) {
      const t = setTimeout(() => setForce(true), 250)
      return () => clearTimeout(t)
    }
  }, [])
  return (
    <Tag ref={ref} id={id} className={`${className} lines ${inView || force ? 'go' : ''}`}>
      {lines.map((l, i) => (
        <span className="row" key={i}>
          <span className="rise" style={{ animationDelay: `${delay + i * 0.1}s` }}>{l}</span>
        </span>
      ))}
    </Tag>
  )
}

/** 스크롤 등장: CSS 전환 기반 (보이는 순간 .in 클래스) */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })
  return (
    <div ref={ref} className={`rv ${inView ? 'in' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  )
}

/** 숫자 카운트업: 타이머 기반이라 백그라운드 탭에서도 끝값에 도달한다 */
export function CountUp({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [v, setV] = useState(reduced() ? to : 0)
  useEffect(() => {
    if (!inView || reduced()) return
    const t0 = Date.now()
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1600)
      setV(to * (1 - Math.pow(1 - p, 4)))
      if (p >= 1) clearInterval(id)
    }, 40)
    return () => clearInterval(id)
  }, [inView, to])
  return <span ref={ref}>{v.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

/** 전문용어: 탭/호버/포커스하면 쉬운 설명이 말풍선으로 */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const t = TERM_MAP[id]
  const [open, setOpen] = useState(false)
  if (!t) return <>{children}</>
  return (
    <span style={{ position: 'relative' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="term" aria-expanded={open} onClick={() => setOpen((o) => !o)} onBlur={() => setOpen(false)}>
        {children ?? t.word}
      </button>
      {open && (
        <span role="tooltip" className="tip">
          <b>{t.word}</b> — {t.easy}
          {t.example && <small>예) {t.example}</small>}
        </span>
      )}
    </span>
  )
}

export function VBadge({ v }: { v: 'official' | 'secondary' | 'unverified' }) {
  const icon = v === 'official' ? '✓' : v === 'secondary' ? '◐' : '!'
  return <span className={`vbadge ${v}`}><span aria-hidden="true">{icon}</span>{VERIFIED_LABEL[v]}</span>
}

/** 출처·기준일·검증 등급 (PRD M6) */
export function SourceBlock({ ids }: { ids: string[] }) {
  return (
    <div className="src">
      {ids.map((id) => {
        const s = SOURCES[id]
        if (!s) return null
        return (
          <div key={id}>
            <VBadge v={s.verified} />
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer noopener">{s.name}</a> : <span>{s.name}</span>}
            <span className="label" style={{ marginLeft: 8 }}>기준 {s.asOf}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 글자 하나하나가 통통 튀는 텍스트 (호버) — 한 줄 유지 */
export function Wave({ text, accent }: { text: string; accent?: boolean }) {
  return (
    <span className={`wave ${accent ? 'em' : ''}`} aria-label={text}>
      {[...text].map((c, i) => (
        <span key={i} aria-hidden="true" style={{ ['--i' as string]: i }}>{c === ' ' ? '\u00a0' : c}</span>
      ))}
    </span>
  )
}
