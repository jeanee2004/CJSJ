// 모든 수치는 출처·기준일·검증 등급과 함께 보관한다. (PRD M6)
// official = 정부·지자체 공식 페이지에서 직접 확인
// secondary = 언론·2차 자료 (공식 보도자료 인용), 신청 전 원문 재확인 필요
// unverified = PRD 인용 등 이번 조사에서 원문 확인 못함 → 화면에 "확인 필요" 표시

export type Verified = 'official' | 'secondary' | 'unverified'

export interface Source {
  id: string
  name: string
  url: string
  asOf: string
  verified: Verified
}

export const SOURCES: Record<string, Source> = {
  newspim_interest: {
    id: 'newspim_interest',
    name: '뉴스핌 「세종시, 청년·신혼부부 주택임차보증금 이자 지원」',
    url: 'https://www.newspim.com/news/view/20260316000261',
    asOf: '2026.3.16',
    verified: 'secondary',
  },
  hankook_interest: {
    id: 'hankook_interest',
    name: '주간한국 「세종시, 청년 주택임차보증금 이자 최대 4.1% 지원」',
    url: 'https://weekly.hankooki.com/news/articleView.html?idxno=7154854',
    asOf: '2026.3',
    verified: 'secondary',
  },
  sejong_interest_2025: {
    id: 'sejong_interest_2025',
    name: '세종시청 「2025년 청년 주택임차보증금 이자지원사업 상시모집 안내」',
    url: 'https://www.sejong.go.kr/bbs/R0071/view.do?nttId=B000000140018Cw8dF4o',
    asOf: '2025',
    verified: 'official',
  },
  viva_rent: {
    id: 'viva_rent',
    name: '브릿지경제 「세종시, 무주택 청년 주거임대료 월 최대 20만 원 지원」',
    url: 'https://www.viva100.com/article/20260222500170',
    asOf: '2026.2.22',
    verified: 'secondary',
  },
  myhome_buteemok: {
    id: 'myhome_buteemok',
    name: '마이홈포털 「주택도시기금 버팀목 전세대출 안내」',
    url: 'https://www.myhome.go.kr/hws/portal/cont/selectSupLeaseLoanView.do',
    asOf: '2026.10 확인',
    verified: 'official',
  },
  korea_newlywed_2023: {
    id: 'korea_newlywed_2023',
    name: '대한민국 정책브리핑 「신혼부부 버팀목·디딤돌대출 소득요건 완화」',
    url: 'https://www.korea.kr/news/customizedNewsView.do?newsId=148921012',
    asOf: '2023.10.6 시행',
    verified: 'official',
  },
  banksalad_youth: {
    id: 'banksalad_youth',
    name: '뱅크샐러드 「2026 청년버팀목전세대출 조건·한도」 (2025.6.28 한도 변경 반영)',
    url: 'https://www.banksalad.com/articles/%EC%B2%AD%EB%85%84%EB%B2%84%ED%8C%80%EB%AA%A9%EC%A0%84%EC%84%B8%EB%8C%80%EC%B6%9C-%EC%A1%B0%EA%B1%B4-%EC%84%9C%EB%A5%98-%EA%B8%88%EB%A6%AC',
    asOf: '2026',
    verified: 'secondary',
  },
  studygov_rent: {
    id: 'studygov_rent',
    name: '청년월세지원 2026 안내 (국토교통부 2026.3.18 보도자료 인용)',
    url: 'https://benefit.studygov.kr/blog/2026-youth-monthly-rent/',
    asOf: '2026.3.18',
    verified: 'secondary',
  },
  newsis_youth_stat: {
    id: 'newsis_youth_stat',
    name: '뉴시스 「세종시, 청년 12만명 시대…주거·고용 불안정 여전」 (세종시 2025 청년통계)',
    url: 'https://www.newsis.com/view/NISX20251230_0003459032',
    asOf: '2025.12.30',
    verified: 'secondary',
  },
  prd: {
    id: 'prd',
    name: '청정 세종 PRD v0.2 데스크 리서치 (원문 재확인 필요)',
    url: '',
    asOf: '2026.10.1',
    verified: 'unverified',
  },
}

export const VERIFIED_LABEL: Record<Verified, string> = {
  official: '공식 확인',
  secondary: '언론 인용 · 원문 확인 권장',
  unverified: '확인 필요',
}

// 신청·확인 창구 (홈 주소만 사용 — 세부 URL은 임의로 만들지 않는다)
export const PORTALS = {
  sejong: { name: '세종시청 (세종 일자리 종합 플랫폼 · 잡아람)', url: 'https://www.sejong.go.kr' },
  bokjiro: { name: '복지로', url: 'https://www.bokjiro.go.kr' },
  nhuf: { name: '기금e든든 (주택도시기금)', url: 'https://nhuf.molit.go.kr' },
  myhome: { name: '마이홈포털', url: 'https://www.myhome.go.kr' },
}
