// 의견 남기기 보기. 화면(Feedback)과 관리자 요약(feedbackSummary)이 같이 쓴다.
export const FEEDBACK_OPTIONS = [
  { id: 'agent', t: '중개보수 (부동산 수수료)', d: '집 계약할 때 부동산에 내는 돈' },
  { id: 'move', t: '이사비', d: '짐 옮기는 비용, 청소, 입주 준비' },
  { id: 'guarantee', t: '보증료', d: '보증금 보호 보험·대출 보증 수수료' },
  { id: 'deposit', t: '보증금 자체', d: '큰 목돈을 한 번에 마련하는 일' },
  { id: 'rent', t: '매달 월세', d: '매달 나가는 월세 부담' },
  { id: 'gap', t: '지원을 못 받는 기간', d: '이사한 뒤 접수 때까지 기다려야 하는 기간' },
] as const
export const FEEDBACK_LABEL: Record<string, string> = Object.fromEntries(FEEDBACK_OPTIONS.map((o) => [o.id, o.t.replace(/ \(.*\)$/, '')]))
export const COMMENT_MAX = 300
