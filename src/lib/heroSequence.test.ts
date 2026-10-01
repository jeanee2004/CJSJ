import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroSequence } from './heroSequence'
import type { Vid } from './heroSequence'

const CLIPS = [{ start: 0, end: 6.6 }, { start: 2.9, end: 9.9 as number | null }]

interface FakeVid extends Vid { on: boolean }
function fake(isA: boolean): FakeVid {
  const v: FakeVid = {
    on: isA, duration: 10.055, currentTime: 0, paused: true, ended: false,
    play() { v.paused = false },
    pause() { v.paused = true },
    classList: { add(c: string) { if (c === 'on') v.on = true }, remove(c: string) { if (c === 'on') v.on = false } },
  }
  return v
}
// 0.05초씩 시간을 흘려보내며 tick 을 호출한다
function run(seq: HeroSequence, vs: FakeVid[], seconds: number) {
  for (let i = 0; i < Math.round(seconds / 0.05); i++) {
    vs.forEach((v) => {
      if (!v.paused) {
        v.currentTime += 0.05
        if (v.currentTime >= v.duration) { v.currentTime = v.duration; v.ended = true; v.paused = true }
      }
    })
    seq.tick()
    vi.advanceTimersByTime(50)
  }
}

describe('HeroSequence (영상 1 → 영상 2 이어 재생)', () => {
  let a: FakeVid, b: FakeVid, seq: HeroSequence
  beforeEach(() => {
    vi.useFakeTimers()
    a = fake(true); b = fake(false)
    seq = new HeroSequence([a, b], CLIPS, 1)
  })
  afterEach(() => vi.useRealTimers())

  it('영상 1을 처음부터 재생한다', () => {
    seq.start()
    expect(a.paused).toBe(false)
    expect(a.currentTime).toBe(0)
    expect(a.on).toBe(true)
    expect(b.on).toBe(false)
  })

  it('끝나기 1초 전(5.6초)에 영상 2가 정해진 시작점부터 섞여 들어온다', () => {
    seq.start()
    run(seq, [a, b], 5.5)
    expect(b.paused).toBe(true) // 아직 전환 전
    run(seq, [a, b], 0.2)
    expect(b.on).toBe(true)
    expect(a.on).toBe(false)
    expect(b.paused).toBe(false)
    expect(b.currentTime).toBeGreaterThanOrEqual(2.9)
    expect(b.currentTime).toBeLessThan(3.3)
    expect(seq.phase).toBe(1)
  })

  it('섞이는 시간이 끝나면 영상 1만 정지하고 영상 2는 계속 재생된다', () => {
    seq.start()
    run(seq, [a, b], 7.0)
    expect(a.paused).toBe(true)
    expect(b.paused).toBe(false)
  })

  it('영상 2가 끝나는 지점에서 정지하고 더는 아무 일도 하지 않는다', () => {
    seq.start()
    run(seq, [a, b], 5.8 + 7.2)
    expect(seq.phase).toBe(2)
    expect(b.paused).toBe(true)
    expect(b.currentTime).toBeGreaterThanOrEqual(9.9)
    run(seq, [a, b], 3)
    expect(seq.phase).toBe(2)
    expect(a.paused).toBe(true)
    seq.resume() // 모두 끝난 뒤에는 재생하지 않는다
    expect(b.paused).toBe(true)
  })

  it('정지 후 이어서 재생하면 지금 보이는 영상만 재생된다', () => {
    seq.start()
    run(seq, [a, b], 7)
    seq.pause()
    expect(a.paused && b.paused).toBe(true)
    seq.resume()
    expect(b.paused).toBe(false)
    expect(a.paused).toBe(true)
  })

  it('처음부터 다시 보기: 영상 1로 되돌아가고 영상 2는 멈춘다', () => {
    seq.start()
    run(seq, [a, b], 14)
    seq.restart()
    expect(seq.phase).toBe(0)
    expect(a.currentTime).toBe(0)
    expect(a.paused).toBe(false)
    expect(a.on).toBe(true)
    expect(b.on).toBe(false)
    expect(b.paused).toBe(true)
    run(seq, [a, b], 6) // 다시 이어진다
    expect(b.on).toBe(true)
  })

  it('섞이는 도중에 처음부터 다시 보기를 눌러도 영상 2가 남아서 재생되지 않는다', () => {
    seq.start()
    run(seq, [a, b], 5.8)
    expect(seq.phase).toBe(1)
    seq.restart()
    vi.advanceTimersByTime(3000) // 이전 전환의 타이머가 늦게 와도
    expect(a.paused).toBe(false) // 되돌린 영상 1은 멈추지 않는다
    expect(b.paused).toBe(true)
  })

  it('백그라운드 탭에서 시점을 놓쳐 영상 1이 끝까지 가도 영상 2로 이어진다', () => {
    seq.start()
    a.currentTime = a.duration; a.ended = true; a.paused = true
    seq.tick()
    expect(seq.phase).toBe(1)
    expect(b.paused).toBe(false)
    expect(b.currentTime).toBe(2.9)
  })

  it('clip2End 가 null 이면 영상 끝까지 재생한다', () => {
    const s2 = new HeroSequence([a, b], [CLIPS[0], { start: 2.9, end: null }], 1)
    s2.start()
    run(s2, [a, b], 5.8 + 7.5)
    expect(s2.phase).toBe(2)
    expect(b.currentTime).toBeCloseTo(10.055, 2)
  })
})

describe('HeroSequence (영상 3개 이어 재생)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('맨 앞 영상이 끝나기 1초 전에 영상 1로 섞여 들어가고 차례로 끝까지 간다', () => {
    const z = fake(true); z.duration = 5.2
    const a = fake(false), b = fake(false)
    const seq = new HeroSequence([z, a, b], [{ start: 0, end: null }, ...CLIPS], 1)
    seq.start()
    run(seq, [z, a, b], 4.1)
    expect(a.paused).toBe(true)
    run(seq, [z, a, b], 0.2)
    expect(seq.phase).toBe(1)
    expect(a.on && !z.on).toBe(true)
    expect(a.currentTime).toBeLessThan(0.5)
    run(seq, [z, a, b], 1.2)
    expect(z.paused).toBe(true)
    run(seq, [z, a, b], 5.6 - 1.4 + 0.2)
    expect(seq.phase).toBe(2)
    expect(b.on).toBe(true)
    run(seq, [z, a, b], 7.2)
    expect(seq.done).toBe(true)
    expect(b.paused).toBe(true)
  })
})
