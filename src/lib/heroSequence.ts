// 히어로 영상 이어 재생: 영상 1 → (서서히 섞이며) → 영상 2 → … → 마지막 영상의 끝에서 정지.
// 영상들을 겹쳐 두고 현재 영상의 'on' 클래스(투명도)로 서로 섞는다.
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

export interface ClipOpts {
  start: number
  end: number | null // null 이면 영상 끝까지
}

// 재생 요청이 브라우저에 의해 중단돼도(백그라운드 탭 절전 등) 오류로 남기지 않는다.
function safePlay(v: Vid) {
  try {
    const r = v.play()
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined)
  } catch { /* noop */ }
}

export class HeroSequence {
  /** 지금 재생 중인 영상의 번호. 모두 끝나 정지하면 영상 개수와 같다 */
  phase = 0
  private timers = new Set<ReturnType<typeof setTimeout>>()

  private vids: Vid[]
  private clips: ClipOpts[]
  private fade: number

  constructor(vids: Vid[], clips: ClipOpts[], fade: number) {
    this.vids = vids
    this.clips = clips
    this.fade = fade
  }

  get done() { return this.phase >= this.vids.length }
  get active(): Vid { return this.vids[Math.min(this.phase, this.vids.length - 1)] }

  /** 처음부터 재생한다 */
  start() { this.restart() }

  private endOf(i: number) { return this.clips[i].end ?? this.vids[i].duration }

  /** 50~100ms 간격으로 호출한다 */
  tick() {
    if (this.done) return
    const i = this.phase
    const v = this.vids[i]
    const last = i === this.vids.length - 1
    if (last) {
      if (v.ended || (!v.paused && v.currentTime >= this.endOf(i))) {
        v.pause()
        this.phase = this.vids.length
      }
    // 백그라운드 탭 등으로 시점을 놓쳐 영상 끝까지 갔어도 이어 붙인다
    } else if (v.ended || (!v.paused && v.currentTime >= this.endOf(i) - this.fade)) {
      this.advance()
    }
  }

  private advance() {
    const prev = this.vids[this.phase]
    const next = this.vids[++this.phase]
    next.currentTime = this.clips[this.phase].start
    safePlay(next)
    next.classList.add('on')
    prev.classList.remove('on')
    const t = setTimeout(() => {
      this.timers.delete(t)
      prev.pause() // 섞이는 시간이 끝나면 앞 영상만 정지
    }, this.fade * 1000 + 80)
    this.timers.add(t)
  }

  pause() { this.vids.forEach((v) => v.pause()) }
  /** 정지했던 것을 이어서 재생(모두 끝난 뒤에는 아무것도 하지 않는다) */
  resume() { if (!this.done) safePlay(this.active) }

  /** 처음부터 다시 보기 */
  restart() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.phase = 0
    this.vids.forEach((v, i) => {
      if (i) { v.pause(); v.classList.remove('on') }
    })
    const first = this.vids[0]
    first.classList.add('on')
    first.currentTime = this.clips[0].start
    safePlay(first)
  }

  dispose() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
  }
}
