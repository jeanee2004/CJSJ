import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroLoop } from './heroLoop'
import type { Vid } from './heroLoop'

const OPTS = { loopStart: 4.2, loopEnd: 6.6, fade: 0.8 }

// 재생 중이면 advance 로 시간이 흐르는 가짜 영상
interface FakeVid extends Vid { name: string; on: boolean; duration: number }
function fake(name: string): FakeVid {
  const v: FakeVid = {
    name, on: name === 'a', duration: 10,
    currentTime: 0, paused: true, ended: false,
    play() { v.paused = false },
    pause() { v.paused = true },
    classList: { add(c: string) { if (c === 'on') v.on = true }, remove(c: string) { if (c === 'on') v.on = false } },
  }
  return v
}
type F = FakeVid

// 0.05초씩 시간을 흘려보내며 tick 을 호출한다 (실제 50ms 인터벌과 같은 조건)
function run(loop: HeroLoop, vs: F[], seconds: number) {
  const steps = Math.round(seconds / 0.05)
  for (let i = 0; i < steps; i++) {
    vs.forEach((v) => { if (!v.paused) { v.currentTime += 0.05; if (v.currentTime >= v.duration) { v.currentTime = v.duration; v.ended = true; v.paused = true } } })
    loop.tick()
    vi.advanceTimersByTime(50)
  }
}

describe('HeroLoop (끝부분 크로스페이드 반복)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('항상 정확히 한 영상만 재생·표시되며, 오래 돌려도 멈추지 않는다', () => {
    const a = fake('a'), b = fake('b')
    const loop = new HeroLoop(a, b, OPTS)
    loop.start(false)
    for (let sec = 1; sec <= 60; sec++) {
      run(loop, [a, b], 1)
      if (sec % 3 === 0) {
        // 교체 직후 페이드 구간이 아닌 시점에서만 단일 재생을 요구
        vi.advanceTimersByTime(1000)
        const playing = [a, b].filter((v) => !v.paused)
        expect(playing.length).toBeGreaterThanOrEqual(1)
        expect(playing.length).toBeLessThanOrEqual(2)
        expect([a, b].filter((v) => v.on).length).toBe(1)
        expect([a, b].find((v) => v.on)!.paused).toBe(false)
      }
    }
    expect(a.currentTime).toBeLessThan(6.7)
    expect(b.currentTime).toBeLessThan(6.7)
  })

  it('첫 방문: 0초부터 재생해 끝부분에서 처음으로 교체된다', () => {
    const a = fake('a'), b = fake('b')
    const loop = new HeroLoop(a, b, OPTS)
    loop.start(true)
    run(loop, [a, b], 5.7)
    expect(a.on).toBe(true)
    run(loop, [a, b], 0.3) // loopEnd - fade = 5.8 도달
    expect(b.on).toBe(true)
    expect(a.on).toBe(false)
    expect(b.currentTime).toBeGreaterThanOrEqual(4.2)
    run(loop, [a, b], 1.2)
    expect(a.paused).toBe(true) // 이전 영상은 정지
    expect(b.paused).toBe(false)
  })

  it('늦게 도착한 타이머가 다시 쓰이기 시작한 영상을 멈추지 않는다', () => {
    const a = fake('a'), b = fake('b')
    const loop = new HeroLoop(a, b, OPTS)
    loop.start(false)
    // a→b, b→a 로 연속 교체 (타이머를 일부러 몰아서 실행)
    for (let i = 0; i < 6; i++) {
      const n = loop.now
      n.currentTime = OPTS.loopEnd - OPTS.fade
      loop.tick()
    }
    vi.advanceTimersByTime(5000)
    const shown = [a, b].find((v) => v.on)!
    expect(shown.paused).toBe(false)
  })

  it('끝까지 가버린 경우(백그라운드 탭) 끝부분 시작점으로 복구한다', () => {
    const a = fake('a'), b = fake('b')
    const loop = new HeroLoop(a, b, OPTS)
    loop.start(false)
    a.currentTime = 10; a.ended = true; a.paused = true
    loop.tick()
    expect(a.currentTime).toBe(4.2)
    expect(a.paused).toBe(false)
  })

  it('정지/재생 토글과 처음부터 보기', () => {
    const a = fake('a'), b = fake('b')
    const loop = new HeroLoop(a, b, OPTS)
    loop.start(false)
    loop.toggle()
    expect(a.paused).toBe(true)
    loop.toggle()
    expect(a.paused).toBe(false)
    run(loop, [a, b], 2)
    loop.restart()
    expect(loop.now.currentTime).toBe(0)
    expect(loop.now.paused).toBe(false)
    expect([a, b].filter((v) => v.on).length).toBe(1)
  })
})
