import { describe, expect, it } from 'vitest'
import { accuracy, boardRows, costBars, gauge, phaseBadge, progress, tally } from './resultViz'

describe('resultViz', () => {
  it('판정 개수와 비율', () => {
    const t = tally([{ status: 'ok' }, { status: 'ok' }, { status: 'maybe' }, { status: 'no' }])
    expect(t.total).toBe(4)
    expect(t.segs.map((s) => s.count)).toEqual([2, 1, 1])
    expect(t.segs[0].pct).toBe(50)
    expect(tally([]).segs.every((s) => s.pct === 0)).toBe(true)
  })
  it('상태 보드: 가능한 것부터, 마감 배지는 가능/확인 항목만', () => {
    const rows = boardRows(
      [{ id: "a", status: "no" }, { id: "b", status: "maybe" }, { id: "c", status: "ok" }] as never,
      { a: 'A', b: 'B', c: 'C' },
      { a: 'open', b: 'closed', c: 'open' },
    )
    expect(rows.map((r) => r.id)).toEqual(['c', 'b', 'a'])
    expect(rows[1].badge).toBe('마감')
    expect(rows[2].badge).toBeUndefined()
    expect(phaseBadge('unknown')).toBeUndefined()
  })
  it('금액 막대', () => {
    const b = costBars({ buteemokPaid: 300, interestPaid: 600, better: 'buteemok' })
    expect(b[1].pct).toBe(100)
    expect(b[0].pct).toBe(50)
    expect(b[0].best).toBe(true)
    expect(costBars({ buteemokPaid: 0, interestPaid: 0, better: 'same' }).every((x) => !x.best && x.pct === 0)).toBe(true)
  })
  it('게이지', () => {
    expect(gauge(15).load).toBe('light')
    expect(gauge(30).load).toBe('normal')
    expect(gauge(45).load).toBe('heavy')
    expect(gauge(120).pct).toBe(100)
    expect(gauge(-5).shown).toBe(0)
  })
  it('정확도와 진행바', () => {
    expect(accuracy(10, 28).pct).toBe(36)
    expect(accuracy(40, 28).pct).toBe(100)
    expect(accuracy(0, 0).pct).toBe(0)
    expect(progress(3, 7)).toBeCloseTo(42.86, 1)
    expect(progress(1, 0)).toBe(0)
  })
})
