// 카카오(Daum) 우편번호 결과 → 건축물대장 조회 코드.
// bcode(법정동코드 10자리) = 시군구 5자리 + 법정동 5자리, 지번 "본번-부번"은 4자리 0패딩, 산이면 platGbCd=1.

export interface PostcodeData { bcode?: string; jibunAddress?: string; autoJibunAddress?: string }
export interface Lot { sigunguCd: string; bjdongCd: string; bun: string; ji: string; platGbCd: '0' | '1' }

export function lotFromPostcode(d: PostcodeData): Lot | null {
  const bcode = (d.bcode ?? '').trim()
  // 도로명을 고르면 jibunAddress 가 비고 autoJibunAddress 에만 지번이 온다
  const jibun = (d.jibunAddress || d.autoJibunAddress || '').trim()
  if (!/^\d{10}$/.test(bcode) || !jibun) return null
  const m = jibun.match(/(?:^|\s)(산\s*)?(\d+)(?:-(\d+))?$/)
  if (!m) return null
  const p4 = (s: string | undefined) => (s ?? '0').padStart(4, '0')
  if (m[2].length > 4 || (m[3] ?? '').length > 4) return null
  return { sigunguCd: bcode.slice(0, 5), bjdongCd: bcode.slice(5), bun: p4(m[2]), ji: p4(m[3]), platGbCd: m[1] ? '1' : '0' }
}
