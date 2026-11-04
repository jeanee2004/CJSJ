import './Survey.css'
import { useStore } from '../store'
import { Btn } from '../ui'
import { SIMPLE_IDS, QUESTIONS } from '../data/survey'

// "내 상황 확인"을 누르면 먼저 보이는 선택 화면: 맛보기(로그인 없이) / 심화(로그인 후)
export function SurveyChooser() {
  const { user, openModal, openDeep, closeModal } = useStore()
  return (
    <div className="chooser">
      <span className="label">내 상황 확인</span>
      <h2>어떤 설문으로 <span className="em">확인</span>해 볼까요?</h2>
      <div className="chooser-grid">
        <article className="ch-card">
          <div className="ch-top"><span className="ch-ico" aria-hidden="true">⚡</span><span className="ch-badge free">로그인 없이</span></div>
          <h3>맛보기 설문</h3>
          <p className="ch-big"><b>{SIMPLE_IDS.length}</b><span>문항</span><span className="ch-time">약 2분</span></p>
          <ul className="ch-list"><li>4화면, 한 화면에 몇 개씩 한 번에 답해요</li><li>받을 수 있는 지원을 <b>대략</b> 확인해요</li></ul>
          <Btn onClick={() => openModal('diagnose')} track="survey_choose_simple">바로 시작</Btn>
        </article>
        <article className="ch-card deep">
          <div className="ch-top"><span className="ch-ico" aria-hidden="true">🔎</span><span className="ch-badge login">{user ? '로그인됨' : '로그인 필요'}</span></div>
          <h3>심화 설문</h3>
          <p className="ch-big"><b>{QUESTIONS.length}</b><span>문항</span><span className="ch-time">약 6분</span></p>
          <ul className="ch-list"><li>소득·주거비·집 구하기 경험까지 꼼꼼히</li><li><b>더 정확한</b> 결과와 나의 상황 점검</li></ul>
          <Btn variant="light" onClick={() => { closeModal(); openDeep() }} track="survey_choose_deep">{user ? '심화 설문 시작' : '로그인하고 시작'}</Btn>
        </article>
      </div>
      <p className="ch-note">맛보기를 먼저 해도 돼요. 로그인한 뒤 심화 설문에서는 맛보기에서 답한 내용이 이어져요.</p>
    </div>
  )
}
