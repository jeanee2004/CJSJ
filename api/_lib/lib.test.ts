import { describe, expect, it } from 'vitest'
import { judgeMultiHouse, parseLot } from './building.js'
import { dedupe, fromBokjiro, fromGov24, fromYouthCenter } from './benefits.js'
import { parseRone, summarizeSeries } from './rone.js'
import { mask } from './http.js'
import { cacheSecondsFor, monthsAgo, normalizeTrade, summarize } from './trades.js'
import { gatewayError } from './upstream.js'
import { blocks, tag } from './xml.js'

// 2026-10-28 실제 응답에서 잘라낸 형태
const RENT_XML = `<?xml version="1.0"?><response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>
<item><aptNm>가재마을11단지</aptNm><buildYear>2013</buildYear><contractType> </contractType><dealDay>2</dealDay><dealMonth>5</dealMonth><dealYear>2026</dealYear><deposit>20,000</deposit><excluUseAr>59.6144</excluUseAr><floor>4</floor><jibun>654</jibun><monthlyRent>0</monthlyRent><umdNm>종촌동</umdNm></item>
<item><aptNm>A&amp;B</aptNm><buildYear>2015</buildYear><dealDay>21</dealDay><dealMonth>5</dealMonth><dealYear>2026</dealYear><deposit>3,000</deposit><excluUseAr>84.9</excluUseAr><floor>9</floor><jibun>1</jibun><monthlyRent>85</monthlyRent><umdNm>새롬동</umdNm></item>
</items><numOfRows>2</numOfRows><pageNo>1</pageNo><totalCount>2</totalCount></body></response>`

describe('xml', () => {
  it('평평한 item 목록과 엔티티를 읽는다', () => {
    expect(tag(RENT_XML, 'totalCount')).toBe('2')
    const items = blocks(RENT_XML, 'item')
    expect(items).toHaveLength(2)
    expect(items[1].aptNm).toBe('A&B')
    expect(items[0].contractType).toBe('')
  })
})

describe('실거래 정규화', () => {
  it('월세 0이면 전세, 아니면 월세. 콤마 금액을 숫자로', () => {
    const [a, b] = blocks(RENT_XML, 'item').map((r) => normalizeTrade('apt-rent', r))
    expect(a).toMatchObject({ kind: '전세', deposit: 20000, monthlyRent: 0, area: 59.6144, buildYear: 2013, dong: '종촌동', contractDate: '2026-05-02' })
    expect(b).toMatchObject({ kind: '월세', deposit: 3000, monthlyRent: 85 })
  })
  it('매매는 거래금액을 쓰고 해제(cdealType=O)를 따로 센다', () => {
    const t = normalizeTrade('apt-trade', { dealAmount: '87,500', dealYear: '2026', dealMonth: '5', dealDay: '10', cdealType: ' ' })
    const c = normalizeTrade('apt-trade', { dealAmount: '50,000', dealYear: '2026', dealMonth: '5', dealDay: '11', cdealType: 'O' })
    expect(t).toMatchObject({ kind: '매매', deposit: 87500, cancelled: false })
    expect(summarize([t, c])).toEqual({ total: 2, sale: 1, saleCancelled: 1, jeonse: 0, monthly: 0 })
  })
  it('단독다가구는 연면적으로 면적을 채운다', () => {
    expect(normalizeTrade('sh-rent', { totalFloorAr: '20', monthlyRent: '30', deposit: '100' }).area).toBe(20)
  })
  it('최근 3개월은 하루, 이전 달은 30일 캐시', () => {
    const now = new Date('2026-10-28T00:00:00Z')
    expect(monthsAgo(2, now)).toBe('202608')
    expect(monthsAgo(10, now)).toBe('202512')
    expect(cacheSecondsFor('202608', now)).toBe(86_400)
    expect(cacheSecondsFor('202605', now)).toBe(30 * 86_400)
  })
})

describe('다중주택 판정', () => {
  it('기타용도에만 다중주택이 있어도 true (조치원읍 신안리 151 형태)', () => {
    const j = judgeMultiHouse([{ bldNm: ' ', mainPurpsCdNm: '단독주택', etcPurps: '다중주택', regstrKindCdNm: '일반건축물' }])
    expect(j.isMultiHouse).toBe(true)
    expect(j.reason).toBe('MULTI_HOUSE_FOUND')
    expect(j.buildings[0].etcPurps).toBe('다중주택')
  })
  it('다가구주택은 다중주택이 아니다', () => {
    expect(judgeMultiHouse([{ mainPurpsCdNm: '단독주택', etcPurps: '단독주택(다가구주택)' }]).isMultiHouse).toBe(false)
  })
  it('대장이 없으면 unknown', () => {
    expect(judgeMultiHouse([])).toMatchObject({ isMultiHouse: 'unknown', reason: 'NO_RECORD' })
  })
  it('입력 자리수를 검사한다', () => {
    expect(parseLot({ sigunguCd: '36110', bjdongCd: '25032', bun: '0151', ji: '0000', platGbCd: '0' })).not.toBeNull()
    expect(parseLot({ sigunguCd: '36110', bjdongCd: '25032', bun: '151', ji: '0', platGbCd: '0' })).toBeNull()
    expect(parseLot({ sigunguCd: '36110', bjdongCd: '25032', bun: '0151', ji: '0000', platGbCd: '2' })).toBeNull()
    expect(parseLot('x')).toBeNull()
  })
})

describe('키 마스킹·오류 분류', () => {
  it('키 원문·인코딩·쿼리 값을 가린다', () => {
    const k = 'abc+/=123'
    expect(mask(`x ${k} y ${encodeURIComponent(k)} ?serviceKey=zzz&a=1`, k)).toBe('x *** y *** ?serviceKey=***&a=1')
  })
  it('게이트웨이 오류 코드를 구분한다', () => {
    const env = (c: string) => `<OpenAPI_ServiceResponse><cmmMsgHeader><errMsg>E</errMsg><returnReasonCode>${c}</returnReasonCode></cmmMsgHeader></OpenAPI_ServiceResponse>`
    expect(gatewayError(env('30'), 403)).toBe('KEY_NOT_REGISTERED')
    expect(gatewayError(env('22'), 200)).toBe('QUOTA_EXCEEDED')
    expect(gatewayError('{"OpenAPI_ServiceResponse":{"cmmMsgHeader":{"returnReasonCode":"05"}}}', 503)).toBe('UPSTREAM_TIMEOUT')
    expect(gatewayError(RENT_XML, 200)).toBeNull()
  })
})

describe('혜택 정규화', () => {
  it('청년·신혼 주거만 남기고 변경·중지 신청은 뺀다', () => {
    const g = (n: string, sum = '') => fromGov24({ 서비스명: n, 서비스목적요약: sum, 서비스ID: '1', 소관기관명: '세종특별자치시' })
    expect(g('세종시 청년 주택임차보증금 이자지원')).not.toBeNull()
    expect(g('청년월세 지원사업 변경신청(세종시 거주)')).toBeNull()
    expect(g('자활성공지원금', '자활 참여자')).toBeNull()
    expect(fromBokjiro({ servNm: '청년 주거임대료 지원사업', servDgst: '월세 거주 무주택 1인 가구 청년', lifeNmArray: '청년' })).not.toBeNull()
    expect(fromBokjiro({ servNm: '구직활동비 지원사업', servDgst: '취업 준비 청년', lifeNmArray: '청년' })).toBeNull()
    expect(fromYouthCenter({ plcyNm: '청년농촌보금자리', sprvsnInstCdNm: '경상북도 상주시' })).toBeNull()
  })
  it('같은 제도는 하나로 합친다', () => {
    const a = fromYouthCenter({ plcyNo: '1', plcyNm: '세종형 쉐어하우스 청년임대주택 운영', sprvsnInstCdNm: '세종특별자치시' })!
    const b = fromGov24({ 서비스명: '세종형 쉐어하우스 청년임대주택 보급', 서비스ID: '2' })!
    expect(dedupe([a, b])).toHaveLength(1)
  })
})

it('"주거지가 아닌" 같은 표현은 주거 지원으로 보지 않는다', () => {
  expect(fromBokjiro({ servNm: '행려자 및 부랑인 지원', servDgst: '주거지가 아닌 타지방을 여행하던 중', lifeNmArray: '노년, 청년' })).toBeNull()
})

it('온통청년 접수 기간을 읽고, 합칠 때 온통청년을 남기며 빈 칸만 채운다', async () => {
  const { parsePeriod } = await import('./benefits.js')
  expect(parsePeriod('20260601 ~ 20260630')).toEqual({ begin: '20260601', end: '20260630' })
  expect(parsePeriod('20260301 ~ 20260331\\N20260801 ~ 20260815')).toEqual({ begin: '20260801', end: '20260815' })
  expect(parsePeriod('')).toEqual({})
  const y = fromYouthCenter({ plcyNo: '1', plcyNm: '청년 주택임차보증금 이자 지원', sprvsnInstCdNm: '세종특별자치시', aplyYmd: '20260301 ~ 20260331' })!
  const g = fromGov24({ 서비스명: '세종시 청년 주택임차보증금 이자지원', 서비스ID: '2', 신청기한: '금년 접수 마감', 상세조회URL: 'https://plus.gov.kr/x' })!
  const [m] = dedupe([y, g])
  expect(m).toMatchObject({ source: 'youthcenter', begin: '20260301', end: '20260331', deadline: '금년 접수 마감' })
})

describe('R-ONE 정규화', () => {
  // 2026-10-29 실제 응답에서 잘라낸 형태
  const ok = (rows: object[]) => JSON.stringify({ SttsApiTblData: [{ head: [{ list_total_count: rows.length }, { RESULT: { CODE: 'INFO-000', MESSAGE: 'ok' } }] }, { row: rows }] })
  const row = (ym: string, v: number) => ({ STATBL_ID: 'A_2024_00182', WRTTIME_IDTFR_ID: ym, CLS_ID: 500014, CLS_NM: '세종', DTA_VAL: v, UI_NM: '지수' })

  it('행을 월 오름차순 값 목록으로 바꾼다', () => {
    const p = parseRone(ok([row('202608', 98.37), row('202607', 100), row('202508', 92.8)]))
    expect(p).toMatchObject({ ok: true, unit: '지수' })
    if (p.ok) expect(p.points.map((x) => x.ym)).toEqual(['202508', '202607', '202608'])
  })
  it('전월·전년 대비와 최근 n개월을 계산한다', () => {
    const pts = [{ ym: '202508', value: 92.8 }, { ym: '202607', value: 100 }, { ym: '202608', value: 98.3725 }]
    const s = summarizeSeries(pts, '지수', 2)!
    expect(s.latest).toEqual({ ym: '202608', value: 98.37 })
    expect(s.mom).toBe(-1.63)
    expect(s.yoy).toBe(6.0)
    expect(s.series).toHaveLength(2)
    expect(summarizeSeries([{ ym: '202608', value: 1 }], '지수')).toMatchObject({ mom: null, yoy: null })
    expect(summarizeSeries([], '지수')).toBeNull()
  })
  it('오류 봉투를 코드로 바꾼다', () => {
    const e = (c: string) => JSON.stringify({ RESULT: { CODE: c, MESSAGE: 'x' } })
    expect(parseRone(e('INFO-200'))).toEqual({ ok: false, code: 'NO_DATA' })
    expect(parseRone(e('ERROR-290'))).toEqual({ ok: false, code: 'KEY_NOT_REGISTERED' })
    expect(parseRone(e('ERROR-336'))).toEqual({ ok: false, code: 'QUOTA_EXCEEDED' })
    expect(parseRone('<html>')).toEqual({ ok: false, code: 'UPSTREAM_ERROR' })
  })
})

it('나이 기준: 온통청년 필드와 정부24 지원조건, 합칠 때 둘 다 남긴다 (2026-10-29 실제 응답 모양)', async () => {
  const { gov24Ages } = await import('./benefits.js')
  const y = fromYouthCenter({ plcyNo: '1', plcyNm: '청년월세 지원', sprvsnInstCdNm: '세종특별자치시', sprtTrgtAgeLmtYn: 'N', sprtTrgtMinAge: '19', sprtTrgtMaxAge: '39', earnEtcCn: '기준중위소득 청년가구 60% 이하' })!
  expect(y.ages).toEqual([{ min: 19, max: 39, source: 'youthcenter' }])
  expect(y.conditions).toBe('기준중위소득 청년가구 60% 이하')
  // 나이 제한 없음(Y)은 0/0 으로 온다
  expect(fromYouthCenter({ plcyNo: '2', plcyNm: '전세보증금반환보증 보증료 지원', sprvsnInstCdNm: '세종특별자치시', sprtTrgtAgeLmtYn: 'Y', sprtTrgtMinAge: '0', sprtTrgtMaxAge: '0' })!.ages).toBeUndefined()
  expect(gov24Ages({ JA0110: 19, JA0111: 34 })).toEqual([{ min: 19, max: 34, source: 'gov24' }])
  expect(gov24Ages({ JA0110: null, JA0111: null })).toEqual([])
  const g = fromGov24({ 서비스명: '청년월세 지원', 서비스ID: '3', 지원대상: '부모와 별도 거주하는 무주택 청년' })!
  g.ages = gov24Ages({ JA0110: 19, JA0111: 34 })
  const [m] = dedupe([y, g])
  expect(m.ages?.map((x) => `${x.source}:${x.max}`)).toEqual(['youthcenter:39', 'gov24:34'])
})
