// 공공데이터포털 응답용 최소 XML 파서.
// 이 API들은 <item><필드>값</필드>…</item> 처럼 한 단계짜리 평평한 구조라 이 정도로 충분하다.

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
export const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
      return ENT[e.toLowerCase()] ?? m
    })

/** 첫 번째 <tag>값</tag> 의 값 (공백 제거). 없으면 '' */
export function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]).trim() : ''
}

/** <block>…</block> 들을 { 자식태그: 값 } 배열로 */
export function blocks(xml: string, block: string): Record<string, string>[] {
  const out: Record<string, string>[] = []
  const re = new RegExp(`<${block}>([\\s\\S]*?)</${block}>`, 'g')
  for (const m of xml.matchAll(re)) {
    const rec: Record<string, string> = {}
    for (const f of m[1].matchAll(/<([A-Za-z_][\w]*)>([\s\S]*?)<\/\1>/g)) rec[f[1]] = decode(f[2]).trim()
    out.push(rec)
  }
  return out
}
