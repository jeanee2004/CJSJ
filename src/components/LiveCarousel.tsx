import { useState } from 'react'
import type { ReactNode } from 'react'

/**
 * 끝없이 이어 도는 카드 슬라이더 (CSS transform 루프).
 * · 같은 카드를 두 번 이어 붙이고 -50% 만큼만 움직여서 이음매가 안 보여요. 복제본은 스크린리더·Tab 순서에서 뺐어요.
 * · 마우스를 올리거나 키보드 포커스가 들어가면 멈추고, "멈춤" 버튼으로도 멈출 수 있어요.
 * · 모션 줄이기: CSS 에서 움직임을 끄고 격자(그리드)로 보여줘요.
 */
export function LiveCarousel({ items, label }: { items: ReactNode[]; label: string }) {
  const [paused, setPaused] = useState(false)
  return (
    <div className={`lc${paused ? ' paused' : ''}`} role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="lc-view">
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
