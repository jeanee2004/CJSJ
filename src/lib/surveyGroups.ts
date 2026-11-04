import type { Q, Survey } from '../data/survey'
import { visibleQuestions } from './survey'

// 맛보기(간편) 설문의 '묶음 화면': 한 화면에 관련 질문을 함께 보여 4화면 안에 끝낸다.
// 응답 키(Q1~N4)와 판정(deriveAnswers)은 그대로이고, 화면에 나누는 방법만 정한다.
export interface Group { key: string; title: string; sub: string; ids: string[]; rows?: Record<string, string[]> }
export interface Screen { key: string; title: string; sub: string; qs: Q[] }

export const SIMPLE_GROUPS: Group[] = [
  { key: 'me', title: '나는 누구인가요?', sub: '나이·거주·현재 상황', ids: ['Q1', 'Q2', 'Q3'] },
  { key: 'home', title: '우리 집 살림살이', sub: '가구·소득·지금 사는 집', ids: ['Q4', 'Q5', 'Q7', 'Q9'] },
  // 판정에 쓰는 제도(1~4번 행)만 묻는다. 나머지 3개 제도는 심화 설문에서 묻는다.
  { key: 'aware', title: '이 제도들, 아세요?', sub: '핵심 주거지원 4가지', ids: ['Q13'], rows: { Q13: ['1', '2', '3', '4'] } },
  { key: 'next', title: '새로 구하는 집', sub: '방식·금액·종류·계약 단계', ids: ['N1', 'N2', 'N3', 'N4'] },
]

/** 질문을 화면에 맞게 줄인다(행렬은 지정한 행만) */
export const trimQ = (q: Q, g: Group): Q => {
  const keep = g.rows?.[q.id]
  return keep && q.rows ? { ...q, rows: q.rows.filter((r) => keep.includes(r.k)) } : q
}

/** 현재 응답 기준으로 보여 줄 맛보기 화면들(조건부로 숨은 문항은 빠지고, 빈 화면은 없앤다) */
export const simpleScreens = (s: Survey): Screen[] => {
  const vis = visibleQuestions(s, 'simple')
  return SIMPLE_GROUPS
    .map((g) => ({ key: g.key, title: g.title, sub: g.sub, qs: g.ids.map((id) => vis.find((q) => q.id === id)).filter((q): q is Q => !!q).map((q) => trimQ(q, g)) }))
    .filter((x) => x.qs.length > 0)
}
