// 실제 공공 API를 호출하는 검증. 평소에는 건너뛰고, 키를 넣은 셸에서만 돌린다:
//   LIVE=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run api/_lib/live.test.ts
// 출력에는 건수·판정만 남기고 키·요청 URL은 찍지 않는다.
import { describe, expect, it } from 'vitest'
import { GET as trades } from '../trades.js'
import { POST as building } from '../building.js'
import { GET as myhome } from '../myhome.js'
import { GET as benefits } from '../benefits.js'

// oxlint-disable-next-line typescript/no-explicit-any -- 검증 출력용
const read = (r: Response) => r.json() as Promise<any>
const live = describe.skipIf(!process.env.LIVE)
const T = 240_000

live('실제 호출', () => {
  it('세종 아파트 매매 vs 전세 (2026.04~06)', async () => {
    for (const ym of ['202604', '202605', '202606']) {
      const sale = await read(await trades(new Request(`http://x/api/trades?dealYmd=${ym}&type=apt-trade&summary=1`)))
      const rent = await read(await trades(new Request(`http://x/api/trades?dealYmd=${ym}&type=apt-rent&summary=1`)))
      console.log(ym, '매매', sale.summary, '| 전월세', rent.summary)
      expect(sale.summary.total).toBeGreaterThan(0)
      expect(rent.summary.jeonse).toBeGreaterThan(0)
    }
  }, T)

  it('다른 주택 유형도 응답한다', async () => {
    for (const type of ['rh-rent', 'sh-rent', 'offi-rent']) {
      const r = await trades(new Request(`http://x/api/trades?dealYmd=202605&type=${type}&summary=1`))
      const j = await read(r)
      console.log(type, r.status, j.summary ?? j.error)
      expect(r.status).toBe(200)
    }
  }, T)

  it('건축물대장 다중주택 판정 3곳', async () => {
    const lots = [
      ['조치원읍 신안리 151 (다중주택 기대)', '25032', '0151', '0000'],
      ['조치원읍 신안리 140-7 (다가구 기대)', '25032', '0140', '0007'],
      ['조치원읍 원리 2-3 (공동주택 기대)', '25021', '0002', '0003'],
    ]
    for (const [label, bjdongCd, bun, ji] of lots) {
      const r = await building(new Request('http://x/api/building', { method: 'POST', body: JSON.stringify({ sigunguCd: '36110', bjdongCd, bun, ji, platGbCd: '0' }) }))
      const j = await read(r)
      console.log(label, r.status, r.headers.get('cache-control'), j.isMultiHouse ?? j.error, j.buildings?.map((b: { mainPurpsCdNm: string; etcPurps: string }) => `${b.mainPurpsCdNm}/${b.etcPurps}`))
      expect(r.status).toBe(200)
    }
  }, T)

  it('마이홈 공공임대 모집공고', async () => {
    const j = await read(await myhome())
    console.log('myhome', j.items?.length, j.items?.filter((n: { open: boolean }) => n.open).length, 'open', j.items?.map((n: { title: string }) => n.title))
    expect(Array.isArray(j.items)).toBe(true)
  }, T)

  it('혜택 목록', async () => {
    const j = await read(await benefits())
    console.log('benefits', j.status, j.items?.length, j.items?.map((b: { source: string; name: string }) => `${b.source}:${b.name}`))
    expect(j.items.length).toBeGreaterThan(0)
  }, T)
})
