// 건축HUB 건축물대장 표제부(getBrTitleInfo)로 다중주택 여부를 판정한다.
// 다중주택은 주용도가 "단독주택"이고 기타용도에만 "다중주택"으로 적힌 경우가 있다
// (2026-10-28 확인: 조치원읍 신안리 151). 그래서 두 필드를 모두 본다.

export type MultiHouse = true | false | 'unknown'

export interface BuildingEvidence {
  name: string
  dong: string
  mainPurpsCdNm: string
  etcPurps: string
  regstrKindCdNm: string
}

export interface Judgement {
  isMultiHouse: MultiHouse
  reason: 'MULTI_HOUSE_FOUND' | 'NO_MULTI_HOUSE' | 'NO_RECORD'
  buildings: BuildingEvidence[]
}

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

export function judgeMultiHouse(items: Record<string, unknown>[]): Judgement {
  const buildings = items.map((it) => ({
    name: s(it.bldNm),
    dong: s(it.dongNm),
    mainPurpsCdNm: s(it.mainPurpsCdNm),
    etcPurps: s(it.etcPurps),
    regstrKindCdNm: s(it.regstrKindCdNm),
  }))
  if (buildings.length === 0) return { isMultiHouse: 'unknown', reason: 'NO_RECORD', buildings }
  const hit = buildings.some((b) => /다중주택/.test(`${b.mainPurpsCdNm} ${b.etcPurps}`))
  return { isMultiHouse: hit, reason: hit ? 'MULTI_HOUSE_FOUND' : 'NO_MULTI_HOUSE', buildings }
}

export interface LotQuery { sigunguCd: string; bjdongCd: string; bun: string; ji: string; platGbCd: '0' | '1' }

/** 입력 검증. 숫자 자리수가 맞지 않으면 null */
export function parseLot(body: unknown): LotQuery | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const q = { sigunguCd: s(b.sigunguCd), bjdongCd: s(b.bjdongCd), bun: s(b.bun), ji: s(b.ji), platGbCd: s(b.platGbCd) || '0' }
  if (!/^\d{5}$/.test(q.sigunguCd) || !/^\d{5}$/.test(q.bjdongCd) || !/^\d{4}$/.test(q.bun) || !/^\d{4}$/.test(q.ji)) return null
  if (q.platGbCd !== '0' && q.platGbCd !== '1') return null
  return q as LotQuery
}
