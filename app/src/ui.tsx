import { useEffect, useRef, useState } from 'react'
import type { ReactNode, MouseEvent } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { SOURCES, VERIFIED_LABEL } from './data/sources'
import { TERM_MAP } from './data/terms'

export const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

/** 글자 롤오버 링크 텍스트 */
export function Roll({ children }: { children: string }) {
  return (
    <span className="roll" aria-label={children}>
      <span data-t={children} aria-hidden="true">{children}</span>
    </span>
  )
}

/** 마그네틱 알약 버튼 (최대 8px) */
export function useMagnetic<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !canHover()) return
    const move = (e: globalThis.MouseEvent) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height
      el.style.transform = `translate(${dx * 8}px, ${dy * 8}px)`
    }
    const leave = () => {
      el.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)'
      el.style.transform = ''
      setTimeout(() => (el.style.transition = ''), 500)
    }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mousemove', move)
      el.removeEventListener('mouseleave', leave)
    }
  }, [])
  return ref
}

/** 카드 스포트라이트 좌표 */
export function spotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={reduced() ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** 전문용어: 탭/호버/포커스하면 쉬운 설명이 나온다 */
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
  return (
    <span className={`vbadge ${v}`}>
      <span aria-hidden="true">{icon}</span> {VERIFIED_LABEL[v]}
    </span>
  )
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
            <VBadge v={s.verified} />{' '}
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer noopener">{s.name}</a>
            ) : (
              <span>{s.name}</span>
            )}{' '}
            <span className="label">· 기준 {s.asOf}</span>
          </div>
        )
      })}
    </div>
  )
}

export function MagneticLink({ to, onClick, children, className = 'pill' }: { to?: string; onClick?: () => void; children: ReactNode; className?: string }) {
  const ref = useMagnetic<HTMLAnchorElement & HTMLButtonElement>()
  const inner = (
    <>
      {children} <span className="arrow" aria-hidden="true">↘</span>
    </>
  )
  if (to && to.startsWith('/'))
    return (
      <Link ref={ref as never} to={to} className={className} onClick={onClick}>
        {inner}
      </Link>
    )
  if (to)
    return (
      <a ref={ref as never} href={to} className={className} onClick={onClick}>
        {inner}
      </a>
    )
  return (
    <button ref={ref as never} type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  )
}
