// 히어로 영상 이어 재생: 영상 1 → (서서히 섞이며) → 영상 2 → 마지막 장면에서 정지.
// 영상 두 개를 겹쳐 두고 위쪽 영상의 'on' 클래스(투명도)로 서로 섞는다.
// DOM 대신 최소 인터페이스에 의존하므로 가짜 객체로 테스트할 수 있다.

export interface Vid {
  currentTime: number
  duration: number
  paused: boolean
  ended: boolean
  play(): Promise<void> | void
  pause(): void
  classList: { add(c: string): void; remove(c: string): void }
}

export interface SeqOpts {
  clip1Start: number
  clip1End: number
  clip2Start: number
  clip2End: number | null // null 이면 영상 끝까지
  fade: number // 초
}

// 재생 요청이 브라우저에 의해 중단돼도(백그라운드 탭 절전 등) 오류로 남기지 않는다.
function safePlay(v: Vid) {
  try {
    const r = v.play()
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined)
  } catch { /* noop */ }
}

export class HeroSequence {
  /** 0: 영상 1 재생 중, 1: 영상 2 재생 중, 2: 모두 끝나 정지 */
  phase: 0 | 1 | 2 = 0
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private a: Vid
  private b: Vid
  private o: SeqOpts

  constructor(a: Vid, b: Vid, o: SeqOpts) {
    this.a = a
    this.b = b
    this.o = o
  }

  get active(): Vid { return this.phase === 0 ? this.a : this.b }

  /** 처음부터 재생한다 */
  start() { this.restart() }

  /** 50~100ms 간격으로 호출한다 */
  tick() {
    if (this.phase === 0) {
      const a = this.a
      // 백그라운드 탭 등으로 시점을 놓쳐 영상 끝까지 갔어도 이어 붙인다
      if (a.ended || (!a.paused && a.currentTime >= this.o.clip1End - this.o.fade)) this.toClip2()
    } else if (this.phase === 1) {
      const b = this.b
      const end = this.o.clip2End ?? b.duration
      if (b.ended || (!b.paused && b.currentTime >= end)) {
        b.pause()
        this.phase = 2
      }
    }
  }

  private toClip2() {
    this.phase = 1
    this.b.currentTime = this.o.clip2Start
    safePlay(this.b)
    this.b.classList.add('on')
    this.a.classList.remove('on')
    const t = setTimeout(() => {
      this.timers.delete(t)
      this.a.pause() // 섞이는 시간이 끝나면 앞 영상만 정지
    }, this.o.fade * 1000 + 80)
    this.timers.add(t)
  }

  pause() { this.a.pause(); this.b.pause() }
  /** 정지했던 것을 이어서 재생(모두 끝난 뒤에는 아무것도 하지 않는다) */
  resume() { if (this.phase !== 2) safePlay(this.active) }

  /** 처음부터 다시 보기 */
  restart() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.phase = 0
    this.b.pause()
    this.b.classList.remove('on')
    this.a.classList.add('on')
    this.a.currentTime = this.o.clip1Start
    safePlay(this.a)
  }

  dispose() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
  }
}
