// 자동 생성: npx tsx scripts/genAskFaq.ts (씨앗: scripts/askFaqSeeds.ts). 직접 고쳐도 되지만 다시 생성하면 덮어쓴다.
import type { FaqEntry } from '../lib/askFaq'
export const FAQ: FaqEntry[] = [
 {
  "id": "price",
  "q": "세종 집값(시세)이 궁금해요",
  "keys": [
   "집값",
   "시세",
   "실거래",
   "매매가",
   "평당",
   "집가격"
  ],
  "answer": "세종시의 집값은 동네와 주택 유형에 따라 차이가 크므로 공식 통계 사이트를 확인하는 것이 가장 정확합니다. 보통 국토교통부 실거래가 공개시스템을 통해 내가 살고 싶은 지역의 최근 거래 가격을 직접 조회해 볼 수 있습니다. 시세는 시장 상황에 따라 계속 변하므로 계약 전 반드시 최신 자료를 확인하세요.",
  "followups": [
   "전세와 월세 중 무엇이 유리한가요?",
   "세종시의 평균 월세가 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "jeonserate"
  ],
  "links": [
   {
    "key": "molit_price",
    "name": "국토교통부 실거래가 공개시스템",
    "url": "https://rt.molit.go.kr",
    "about": "실제로 거래된 매매·전월세 가격 조회"
   },
   {
    "key": "rone",
    "name": "한국부동산원 부동산통계(R-ONE)",
    "url": "https://www.reb.or.kr/r-one",
    "about": "지역별 집값·전세·월세 통계"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   },
   {
    "key": "data",
    "label": "숫자로 보는 세종 청년의 집",
    "to": "/#data"
   }
  ]
 },
 {
  "id": "jeonseVsWolse",
  "q": "전세와 월세 중 뭐가 나을까요?",
  "keys": [
   "전세월세",
   "전세랑월세",
   "전세와월세",
   "월세전세",
   "뭐가나",
   "어느게나"
  ],
  "answer": "전세와 월세는 본인의 자금 상황과 매달 나가는 고정 지출을 고려해 선택해야 합니다. 전세는 보증금을 맡기고 월세 부담이 거의 없지만 큰 목돈이 필요하고, 월세는 보증금이 적은 대신 매달 임대료를 내야 합니다. 본인의 저축액과 대출 가능 여부를 따져보고 가장 부담이 적은 방식을 결정하세요.",
  "followups": [
   "전세 보증금을 지키는 방법이 궁금하신가요?",
   "월세 세액공제 제도가 궁금하신가요?"
  ],
  "policies": [
   "rentTaxCredit"
  ],
  "terms": [
   "jeonse",
   "wolse",
   "deposit"
  ],
  "links": [],
  "sections": [
   {
    "key": "survey",
    "label": "내 상황으로 받을 수 있는 지원 확인",
    "to": "/#survey"
   }
  ]
 },
 {
  "id": "depositWhat",
  "q": "보증금이 뭐예요?",
  "keys": [
   "보증금"
  ],
  "answer": "보증금은 집을 빌릴 때 집주인에게 맡겨두는 일종의 담보금입니다. 계약이 끝나고 집을 나갈 때 집주인에게 다시 돌려받는 돈이며, 월세를 밀리거나 집을 훼손했을 때를 대비하는 용도입니다. 보증금은 계약 종료 시 반드시 돌려받아야 하므로 계약 전 등기부등본을 통해 안전한 집인지 확인하는 과정이 필수입니다.",
  "followups": [
   "전세보증금 반환보증이 궁금하신가요?",
   "등기부등본 보는 법이 궁금하신가요?"
  ],
  "policies": [
   "depositGuaranteeFee"
  ],
  "terms": [
   "deposit",
   "registry",
   "guarantee"
  ],
  "links": [
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   },
   {
    "key": "hug",
    "name": "주택도시보증공사(HUG)",
    "url": "https://www.khug.or.kr",
    "about": "전세보증금 반환보증 안내"
   }
  ],
  "sections": []
 },
 {
  "id": "jeonseWhat",
  "q": "전세가 뭐예요?",
  "keys": [
   "전세가뭐",
   "전세란",
   "전세뜻",
   "전세가무엇"
  ],
  "answer": "전세는 큰 보증금을 집주인에게 맡기고 일정 기간 동안 집을 빌려 쓰는 방식입니다. 매달 내는 월세가 없다는 장점이 있지만, 보증금 액수가 크기 때문에 계약 시 안전장치를 마련하는 것이 매우 중요합니다. 계약 후에는 반드시 전입신고와 확정일자를 받아 내 보증금을 법적으로 보호받을 수 있도록 하세요.",
  "followups": [
   "전세 대출 종류가 궁금하신가요?",
   "전세 사기 예방법이 궁금하신가요?"
  ],
  "policies": [
   "youthButeemok",
   "generalButeemok"
  ],
  "terms": [
   "jeonse",
   "fixeddate",
   "move",
   "leasereport"
  ],
  "links": [
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   },
   {
    "key": "nhuf",
    "name": "기금e든든",
    "url": "https://nhuf.molit.go.kr",
    "about": "버팀목 등 주택도시기금 대출 안내"
   }
  ],
  "sections": []
 },
 {
  "id": "wolseHelp",
  "q": "월세 지원 받을 수 있어요?",
  "keys": [
   "월세지원",
   "월세보조",
   "월세지원금",
   "청년월세"
  ],
  "answer": "세종시에 거주하거나 입주 예정인 무주택 청년이라면 세종시 청년 월세 지원이나 국토부 청년월세지원 제도를 통해 매달 월세 일부를 지원받을 수 있습니다. 소득과 재산 기준, 나이 요건을 충족해야 하며 지원 대상과 신청 방식은 제도에 따라 달라집니다. 자세한 지원 조건과 신청 기간은 매년 달라질 수 있으므로 복지로나 세종시청 홈페이지 공고를 확인하는 것이 좋습니다. 조건이 맞는다면 연말정산 시 월세 세액공제 혜택도 함께 챙겨보세요.",
  "followups": [
   "세종시 청년 월세 지원 신청 방법이 궁금하신가요?",
   "국토부 청년월세지원과 차이점이 궁금하신가요?"
  ],
  "policies": [
   "sejongRent",
   "molitRent",
   "rentTaxCredit",
   "housingBenefit"
  ],
  "terms": [
   "wolse",
   "income",
   "nohome",
   "median"
  ],
  "links": [
   {
    "key": "bokjiro",
    "name": "복지로",
    "url": "https://www.bokjiro.go.kr",
    "about": "주거급여 등 복지 제도 신청"
   },
   {
    "key": "youthcenter",
    "name": "온통청년",
    "url": "https://www.youthcenter.go.kr",
    "about": "청년 지원 정책 모아보기"
   },
   {
    "key": "sejong",
    "name": "세종특별자치시청",
    "url": "https://www.sejong.go.kr",
    "about": "세종시 지원 사업 공고"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   },
   {
    "key": "survey",
    "label": "내 상황으로 받을 수 있는 지원 확인",
    "to": "/#survey"
   }
  ]
 },
 {
  "id": "jeonseLoan",
  "q": "전세 대출은 어떻게 받나요?",
  "keys": [
   "전세대출",
   "전세자금",
   "버팀목",
   "전세돈",
   "대출받"
  ],
  "answer": "청년이나 신혼부부는 정부에서 지원하는 버팀목 전세자금대출이나 세종시 이자지원 사업을 활용해 낮은 이자로 전세 보증금을 빌릴 수 있습니다. 대출을 받으려면 무주택자여야 하며 연소득과 보유 재산이 일정 기준 이하여야 합니다. 은행 방문 전 기금e든든 홈페이지에서 사전 자격 심사를 신청하고 집 계약 후 확정일자를 받은 뒤 진행하게 됩니다. 대출 한도와 금리는 개인의 소득과 상황에 따라 달라지므로 공식 사이트에서 정확히 확인해야 합니다.",
  "followups": [
   "버팀목 전세대출 신청 자격이 궁금하신가요?",
   "세종시 이자지원 제도가 궁금하신가요?"
  ],
  "policies": [
   "sejongInterest",
   "youthButeemok",
   "newlywedButeemok",
   "smeYouthLoan"
  ],
  "terms": [
   "jeonse",
   "deposit",
   "buteemok",
   "interest"
  ],
  "links": [
   {
    "key": "nhuf",
    "name": "기금e든든",
    "url": "https://nhuf.molit.go.kr",
    "about": "버팀목 등 주택도시기금 대출 안내"
   },
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   },
   {
    "key": "sejong",
    "name": "세종특별자치시청",
    "url": "https://www.sejong.go.kr",
    "about": "세종시 지원 사업 공고"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   },
   {
    "key": "survey",
    "label": "내 상황으로 받을 수 있는 지원 확인",
    "to": "/#survey"
   }
  ]
 },
 {
  "id": "scam",
  "q": "전세 사기가 걱정돼요",
  "keys": [
   "전세사기",
   "사기",
   "깡통전세",
   "역전세",
   "안전한집"
  ],
  "answer": "전세 사기를 예방하려면 계약 전에 등기부등본을 확인하여 집에 빚이 얼마나 있는지 꼭 점검해야 합니다. 집값 대비 전세 보증금 비율이 너무 높거나 대출이 많은 집은 보증금을 돌려받지 못할 위험이 있습니다. 계약 후에는 즉시 전입신고와 확정일자를 받고 전세보증금 반환보증에 가입하여 보증금을 안전하게 보호하는 것이 좋습니다. 보증보험 가입 가능 여부와 세종시 보증료 지원 사업은 정부24나 주택도시보증공사에서 확인해보세요.",
  "followups": [
   "전세보증금 반환보증 가입 조건이 궁금하신가요?",
   "등기부등본 확인법이 궁금하신가요?"
  ],
  "policies": [
   "depositGuaranteeFee"
  ],
  "terms": [
   "jeonse",
   "kkangtong",
   "guarantee",
   "registry"
  ],
  "links": [
   {
    "key": "hug",
    "name": "주택도시보증공사(HUG)",
    "url": "https://www.khug.or.kr",
    "about": "전세보증금 반환보증 안내"
   },
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   },
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "beforeContract",
  "q": "계약 전에 뭘 확인해야 해요?",
  "keys": [
   "계약전",
   "계약하기전",
   "확인할것",
   "체크리스트",
   "집볼때",
   "집보러"
  ],
  "answer": "부동산 계약을 하기 전에는 먼저 등기부등본과 건축물대장을 발급받아 실제 집주인과 집의 상태를 확인해야 합니다. 등기부등본을 통해 집주인의 신분증과 명의가 일치하는지, 집을 담보로 한 빚인 근저당이 지나치게 많지 않은지 체크합니다. 또한 입주 시 하자나 수리비 부담에 대해 특약사항을 계약서에 작성해 두는 것이 안전합니다. 실거래가와 집값 통계는 국토교통부 실거래가 시스템이나 한국부동산원에서 미리 확인해 보세요.",
  "followups": [
   "등기부등본 열람 방법이 궁금하신가요?",
   "계약서 특약사항 적는 법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "registry",
   "bldgledger",
   "mortgage",
   "special"
  ],
  "links": [
   {
    "key": "molit_price",
    "name": "국토교통부 실거래가 공개시스템",
    "url": "https://rt.molit.go.kr",
    "about": "실제로 거래된 매매·전월세 가격 조회"
   },
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   },
   {
    "key": "rone",
    "name": "한국부동산원 부동산통계(R-ONE)",
    "url": "https://www.reb.or.kr/r-one",
    "about": "지역별 집값·전세·월세 통계"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   },
   {
    "key": "data",
    "label": "숫자로 보는 세종 청년의 집",
    "to": "/#data"
   }
  ]
 },
 {
  "id": "registry",
  "q": "등기부등본은 뭐고 어떻게 보나요?",
  "keys": [
   "등기부",
   "등기",
   "갑구",
   "을구",
   "근저당"
  ],
  "answer": "등기부등본은 집의 주인과 빚이 얼마나 있는지 알려주는 부동산의 신분증입니다. 인터넷등기소 사이트에서 주소를 검색해 누구나 열람할 수 있으며, 집주인 이름과 근저당(대출) 여부를 꼭 확인해야 합니다. 계약 전 반드시 최신 내용을 떼어보고 빚이 너무 많지는 않은지 살펴보세요.",
  "followups": [
   "근저당이 많으면 위험한가요?",
   "등기부등본 보는 법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "registry",
   "mortgage"
  ],
  "links": [
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   }
  ],
  "sections": []
 },
 {
  "id": "fixedDate",
  "q": "확정일자와 전입신고는 뭐예요?",
  "keys": [
   "확정일자",
   "전입신고",
   "전입",
   "대항력"
  ],
  "answer": "전입신고는 내가 이 집에 살고 있음을 관공서에 알리는 것이고, 확정일자는 계약서에 도장을 찍어 우선순위를 확보하는 제도입니다. 이 두 가지를 모두 마쳐야 나중에 집주인에게 문제가 생겨도 내 보증금을 안전하게 지킬 수 있습니다. 정부24나 주민센터에서 간편하게 신청할 수 있으니 이사 당일에 바로 처리하세요.",
  "followups": [
   "전입신고는 언제까지 해야 하나요?",
   "확정일자 받는 법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "move",
   "fixeddate"
  ],
  "links": [
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   }
  ],
  "sections": []
 },
 {
  "id": "agentFee",
  "q": "부동산 중개수수료(복비)는 얼마예요?",
  "keys": [
   "복비",
   "중개수수료",
   "중개보수",
   "수수료",
   "부동산비용"
  ],
  "answer": "부동산 중개수수료(복비)는 거래 금액에 따라 법으로 정해진 상한 요율이 있고, 보통 거래 금액에 그 요율을 곱해서 계산해요. 상한을 넘겨 받을 수는 없지만 그 안에서는 중개사와 협의할 수 있어요. 계약 전에 총 금액을 미리 물어보고, 세종시 청년 중개보수 지원 같은 제도가 있는지도 확인해 보세요.",
  "followups": [
   "중개수수료 계산법이 궁금하신가요?",
   "수수료는 언제 지불하나요?"
  ],
  "policies": [],
  "terms": [
   "entry"
  ],
  "links": [],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "moveCost",
  "q": "이사비도 지원받을 수 있어요?",
  "keys": [
   "이사비",
   "이사지원",
   "이사비용",
   "이삿짐"
  ],
  "answer": "이사비는 보통 청년 주거 지원이나 복지 제도 안에서 일부 지원되는 경우가 있어요. 지원 여부와 조건은 지자체와 해마다 달라질 수 있어서, 온통청년과 세종시청 공고에서 내가 대상인지 확인하는 게 가장 정확해요.",
  "followups": [
   "세종시 청년 지원 정책이 궁금하신가요?",
   "주거급여 대상자가 궁금하신가요?"
  ],
  "policies": [
   "housingBenefit"
  ],
  "terms": [],
  "links": [
   {
    "key": "youthcenter",
    "name": "온통청년",
    "url": "https://www.youthcenter.go.kr",
    "about": "청년 지원 정책 모아보기"
   },
   {
    "key": "bokjiro",
    "name": "복지로",
    "url": "https://www.bokjiro.go.kr",
    "about": "주거급여 등 복지 제도 신청"
   },
   {
    "key": "sejong",
    "name": "세종특별자치시청",
    "url": "https://www.sejong.go.kr",
    "about": "세종시 지원 사업 공고"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "maintenance",
  "q": "관리비에는 뭐가 들어가요?",
  "keys": [
   "관리비",
   "공과금",
   "공용",
   "전기세"
  ],
  "answer": "관리비는 보통 공용 전기료, 청소비, 경비비 등 건물을 유지하는 데 드는 비용을 말합니다. 일반적으로 월세와 별도로 매달 납부하며, 포함된 항목은 계약서에 명시되어 있으니 꼼꼼히 확인해야 합니다. 정확한 내역은 계약 전 임대인에게 상세 항목을 요청하거나 건축물대장을 통해 확인하는 것이 좋습니다.",
  "followups": [
   "관리비가 적정한지 궁금하신가요?",
   "관리비 포함 항목 확인법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "maint",
   "bldgledger"
  ],
  "links": [],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   }
  ]
 },
 {
  "id": "renewal",
  "q": "계약을 연장(갱신)하고 싶어요",
  "keys": [
   "갱신",
   "연장",
   "재계약",
   "계약갱신",
   "묵시적",
   "더살고싶"
  ],
  "answer": "계약 갱신은 보통 만기 전 일정 기간 내에 임대인에게 연장 의사를 밝혀 진행합니다. 법적으로 임차인은 계약갱신요구권을 사용하여 기존 계약을 연장할 수 있으며, 이때 임대료는 일반적으로 일정 비율 내에서만 올릴 수 있습니다. 자세한 절차와 요건은 주택임대차보호법 관련 공식 안내를 확인하시기 바랍니다.",
  "followups": [
   "갱신 시 임대료 인상 범위가 궁금하신가요?",
   "계약갱신요구권 사용법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "renewal"
  ],
  "links": [
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   }
  ],
  "sections": []
 },
 {
  "id": "depositBack",
  "q": "집주인이 보증금을 안 돌려줘요",
  "keys": [
   "보증금안",
   "보증금을안",
   "못돌려",
   "안돌려",
   "돌려받",
   "반환",
   "임차권등기",
   "내용증명"
  ],
  "answer": "보증금을 돌려받지 못할 것 같으면, 일반적으로 먼저 계약 만료 전에 집주인에게 내용증명으로 반환 의사를 분명히 남겨요. 이사를 가야 하는 사정이면 임차권등기명령을 신청해 두면 이사 후에도 보증금을 받을 권리를 지킬 수 있어요. 보증보험에 가입돼 있다면 해당 보증기관에 사고 접수를 하세요. 혼자 해결하기 어려우면 대한법률구조공단 같은 공공 상담을 이용해 보세요.",
  "followups": [
   "보증금 반환 보증 가입이 궁금하신가요?",
   "내용증명 작성법이 궁금하신가요?"
  ],
  "policies": [
   "depositGuaranteeFee"
  ],
  "terms": [
   "deposit",
   "guarantee"
  ],
  "links": [
   {
    "key": "hug",
    "name": "주택도시보증공사(HUG)",
    "url": "https://www.khug.or.kr",
    "about": "전세보증금 반환보증 안내"
   }
  ],
  "sections": []
 },
 {
  "id": "insurance",
  "q": "전세보증보험(반환보증)은 뭐예요?",
  "keys": [
   "보증보험",
   "반환보증",
   "hug",
   "전세보험",
   "보증료"
  ],
  "answer": "전세보증보험은 집주인이 보증금을 돌려주지 못할 때 보증기관이 대신 지급해 주는 안전장치입니다. 일반적으로 전세 계약 시 가입하며, 보증금 보호를 위해 필수적으로 고려해야 하는 제도입니다. 가입 조건과 보증료 지원 여부는 주택도시보증공사(HUG) 등 공식 홈페이지에서 확인 가능합니다.",
  "followups": [
   "보증보험 가입 조건이 궁금하신가요?",
   "보증료 지원 제도가 궁금하신가요?"
  ],
  "policies": [
   "depositGuaranteeFee"
  ],
  "terms": [
   "deposit",
   "guarantee"
  ],
  "links": [
   {
    "key": "hug",
    "name": "주택도시보증공사(HUG)",
    "url": "https://www.khug.or.kr",
    "about": "전세보증금 반환보증 안내"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "subscription",
  "q": "청약은 어떻게 시작하나요?",
  "keys": [
   "청약",
   "청약통장",
   "가점",
   "특별공급",
   "분양"
  ],
  "answer": "청약은 주택청약종합저축 통장을 은행에서 개설하는 것으로 시작합니다. 매달 일정 금액을 꾸준히 납입하면 아파트 분양이나 공공임대주택 입주 기회를 얻을 수 있습니다. 청약홈 사이트에서 본인의 자격 요건과 공고를 확인하는 것이 중요하며, 가입 기간과 납입 횟수가 많을수록 유리합니다.",
  "followups": [
   "청년주택드림 청약통장이 궁금하신가요?",
   "청약 가점 계산법이 궁금하신가요?"
  ],
  "policies": [
   "youthDreamAccount",
   "newlywedSpecial"
  ],
  "terms": [
   "nohome",
   "lifeonce"
  ],
  "links": [
   {
    "key": "applyhome",
    "name": "청약홈",
    "url": "https://www.applyhome.co.kr",
    "about": "아파트 청약 신청과 일정"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "publicRental",
  "q": "공공임대주택(행복주택·국민임대)은 뭐가 달라요?",
  "keys": [
   "공공임대",
   "행복주택",
   "국민임대",
   "영구임대",
   "lh",
   "임대주택"
  ],
  "answer": "공공임대주택은 정부나 공공기관이 저렴한 임대료로 공급하는 주택으로, 행복주택과 국민임대 등이 있습니다. 행복주택은 청년과 신혼부부 등 특정 계층의 주거 안정을 위해 직장이나 학교 근처에 주로 공급됩니다. 국민임대는 소득 수준이 낮은 분들을 위해 장기간 저렴하게 거주할 수 있도록 지원하는 제도입니다.",
  "followups": [
   "행복주택 입주 자격이 궁금하신가요?",
   "임대주택 신청 방법이 궁금하신가요?"
  ],
  "policies": [
   "happyYouth",
   "happyNewlywed",
   "nationalRental"
  ],
  "terms": [
   "income",
   "median"
  ],
  "links": [
   {
    "key": "lh_apply",
    "name": "LH 청약플러스",
    "url": "https://apply.lh.or.kr",
    "about": "LH 임대주택 공고와 신청"
   },
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   }
  ]
 },
 {
  "id": "jeonseRental",
  "q": "LH 전세임대는 뭐예요?",
  "keys": [
   "전세임대",
   "매입임대",
   "lh전세",
   "임대주택신청"
  ],
  "answer": "LH 전세임대는 입주자로 선정된 사람이 원하는 집을 찾으면 LH가 집주인과 전세 계약을 맺고, 다시 입주자에게 저렴하게 재임대하는 제도입니다. 보증금의 대부분을 LH가 지원하기 때문에 초기 비용 부담이 매우 적습니다. 다만, 지원 가능한 주택의 조건과 한도가 있으므로 반드시 공고문을 먼저 확인해야 합니다.",
  "followups": [
   "전세임대 신청 절차가 궁금하신가요?",
   "지원 가능한 보증금 한도가 궁금하신가요?"
  ],
  "policies": [
   "lhYouthJeonse",
   "lhNewlywedJeonse"
  ],
  "terms": [
   "deposit",
   "jeonse"
  ],
  "links": [
   {
    "key": "lh_apply",
    "name": "LH 청약플러스",
    "url": "https://apply.lh.or.kr",
    "about": "LH 임대주택 공고와 신청"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "incomeCriteria",
  "q": "소득 기준을 잘 모르겠어요",
  "keys": [
   "소득기준",
   "중위소득",
   "소득이얼마",
   "연소득",
   "소득조건"
  ],
  "answer": "정부 지원 정책에서 말하는 소득 기준은 보통 가구원 수에 따른 '기준 중위소득'을 기준으로 산정합니다. 이는 전체 가구를 소득순으로 나열했을 때 중간에 위치한 가구의 소득을 의미하며, 매년 정부가 발표합니다. 본인의 소득이 이 기준의 몇 퍼센트(%)에 해당하는지에 따라 지원 대상 여부가 결정됩니다.",
  "followups": [
   "소득 산정 방식이 궁금하신가요?",
   "건강보험료로 소득 확인하는 법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "income",
   "median",
   "incometier",
   "healthins"
  ],
  "links": [
   {
    "key": "bokjiro",
    "name": "복지로",
    "url": "https://www.bokjiro.go.kr",
    "about": "주거급여 등 복지 제도 신청"
   }
  ],
  "sections": [
   {
    "key": "data",
    "label": "숫자로 보는 세종 청년의 집",
    "to": "/#data"
   }
  ]
 },
 {
  "id": "noHome",
  "q": "무주택자 기준이 뭐예요?",
  "keys": [
   "무주택",
   "무주택자",
   "집없음",
   "세대원",
   "세대구성원"
  ],
  "answer": "무주택자는 본인과 주민등록등본에 함께 있는 가족 모두가 집을 소지하지 않은 상태를 말합니다. 주택이나 분양권 등을 전혀 소유하고 있지 않아야 일반적으로 무주택자로 인정받습니다. 청약이나 정부 대출 제도의 종류에 따라 세부적인 기준이나 무주택 기간 계산법이 달라질 수 있습니다. 정확한 본인의 무주택 여부는 신청하려는 제도의 공식 안내문이나 주택도시기금 사이트 등에서 확인하시는 것이 좋습니다.",
  "followups": [
   "무주택 기간은 어떻게 계산하는지가 궁금하신가요?",
   "부모님 집이 있어도 무주택인지 궁금하신가요?"
  ],
  "policies": [
   "youthButeemok",
   "lhYouthJeonse",
   "happyYouth",
   "youthDreamAccount"
  ],
  "terms": [
   "nohome",
   "income",
   "buteemok"
  ],
  "links": [
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   },
   {
    "key": "nhuf",
    "name": "기금e든든",
    "url": "https://nhuf.molit.go.kr",
    "about": "버팀목 등 주택도시기금 대출 안내"
   },
   {
    "key": "applyhome",
    "name": "청약홈",
    "url": "https://www.applyhome.co.kr",
    "about": "아파트 청약 신청과 일정"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   },
   {
    "key": "survey",
    "label": "내 상황으로 받을 수 있는 지원 확인",
    "to": "/#survey"
   }
  ]
 },
 {
  "id": "banjeonse",
  "q": "반전세는 뭐예요?",
  "keys": [
   "반전세",
   "보증부월세",
   "반월세"
  ],
  "answer": "반전세는 전세처럼 높은 보증금을 내는 대신 매달 내는 월세를 일반 월세보다 낮게 지불하는 집 구하기 방식입니다. 보통 월세와 전세의 중간 형태여서 매달 들어가는 월세 부담을 줄이고 싶을 때 자주 선택합니다. 보증금이 높은 편이므로 계약 전 등기부등본을 확인하여 안전한 집인지 파악하는 과정이 매우 중요합니다. 정확한 보증금 비율이나 전환율은 계약조건마다 다르므로 공식 부동산 관련 사이트나 계약서를 잘 확인해야 합니다.",
  "followups": [
   "월세를 전세로 바꿀 수 있는지 궁금하신가요?",
   "반전세도 보증금 반환보증 가입이 궁금하신가요?"
  ],
  "policies": [
   "sejongInterest",
   "youthButeemok",
   "lhYouthJeonse",
   "depositGuaranteeFee"
  ],
  "terms": [
   "banjeonse",
   "jeonse",
   "wolse",
   "deposit"
  ],
  "links": [
   {
    "key": "molit_price",
    "name": "국토교통부 실거래가 공개시스템",
    "url": "https://rt.molit.go.kr",
    "about": "실제로 거래된 매매·전월세 가격 조회"
   },
   {
    "key": "hug",
    "name": "주택도시보증공사(HUG)",
    "url": "https://www.khug.or.kr",
    "about": "전세보증금 반환보증 안내"
   },
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   },
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "houseTypes",
  "q": "원룸·오피스텔·빌라·아파트는 뭐가 달라요?",
  "keys": [
   "원룸",
   "오피스텔",
   "빌라",
   "다세대",
   "다가구",
   "아파트차이",
   "주택종류"
  ],
  "answer": "주거 형태는 건물의 구조와 용도, 대출이나 세금 기준에 따라 구분됩니다. 원룸이나 빌라는 보통 방 구조나 소규모 주택을 말하며 오피스텔은 업무와 주거가 모두 가능한 건물입니다. 아파트는 단지가 크고 편의시설이 잘 갖추어져 있지만 상대적으로 매매나 임대 가격이 비싼 편입니다. 집의 종류에 따라 전세자금대출이나 주택임대차 보호 내용이 달라질 수 있으므로 등기부등본이나 건축물대장을 미리 확인해야 합니다.",
  "followups": [
   "오피스텔도 전세대출이 되는지 궁금하신가요?",
   "건축물대장은 어디서 확인하는지 궁금하신가요?"
  ],
  "policies": [
   "youthButeemok",
   "lhYouthJeonse"
  ],
  "terms": [
   "multihouse",
   "bldgledger",
   "registry",
   "maint"
  ],
  "links": [
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   },
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   },
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   },
   {
    "key": "survey",
    "label": "내 상황으로 받을 수 있는 지원 확인",
    "to": "/#survey"
   }
  ]
 },
 {
  "id": "sejongAreas",
  "q": "세종은 어느 동네에 살면 좋을까요?",
  "keys": [
   "세종동네",
   "세종지역",
   "생활권",
   "어디살",
   "어느동네",
   "행복도시",
   "세종위치"
  ],
  "answer": "세종시는 생활권별로 정부청사 근처, 대학가, 상권 발달 지역 등 각각의 특징이 다릅니다. 출퇴근이나 등하교 동선, 주변 대중교통 여건과 생활 편의시설을 고려하여 동네를 선택하는 것이 좋습니다. 세종시 내 시세는 동네와 주택 유형에 따라 차이가 있으므로 사전에 실거래가 정보를 확인하는 편이 도움이 됩니다. 자세한 세종시 청년 주거 정보는 세종시 공식 누리집이나 실거래가 조회 시스템에서 알아보실 수 있습니다.",
  "followups": [
   "세종시 청년 주거 지원금이 궁금하신가요?",
   "세종시 동네별 전월세 시세가 궁금하신가요?"
  ],
  "policies": [
   "sejongRent",
   "sejongInterest"
  ],
  "terms": [
   "jeonse",
   "wolse",
   "deposit"
  ],
  "links": [
   {
    "key": "molit_price",
    "name": "국토교통부 실거래가 공개시스템",
    "url": "https://rt.molit.go.kr",
    "about": "실제로 거래된 매매·전월세 가격 조회"
   },
   {
    "key": "rone",
    "name": "한국부동산원 부동산통계(R-ONE)",
    "url": "https://www.reb.or.kr/r-one",
    "about": "지역별 집값·전세·월세 통계"
   },
   {
    "key": "sejong",
    "name": "세종특별자치시청",
    "url": "https://www.sejong.go.kr",
    "about": "세종시 지원 사업 공고"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   },
   {
    "key": "data",
    "label": "숫자로 보는 세종 청년의 집",
    "to": "/#data"
   }
  ]
 },
 {
  "id": "newlywed",
  "q": "신혼부부가 받을 수 있는 지원이 있나요?",
  "keys": [
   "신혼",
   "신혼부부",
   "결혼",
   "부부"
  ],
  "answer": "신혼부부는 주거 안정을 위해 전용 대출 상품이나 특별공급 청약 등 다양한 지원을 받을 수 있습니다. 일반적으로 소득과 자산 기준을 충족해야 하며, 부부 합산 소득에 따라 신청 가능한 제도가 달라집니다. 자세한 자격 요건과 신청 방법은 세종시청이나 주택도시기금 공식 사이트에서 확인하는 것이 가장 정확합니다.",
  "followups": [
   "신혼부부 전용 대출이 궁금하신가요?",
   "특별공급 청약 조건이 궁금하신가요?"
  ],
  "policies": [
   "newlywedSpecial",
   "newlywedButeemok",
   "happyNewlywed",
   "lhNewlywedJeonse"
  ],
  "terms": [
   "combined",
   "nohome"
  ],
  "links": [
   {
    "key": "nhuf",
    "name": "기금e든든",
    "url": "https://nhuf.molit.go.kr",
    "about": "버팀목 등 주택도시기금 대출 안내"
   },
   {
    "key": "applyhome",
    "name": "청약홈",
    "url": "https://www.applyhome.co.kr",
    "about": "아파트 청약 신청과 일정"
   },
   {
    "key": "sejong",
    "name": "세종특별자치시청",
    "url": "https://www.sejong.go.kr",
    "about": "세종시 지원 사업 공고"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "taxCredit",
  "q": "월세 세액공제(연말정산)는 뭐예요?",
  "keys": [
   "세액공제",
   "연말정산",
   "월세환급",
   "월세공제",
   "홈택스"
  ],
  "answer": "월세 세액공제는 1년간 낸 월세액의 일부를 연말정산 때 세금에서 직접 빼주는 제도입니다. 무주택 세대주로서 일정 소득 이하인 경우 신청할 수 있으며, 월세 납입 증빙 서류가 필요합니다. 공제율과 한도는 매년 바뀔 수 있으니 국세청 홈택스나 관련 안내를 꼭 확인하세요.",
  "followups": [
   "세액공제 신청 자격이 궁금하신가요?",
   "필요한 서류가 궁금하신가요?"
  ],
  "policies": [
   "rentTaxCredit"
  ],
  "terms": [
   "wolse",
   "nohome",
   "income"
  ],
  "links": [
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   }
  ],
  "sections": []
 },
 {
  "id": "housingBenefit",
  "q": "주거급여는 뭐예요?",
  "keys": [
   "주거급여",
   "임차급여",
   "기초생활",
   "복지급여"
  ],
  "answer": "주거급여는 소득이 낮은 가구가 안정적으로 거주할 수 있도록 임대료를 지원해 주는 정부 복지 제도입니다. 가구의 소득 수준과 거주 지역별 기준 임대료를 고려하여 매달 현금으로 지원받을 수 있습니다. 신청 자격과 구체적인 금액은 복지로 사이트에서 본인의 상황을 조회해 보는 것이 좋습니다.",
  "followups": [
   "주거급여 신청 방법이 궁금하신가요?",
   "소득 기준이 궁금하신가요?"
  ],
  "policies": [
   "housingBenefit"
  ],
  "terms": [
   "median",
   "income"
  ],
  "links": [
   {
    "key": "bokjiro",
    "name": "복지로",
    "url": "https://www.bokjiro.go.kr",
    "about": "주거급여 등 복지 제도 신청"
   }
  ],
  "sections": []
 },
 {
  "id": "dreamAccount",
  "q": "청년주택드림 청약통장은 뭐예요?",
  "keys": [
   "청년주택드림",
   "주택드림",
   "드림통장",
   "드림대출",
   "내집마련",
   "청년통장"
  ],
  "answer": "청년주택드림 청약통장은 청년들의 내 집 마련을 돕기 위해 일반 청약통장보다 높은 이자율과 대출 연계 혜택을 제공하는 상품입니다. 일정 기간 이상 납입하고 무주택 요건을 유지하면, 추후 주택 구입 시 낮은 금리로 대출을 받을 수 있는 기회가 주어집니다. 가입 조건과 상세 혜택은 주택도시기금 안내 페이지에서 확인해 보세요.",
  "followups": [
   "청약통장 가입 조건이 궁금하신가요?",
   "주택드림 대출 혜택이 궁금하신가요?"
  ],
  "policies": [
   "youthDreamAccount",
   "youthDreamLoan"
  ],
  "terms": [
   "lifeonce",
   "nohome"
  ],
  "links": [
   {
    "key": "nhuf",
    "name": "기금e든든",
    "url": "https://nhuf.molit.go.kr",
    "about": "버팀목 등 주택도시기금 대출 안내"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "earnest",
  "q": "가계약금이나 계약금은 어떻게 해요?",
  "keys": [
   "가계약",
   "계약금",
   "입금",
   "중도금",
   "잔금"
  ],
  "answer": "가계약금은 계약을 확실히 하겠다는 약속의 의미로, 입금 전 반드시 등기부등본을 확인하고 영수증을 챙겨야 합니다. 일반적으로 보증금의 일부를 지급하며, 계약이 파기될 경우를 대비해 반환 조건을 미리 문자로 남겨두는 것이 좋습니다. 정확한 금액과 입금 계좌는 반드시 임대인 명의인지 확인하고 공식 사이트의 주의사항을 참고하세요.",
  "followups": [
   "계약금 사기 예방법이 궁금하신가요?",
   "등기부등본 확인법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "deposit",
   "registry"
  ],
  "links": [
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   }
  ]
 },
 {
  "id": "specialTerms",
  "q": "계약서 특약에는 뭘 넣어야 해요?",
  "keys": [
   "특약",
   "계약서",
   "계약서쓰",
   "계약서작성"
  ],
  "answer": "계약서 특약은 보증금을 안전하게 지키고 나중에 생길 분쟁을 예방하기 위해 꼭 필요한 내용을 담는 것입니다. 일반적으로 '임대인은 잔금일 다음 날까지 근저당권을 설정하지 않는다'는 문구와 '하자 발생 시 수리 책임'을 명시하는 것이 좋습니다. 본인에게 불리한 조항은 없는지 계약 전 꼼꼼히 살피고, 필요하다면 공인중개사에게 수정을 요청하세요.",
  "followups": [
   "꼭 넣어야 할 특약 문구가 궁금하신가요?",
   "근저당권이 무엇인지 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "special",
   "mortgage",
   "jan",
   "defect"
  ],
  "links": [
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   }
  ],
  "sections": []
 },
 {
  "id": "restore",
  "q": "이사 나갈 때 원상복구는 어디까지 해야 해요?",
  "keys": [
   "원상복구",
   "하자",
   "수리",
   "퇴실",
   "이사나갈"
  ],
  "answer": "이사 나갈 때의 원상복구는 일반적으로 일상적인 사용으로 인한 자연스러운 마모는 제외하고, 파손이나 훼손된 부분에 대해서만 책임지는 것이 원칙입니다. 퇴거 전 집 상태를 사진이나 영상으로 미리 찍어두면 나중에 보증금 반환 시 분쟁을 줄일 수 있습니다. 구체적인 범위는 계약서에 명시된 내용을 우선으로 하니 입주 시 상태를 잘 기록해 두세요.",
  "followups": [
   "보증금 반환 분쟁 해결법이 궁금하신가요?",
   "입주 시 하자 체크리스트가 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "deposit",
   "defect"
  ],
  "links": [
   {
    "key": "hug",
    "name": "주택도시보증공사(HUG)",
    "url": "https://www.khug.or.kr",
    "about": "전세보증금 반환보증 안내"
   }
  ],
  "sections": []
 },
 {
  "id": "moveSteps",
  "q": "이사하고 나서 해야 할 일 순서가 궁금해요",
  "keys": [
   "이사후",
   "이사하고",
   "입주후",
   "이사순서",
   "이사체크",
   "신고뭐"
  ],
  "answer": "이사 직후에는 가장 먼저 관할 주민센터를 방문하거나 온라인으로 전입신고를 하고 확정일자를 받아야 보증금을 보호받을 수 있습니다. 이후 임대차 신고를 완료하고, 관리비와 공과금 정산이 제대로 되었는지 확인하는 과정이 필요합니다. 이 절차들은 소중한 보증금을 지키는 법적 안전장치이므로 이사 당일에 바로 처리하는 것이 좋습니다.",
  "followups": [
   "전입신고와 확정일자 차이가 궁금하신가요?",
   "임대차 신고 방법이 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "move",
   "fixeddate",
   "leasereport",
   "maint"
  ],
  "links": [
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   }
  ],
  "sections": []
 },
 {
  "id": "loanTerms",
  "q": "DSR·LTV 같은 대출 용어가 어려워요",
  "keys": [
   "dsr",
   "ltv",
   "dti",
   "대출한도",
   "대출용어",
   "금리",
   "원리금"
  ],
  "answer": "LTV는 집값 대비 대출받을 수 있는 금액의 비율이고, DSR은 내가 번 돈에서 갚아야 하는 빚의 비율을 뜻해요. 집을 담보로 얼마까지 빌릴 수 있는지, 그리고 내 소득으로 빚을 잘 갚을 수 있는지 확인하는 안전장치예요. 보통 이 비율이 높을수록 대출을 많이 받을 수 있지만 무리하게 빌리면 위험해요. 자세한 대출 조건과 한도는 기금e든든이나 금융회사 공식 홈페이지에서 확인하는 것이 정확해요.",
  "followups": [
   "나에게 맞는 전세 대출이 궁금하신가요?",
   "버팀목 전세대출 신청 방법이 궁금하신가요?"
  ],
  "policies": [
   "youthButeemok",
   "generalButeemok"
  ],
  "terms": [
   "interest",
   "income",
   "buteemok"
  ],
  "links": [
   {
    "key": "nhuf",
    "name": "기금e든든",
    "url": "https://nhuf.molit.go.kr",
    "about": "버팀목 등 주택도시기금 대출 안내"
   },
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "interestSupport",
  "q": "세종시 전세 대출 이자 지원은 뭐예요?",
  "keys": [
   "대출이자지원",
   "이자지원",
   "대출이자",
   "세종이자",
   "이자도움"
  ],
  "answer": "세종 청년 주택임차보증금 이자지원 사업은 청년이 전세 대출을 받을 때 발생하는 이자 일부를 세종시가 대신 내주는 제도예요. 대출 이자 부담을 줄여주어 청년이 세종시에 안정적으로 거주할 수 있도록 돕고 있어요. 지원 대상이나 지원 비율 등은 모집 시기마다 달라질 수 있으므로 보통 세종시청 공고를 통해 자세히 발표돼요. 정확한 신청 자격과 일정은 세종시청 공식 홈페이지에서 확인하시는 것을 추천해요.",
  "followups": [
   "월세 지원 제도도 궁금하신가요?",
   "이자를 지원받기 위한 소득 기준이 궁금하신가요?"
  ],
  "policies": [
   "sejongInterest",
   "youthButeemok"
  ],
  "terms": [
   "deposit",
   "jeonse",
   "interest",
   "income"
  ],
  "links": [
   {
    "key": "sejong",
    "name": "세종특별자치시청",
    "url": "https://www.sejong.go.kr",
    "about": "세종시 지원 사업 공고"
   },
   {
    "key": "youthcenter",
    "name": "온통청년",
    "url": "https://www.youthcenter.go.kr",
    "about": "청년 지원 정책 모아보기"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "firstHouse",
  "q": "처음 집을 구하는데 어디서부터 해야 해요?",
  "keys": [
   "첫집",
   "어디서부터",
   "초보",
   "막막",
   "처음집",
   "처음구"
  ],
  "answer": "처음 집을 구할 때는 먼저 내가 사용할 수 있는 예산을 확인하고 대출 가능 여부를 파악하는 것부터 시작해야 해요. 예산이 정해지면 인터넷으로 실거래가를 확인하고 직접 집을 방문하여 상태를 살피는 단계로 넘어가요. 마음에 드는 집을 발견했다면 계약하기 전에 등기부등본을 열람하여 안전한 집인지 검토해야 해요. 집 구하기의 구체적인 순서와 준비사항은 마이홈포털 공식 사이트에서 한눈에 확인하실 수 있어요.",
  "followups": [
   "등기부등본 확인법이 궁금하신가요?",
   "전세 사기를 피하는 방법이 궁금하신가요?"
  ],
  "policies": [
   "youthButeemok",
   "molitRent"
  ],
  "terms": [
   "deposit",
   "jeonse",
   "wolse",
   "registry"
  ],
  "links": [
   {
    "key": "molit_price",
    "name": "국토교통부 실거래가 공개시스템",
    "url": "https://rt.molit.go.kr",
    "about": "실제로 거래된 매매·전월세 가격 조회"
   },
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   },
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   }
  ],
  "sections": [
   {
    "key": "live",
    "label": "세종 실시간 집 소식·실거래가 보기",
    "to": "/#live"
   },
   {
    "key": "survey",
    "label": "내 상황으로 받을 수 있는 지원 확인",
    "to": "/#survey"
   }
  ]
 },
 {
  "id": "whatSupport",
  "q": "나는 어떤 지원을 받을 수 있나요?",
  "keys": [
   "어떤지원",
   "내가받",
   "맞는지원",
   "지원자격",
   "나는어떤"
  ],
  "answer": "청년의 소득과 나이, 주거 형태에 따라 세종시와 정부에서 제공하는 주거 지원 혜택이 달라져요. 월세를 지원받는 제도부터 전세 대출 이자를 낮춰주는 제도, 저렴하게 살 수 있는 임대주택까지 다양한 종류가 있어요. 일반적으로 본인의 소득 수준과 보유 자산에 따라 신청할 수 있는 사업이 나누어져요. 나에게 꼭 맞는 지원 제도는 온통청년이나 마이홈포털 공식 홈페이지에서 조회가 가능해요.",
  "followups": [
   "나에게 맞는 주거 제도가 궁금하신가요?",
   "청년 전용 월세 지원이 궁금하신가요?"
  ],
  "policies": [
   "sejongInterest",
   "sejongRent",
   "molitRent",
   "youthButeemok"
  ],
  "terms": [
   "income",
   "nohome",
   "median"
  ],
  "links": [
   {
    "key": "youthcenter",
    "name": "온통청년",
    "url": "https://www.youthcenter.go.kr",
    "about": "청년 지원 정책 모아보기"
   },
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   },
   {
    "key": "sejong",
    "name": "세종특별자치시청",
    "url": "https://www.sejong.go.kr",
    "about": "세종시 지원 사업 공고"
   }
  ],
  "sections": [
   {
    "key": "survey",
    "label": "내 상황으로 받을 수 있는 지원 확인",
    "to": "/#survey"
   },
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "contractTerm",
  "q": "임대차 계약기간은 보통 얼마예요?",
  "keys": [
   "계약기간",
   "2년",
   "이년",
   "몇년",
   "임대차보호"
  ],
  "answer": "주택 임대차 계약기간은 일반적으로 집주인과 세입자가 합의하여 정하며 법으로 최소한의 기간을 보호받을 수 있습니다. 계약 기간 중에는 세입자가 안심하고 거주할 수 있도록 법적 권리가 보장됩니다. 만약 계약을 연장하고 싶다면 사전에 집주인에게 의사를 전달하고 재계약 조건을 확인해야 합니다. 상세한 계약 규정과 지원 정책은 마이홈포털 등 공식 사이트에서 확인하시는 것을 추천합니다.",
  "followups": [
   "계약 기간을 연장하는 권리가 궁금하신가요?",
   "계약 만료 전 중도 해지가 가능한지 궁금하신가요?"
  ],
  "policies": [
   "sejongRent"
  ],
  "terms": [
   "renewal",
   "jeonse",
   "wolse"
  ],
  "links": [
   {
    "key": "myhome",
    "name": "마이홈포털",
    "url": "https://www.myhome.go.kr",
    "about": "공공임대·전세대출 안내와 신청"
   },
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 },
 {
  "id": "landlordChange",
  "q": "집주인이 바뀌면 어떻게 되나요?",
  "keys": [
   "집주인바뀌",
   "집주인이바뀌",
   "주인이바뀌",
   "집주인변경",
   "경매",
   "집이팔리"
  ],
  "answer": "계약 기간 중에 집주인이 바뀌더라도 기존 임대차 계약은 새로운 집주인에게 그대로 승계됩니다. 따라서 세입자는 이사를 나가지 않고 계약 만료일까지 계속 거주할 수 있습니다. 단, 이러한 권리를 안전하게 보호받으려면 미리 전입신고를 마치고 확정일자를 받아두어야 합니다. 관련 전입신고 및 확정일자 신청 절차는 정부24 공식 사이트에서 확인하실 수 있습니다.",
  "followups": [
   "전입신고와 확정일자를 받는 방법이 궁금하신가요?",
   "새 집주인과 계약서를 다시 써야 하는지 궁금하신가요?"
  ],
  "policies": [],
  "terms": [
   "move",
   "fixeddate",
   "deposit",
   "guarantee"
  ],
  "links": [
   {
    "key": "gov24",
    "name": "정부24",
    "url": "https://www.gov.kr",
    "about": "확정일자·전입신고 등 민원 신청"
   },
   {
    "key": "iros",
    "name": "인터넷등기소",
    "url": "https://www.iros.go.kr",
    "about": "등기부등본 열람·발급"
   }
  ],
  "sections": [
   {
    "key": "policies",
    "label": "세종 주요 지원 제도 보기",
    "to": "/#policies"
   }
  ]
 }
]
