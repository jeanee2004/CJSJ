import type { Survey } from '../data/survey'

// 개인정보 비식별화 규칙: 저장 전에 식별될 수 있는 값을 가리거나 구간으로 바꾼다.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE = /(\+?82[-. ]?)?0?1[0-9][-. ]?[0-9]{3,4}[-. ]?[0-9]{4}/g

/** 자유 입력에 적힌 이메일·전화번호를 가린다 */
export const maskText = (s: string): string => s.replace(EMAIL, '[이메일]').replace(PHONE, '[전화번호]')

const bucket = (n: unknown, size: number): number | '' => {
  const v = Number(n)
  return n === '' || n === undefined || Number.isNaN(v) ? '' : Math.floor(v / size) * size
}

/** 서버로 보낼 응답: 자유 입력은 가리고, 금액은 구간(보증금 1,000만 원 / 월세 5만 원 단위)으로 뭉갠다 */
export function sanitizeSurvey(sv: Survey): Survey {
  const out: Survey = {}
  for (const [k, v] of Object.entries(sv)) {
    if (v === undefined) continue
    if (k === 'Q21' && typeof v === 'string') out[k] = maskText(v).slice(0, 500)
    else if (k === 'N2' && v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = { deposit: bucket(v.deposit, 1000), rent: bucket(v.rent, 5) }
    } else out[k] = v
  }
  return out
}
