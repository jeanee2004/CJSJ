import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn } from '../ui'
import { useStore } from '../store'
import { supabase } from '../lib/supabase'
import { evaluate } from '../lib/eligibility'

// 로그인 후 마이페이지. 탭: 내 결과 / 내 설문 기록 / 내 정보
// (seniormarketing 의 마이페이지처럼 탭으로 나누고, 맨 아래에 로그아웃·닫기를 둔다)
type Tab = 'result' | 'history' | 'info'
interface Row { id: string; survey_type: 'simple' | 'deep'; created_at: string }

export function MyPage() {
  const { user, answers, hasSaved, logout, closeModal, openModal, openDeep, clearSaved } = useStore()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('result')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState('')

  const load = async () => {
    if (!supabase) return setRows([])
    const { data, error } = await supabase.from('survey_responses').select('id, survey_type, created_at').order('created_at', { ascending: false }).limit(50)
    if (error) { setErr('기록을 불러오지 못했어요.'); setRows([]) } else setRows((data ?? []) as Row[])
  }
  useEffect(() => { if (tab === 'history' && rows === null) void load() }, [tab, rows])

  const verdicts = useMemo(() => (hasSaved ? evaluate(answers) : []), [answers, hasSaved])
  const can = verdicts.filter((v) => v.status === 'ok').length
  const check = verdicts.filter((v) => v.status === 'maybe').length

  const remove = async (id: string) => {
    if (!supabase || !window.confirm('이 설문 기록을 지울까요? 되돌릴 수 없어요.')) return
    const { error } = await supabase.from('survey_responses').delete().eq('id', id)
    if (error) setErr('지우지 못했어요. 잠시 후 다시 시도해 주세요.')
    else { setErr(''); setRows((r) => (r ?? []).filter((x) => x.id !== id)) }
  }

  if (!user) return null
  return (
    <div className="mypage">
      <div className="mp-head">
        <span className="label">마이페이지</span>
        <h2><span className="em">{user.name}</span>님, 안녕하세요</h2>
        {user.isAdmin && <Link className="mp-admin" to="/admin" onClick={closeModal}>관리자 대시보드 →</Link>}
      </div>
      <div className="mp-tabs" role="tablist">
        {([['result', '내 결과'], ['history', '설문 기록'], ['info', '내 정보']] as [Tab, string][]).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>

      {tab === 'result' && (
        hasSaved ? (
          <div className="mp-card">
            <p className="mp-big">받을 수 있는 지원 <b>{can}개</b>{check > 0 && <> · 확인해 볼 지원 <b>{check}개</b></>}</p>
            <p className="mp-sub">{answers.surveyType === 'deep' ? '심화 설문' : '간편 설문'} 결과예요. 이 기기에 저장돼 있어요.</p>
            <div className="mp-row">
              <Btn onClick={() => { closeModal(); nav('/result') }}>결과 자세히 보기</Btn>
              {answers.surveyType !== 'deep' && <Btn variant="line" onClick={() => { closeModal(); openDeep() }}>심화 설문 하기</Btn>}
            </div>
          </div>
        ) : (
          <div className="mp-card">
            <p className="mp-big">아직 저장된 결과가 없어요</p>
            <p className="mp-sub">설문을 하면 이곳에서 다시 볼 수 있어요.</p>
            <div className="mp-row">
              <Btn onClick={() => openModal('diagnose')}>간편 설문 시작</Btn>
              <Btn variant="line" onClick={() => { closeModal(); openDeep() }}>심화 설문 시작</Btn>
            </div>
          </div>
        )
      )}

      {tab === 'history' && (
        <div className="mp-card">
          <p className="mp-sub">로그인해서 한 설문 기록이에요. 이름·이메일 없이 구간 값으로만 저장돼 있어요.</p>
          {rows === null ? <p className="mp-sub">불러오는 중…</p> : rows.length === 0 ? <p className="mp-big">아직 기록이 없어요</p> : (
            <ul className="mp-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <span><b>{r.survey_type === 'deep' ? '심화 설문' : '간편 설문'}</b> · {new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                  <button type="button" className="link-btn" onClick={() => remove(r.id)}>지우기</button>
                </li>
              ))}
            </ul>
          )}
          {err && <p className="login-msg" role="status">{err}</p>}
        </div>
      )}

      {tab === 'info' && (
        <div className="mp-card">
          <dl className="mp-dl">
            <dt>이메일</dt><dd>{user.email}</dd>
            <dt>권한</dt><dd>{user.isAdmin ? '관리자' : '일반 회원'}</dd>
          </dl>
          <p className="mp-sub">이메일은 로그인에만 쓰이고, 설문 응답과 연결해 보여주지 않아요. <Link to="/privacy" onClick={closeModal}>개인정보처리방침</Link></p>
          <div className="mp-row">
            <Btn variant="line" onClick={() => { if (window.confirm('이 기기에 저장된 내 결과를 지울까요? (서버의 통계 응답은 그대로예요)')) clearSaved() }}>이 기기의 내 결과 지우기</Btn>
          </div>
        </div>
      )}

      <div className="mp-row mp-foot">
        <Btn variant="line" onClick={() => { logout(); closeModal(); nav('/') }}>로그아웃</Btn>
        <Btn onClick={closeModal}>닫기</Btn>
      </div>
    </div>
  )
}
