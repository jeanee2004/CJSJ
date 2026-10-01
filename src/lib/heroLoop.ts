// 히어로 영상 "끝부분 반복" 상태 기계.
// 영상 두 개(a, b)를 겹쳐 두고, 끝부분(loopStart~loopEnd)에 가까워지면 다른 영상을
// loopStart부터 틀면서 서서히 교체(크로스페이드)해 되감기 순간이 보이지 않게 한다.
// DOM 대신 최소 인터페이스에 의존하므로 가짜 객체로 테스트할 수 있다.

export interface Vid {
  currentTime: number
  paused: boolean
  ended: boolean
  play(): Promise<void> | void
  pause(): void
  classList: { add(c: string): void; remove(c: string): void }
}

export interface LoopOpts {
  loopStart: number
  loopEnd: number
  fade: number // 초
}

// 재생 요청이 브라우저에 의해 중단돼도(백그라운드 탭 절전 등) 오류로 남기지 않는다.
// 탭이 다시 보이면 브라우저가 이어서 재생한다.
function safePlay(v: Vid) {
  try {
    const r = v.play()
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => undefined)
  } catch { /* noop */ }
}

export class HeroLoop {
  private cur: 0 | 1 = 0
  private crossing = false
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private v: [Vid, Vid]
  private o: LoopOpts

  constructor(a: Vid, b: Vid, o: LoopOpts) {
    this.v = [a, b]
    this.o = o
  }

  get now(): Vid { return this.v[this.cur] }
  private get other(): Vid { return this.v[this.cur === 0 ? 1 : 0] }

  /** 처음부터 재생(첫 방문) 또는 끝부분 시작점부터 재생(재방문) */
  start(fromBeginning: boolean) {
    this.now.currentTime = fromBeginning ? 0 : this.o.loopStart
    safePlay(this.now)
  }

  /** 50ms 정도 간격으로 호출한다 */
  tick() {
    const n = this.now
    // 백그라운드 탭 등으로 시점을 놓쳐 영상 끝까지 갔다면 끝부분 시작점으로 바로 되돌린다
    if (n.ended) { n.currentTime = this.o.loopStart; safePlay(n); return }
    if (!n.paused && !this.crossing && n.currentTime >= this.o.loopEnd - this.o.fade) this.crossfade()
  }

  private crossfade() {
    this.crossing = true
    const old = this.now
    this.cur = this.cur === 0 ? 1 : 0
    const next = this.now
    next.currentTime = this.o.loopStart
    safePlay(next)
    next.classList.add('on')
    old.classList.remove('on')
    const t = setTimeout(() => {
      this.timers.delete(t)
      this.crossing = false
      // 현재 재생 중인 영상은 절대 멈추지 않는다 — 이전 영상만 정지
      if (old !== this.now) old.pause()
    }, this.o.fade * 1000 + 80)
    this.timers.add(t)
  }

  play() { safePlay(this.now) }
  pause() { this.v[0].pause(); this.v[1].pause() }
  toggle() { if (this.now.paused) this.play(); else this.pause() }

  /** 처음부터 다시 보기 */
  restart() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
    this.crossing = false
    const n = this.now
    const o = this.other
    o.pause()
    o.classList.remove('on')
    n.classList.add('on')
    n.currentTime = 0
    safePlay(n)
  }

  dispose() {
    this.timers.forEach(clearTimeout)
    this.timers.clear()
  }
}
