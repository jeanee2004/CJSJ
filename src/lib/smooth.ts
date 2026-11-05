import type Lenis from 'lenis'

// 부드러운 스크롤 인스턴스를 한 곳에 둔다. 없으면(터치·모션 줄이기·관리자) 브라우저 기본 동작을 쓴다.
let inst: Lenis | null = null
export const setLenis = (l: Lenis | null) => { inst = l }

/** 요소(또는 맨 위)로 스크롤. 부드러운 스크롤이 켜져 있으면 그것으로, 아니면 기본 scrollIntoView/scrollTo */
export function scrollToTarget(target: Element | 0, smooth = true) {
  if (target === 0) {
    if (inst) inst.scrollTo(0, { duration: 1.1 })
    else window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
    return
  }
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  if (inst) inst.scrollTo(target as HTMLElement, { offset: -margin, duration: 1.1, immediate: !smooth })
  else target.scrollIntoView()
}
