export interface Term {
  id: string
  word: string
  easy: string
  example?: string
}

// 쉬운 말 사전: 한 문장, 중학생 수준
export const TERMS: Term[] = [
  { id: 'deposit', word: '보증금', easy: '집 계약할 때 집주인에게 맡겨두는 돈이에요. 이사 나갈 때 그대로 돌려받아요.', example: '보증금 1,000만원 / 월세 50만원' },
  { id: 'jeonse', word: '전세', easy: '월세 없이 큰 보증금(전세금)만 맡기고 사는 방식이에요. 대부분 대출을 받아서 마련해요.', example: '전세금 1.5억원, 월세 0원' },
  { id: 'wolse', word: '월세', easy: '매달 집값을 내는 방식이에요. 보증금이 있으면 "보증부 월세"라고 해요.' },
  { id: 'banjeonse', word: '반전세', easy: '전세와 월세의 중간이에요. 보증금이 꽤 크고 월세도 조금 내요.' },
  { id: 'buteemok', word: '버팀목 대출', easy: '나라(주택도시기금)가 낮은 금리로 전세금을 빌려주는 대출이에요.' },
  { id: 'interest', word: '이자지원', easy: '대출 이자의 일부를 세종시가 대신 내주는 제도예요.' },
  { id: 'income', word: '연소득', easy: '1년 동안 번 돈(세금 내기 전)이에요. 월급 250만원이면 약 3,000만원이에요.', example: '월 250만원 × 12개월 = 3,000만원' },
  { id: 'combined', word: '부부합산 소득', easy: '부부가 각자 번 돈을 더한 금액이에요.' },
  { id: 'median', word: '기준중위소득', easy: '나라 사람들을 소득 순으로 줄 세웠을 때 가운데 사람의 소득이에요. 지원 대상을 정하는 기준으로 써요.' },
  { id: 'pickone', word: '택1 (둘 중 하나)', easy: '둘 다 자격이 되어도 하나만 받을 수 있다는 뜻이에요. 그래서 어느 쪽이 더 이득인지 비교해야 해요.' },
  { id: 'multihouse', word: '다중주택', easy: '원룸·고시원처럼 방을 여러 개로 나눠 쓰는 건물이에요. 지원 대상에서 빠지는 경우가 많아요.' },
  { id: 'nohome', word: '무주택', easy: '내 이름으로 된 집이 없다는 뜻이에요.' },
  { id: 'lifeonce', word: '생애 1회', easy: '평생 한 번만 받을 수 있다는 뜻이에요. 한 번 받으면 다음에는 못 받아요.' },
  { id: 'jan', word: '잔금', easy: '집 계약 때 보증금을 나눠 내는데, 마지막에 내는 큰 금액이에요. 이걸 낸 뒤에는 신청할 수 없는 제도가 있어서, 순서가 중요해요.' },
  { id: 'guarantee', word: '반환보증', easy: '집주인이 보증금을 못 돌려줘도 보증 회사가 대신 돌려주는 보험이에요.' },
  { id: 'entry', word: '진입비용', easy: '집에 들어갈 때 드는 보증금 외의 돈이에요. 중개보수, 이사비, 보증료 같은 거예요.' },
  { id: 'move', word: '전입', easy: '주민등록 주소를 새 집으로 옮기는 일이에요.' },
]

export const TERM_MAP = Object.fromEntries(TERMS.map((t) => [t.id, t]))
