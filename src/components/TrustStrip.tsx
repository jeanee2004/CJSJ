/* 공공 데이터 기반 신뢰 스트립: 실제로 이 서비스가 쓰는 공식 출처 이름만 텍스트로 보여 준다 */
const SOURCES = ['국토교통부', '주택도시기금', '세종특별자치시', '한국토지주택공사(LH)', '정부24', '복지로', '온통청년', '마이홈포털', '한국부동산원']

export function TrustStrip() {
  return (
    <section className="trust" aria-label="데이터 출처">
      <div className="wrap trust-in">
        <p className="trust-lead">
          <b>공공 데이터 기반</b>
          <span className="trust-date">2026년 11월 확인</span>
        </p>
        <ul className="trust-list">
          {SOURCES.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    </section>
  )
}
