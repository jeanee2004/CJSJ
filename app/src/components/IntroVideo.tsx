import { useEffect, useRef, useState } from 'react'

// 소개 영상(10초). 재생 전에는 5초 지점의 웃는 장면을 보여주고,
// 영상 우하단의 AI 생성 마크는 하단 라벨로 가린다.
export function IntroVideo({ autoStart = false }: { autoStart?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [muted, setMuted] = useState(false)
  const [p, setP] = useState(0)

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) {
      if (!started || ended) { v.currentTime = 0; setEnded(false) }
      setStarted(true)
      void v.play()
    } else v.pause()
  }

  useEffect(() => {
    if (autoStart) toggle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`intro ${playing ? 'is-playing' : ''}`} data-cursor={playing ? '멈춤' : '재생'}>
      <video
        ref={ref} src="/intro.mp4#t=5" playsInline preload="metadata" muted={muted}
        aria-label="청정 세종 소개 영상 (10초)" onClick={toggle}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setEnded(true); setPlaying(false) }}
        onTimeUpdate={(e) => setP(e.currentTarget.currentTime / (e.currentTarget.duration || 10))}
      />
      <div className="intro-badge" aria-hidden="true"><b>청정 세종</b><span>소개 영상</span></div>
      <div className="intro-bar" aria-hidden="true"><i style={{ width: `${p * 100}%` }} /></div>
      {!playing && (
        <button type="button" className="intro-play" onClick={toggle}>
          <span className="tri" aria-hidden="true">▶</span>
          <span>{ended ? '다시 보기' : '소개 영상 보기'}<small>10초</small></span>
        </button>
      )}
      <button type="button" className="intro-mute" aria-pressed={muted} aria-label={muted ? '소리 켜기' : '소리 끄기'} onClick={() => setMuted((m) => !m)}>
        {muted ? '소리 켜기' : '소리 끄기'}
      </button>
    </div>
  )
}
