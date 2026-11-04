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
  molit_rtms: {
    id: 'molit_rtms',
    name: '국토교통부 실거래가 공개시스템 (공공데이터포털 아파트 매매·전월세 API)',
    url: 'https://rt.molit.go.kr',
    asOf: '매월 갱신',
    verified: 'official',
  },
  myhome_notice: {
    id: 'myhome_notice',
    name: '마이홈포털 공공주택 모집공고 (공공데이터포털 API)',
    url: 'https://www.myhome.go.kr',
    asOf: '6시간마다 갱신',
    verified: 'official',
  },
  gg_wolse_loan: {
    id: 'gg_wolse_loan',
    name: '경기주거복지포털 「청년전용 보증부월세대출」 안내 (순자산 3.37억 표기, 2026 기준 3.45억과 다름)',
    url: 'https://housing.gg.go.kr/html/24214.do',
    asOf: '2026.11 확인',
    verified: 'secondary',
  },
  molit_sme_youth: {
    id: 'molit_sme_youth',
    name: '국토교통부 「중소기업 취업청년 임차보증금 지원」 (원문 내용은 읽지 못함, 제도 존재만 확인)',
    url: 'https://www.molit.go.kr/good_job/work/etc_06.jsp',
    asOf: '2026.11 확인',
    verified: 'unverified',
  },
  korea_dream: {
    id: 'korea_dream',
    name: '정책브리핑 청년 주택드림 청약통장·대출 안내 (검색 결과로 확인, 원문 재확인 필요)',
    url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148926750',
    asOf: '2026.11 확인',
    verified: 'secondary',
  },
  applyhome_special: {
    id: 'applyhome_special',
    name: '청약홈 특별공급 안내 (소득기준 표는 2025년도 기준으로 확인)',
    url: 'https://www.applyhome.co.kr/ar/ara/selectSubscrptIntroSpetialView.do',
    asOf: '2025년도 표',
    verified: 'secondary',
  },
  lh_jeonse: {
    id: 'lh_jeonse',
    name: 'LH 전세임대 사업안내 (페이지가 오래되어 한도·소득 비율은 참고만)',
    url: 'https://jeonse.lh.or.kr/jw/li/lfstsRentBsnsGuidance.do?mi=3207',
    asOf: '2023.3 안내 포함',
    verified: 'secondary',
  },
  myhome_happy: {
    id: 'myhome_happy',
    name: '마이홈포털 「행복주택 입주자격 안내 (2026년 적용 소득·자산 기준)」',
    url: 'https://www.myhome.go.kr/hws/portal/cont/selectHappyHouseView.do',
    asOf: '2026 적용',
    verified: 'official',
  },
  lh_youth_maeip: {
    id: 'lh_youth_maeip',
    name: 'LH 「청년매입임대주택」 안내',
    url: 'https://www.lh.or.kr/menu.es?mid=a10401020200',
    asOf: '2026.11 확인',
    verified: 'official',
  },
  myhome_national: {
    id: 'myhome_national',
    name: '마이홈포털 「국민임대주택 입주자격 및 소득 (2026년도 적용)」',
    url: 'https://www.myhome.go.kr/hws/portal/cont/selectNationalRentalHouseView.do',
    asOf: '2026 적용',
    verified: 'official',
  },
  tax_rent: {
    id: 'tax_rent',
    name: '월세 세액공제 신청 방법·조건·한도 (민간 정리 글, 근거: 조세특례제한법 시행령 제95조)',
    url: 'https://studygov.kr/blog/0539-monthly-rent-tax-credit/',
    asOf: '2026.11 확인',
    verified: 'secondary',
  },
  molit_housing_benefit: {
    id: 'molit_housing_benefit',
    name: '국토교통부 「2026년 주거급여 선정기준 및 최저보장수준」 행정규칙',
    url: 'https://www.molit.go.kr/USR/I0204/m_45/dtl.jsp?idx=18653',
    asOf: '2026',
    verified: 'official',
  },
  gov24_sejong_fee: {
    id: 'gov24_sejong_fee',
    name: '정부24 공공서비스 「세종 전세보증금반환보증 보증료 지원」 (공공데이터 API 원문: 보증료 최대 40만원)',
    url: 'https://www.gov.kr/portal/rcvfvrSvc/main',
    asOf: '2026.10 API 확인',
    verified: 'official',
  },
  guri_fee: {
    id: 'guri_fee',
    name: '구리시 「전세보증금반환보증 보증료 지원」 (타 지자체 사례, 세종시 아님)',
    url: 'https://www.guri.go.kr/youth/contents.do?key=5716',
    asOf: '2026.1~',
    verified: 'official',
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
