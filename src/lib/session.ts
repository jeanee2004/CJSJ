// 가명 세션 ID: 브라우저 탭 세션마다 만든 무작위 값. 이메일·IP 와 연결하지 않는다.
export function sessionId(): string {
  try {
    let id = sessionStorage.getItem('cjsj.sid')
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('cjsj.sid', id) }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
