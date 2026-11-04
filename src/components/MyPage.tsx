import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn } from '../ui'
import { EMPTY_PROFILE, useStore } from '../store'
import type { Profile } from '../store'
import { supabase } from '../lib/supabase'
import { evaluate } from '../lib/eligibility'
import type { Status } from '../lib/eligibility'
import { POLICIES } from '../data/policies'
import { QUESTIONS } from '../data/survey'

// 로그인 후 마이페이지. 탭: 요약 / 내 결과 / 설문 기록 / 내 정보(별명 등 수정)
type Tab = 'sum' | 'result' | 'history' | 'info'
interface Row { id: string; survey_type: 'simple' | 'deep'; created_at: string }

const ST: Record<Status, { t: string; g: string }> = { ok: { t: '신청할 수 있어요', g: '✓' }, maybe: { t: '확인해 보면 좋아요', g: '△' }, no: { t: '지금은 어려워요', g: '✕' } }
const opts = (id: string) => QUESTIONS.find((q) => q.id === id)?.opts ?? []
const short = (t: string) => t.replace(/ \(.*\)$/, '')

export function MyPage() {
  const { user, answers, hasSaved, logout, closeModal, openModal, openDeep, clearSaved, updateProfile } = useStore()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('sum')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState<Profile>(user?.profile ?? EMPTY_PROFILE)
  const [saved, setSaved] = useState<'' | 'ok' | 'fail'>('')

  const load = async () => {
    if (!supabase) return setRows([])
    const { data, error } = await supabase.from('survey_responses').select('id, survey_type, created_at').order('created_at', { ascending: false }).limit(50)
    if (error) { setErr('기록을 불러오지 못했어요.'); setRows([]) } else setRows((data ?? []) as Row[])
  }
  useEffect(() => { if (rows === null && (tab === 'history' || tab === 'sum')) void load() }, [tab, rows])

  const verdicts = useMemo(() => (hasSaved ? evaluate(answers) : []), [answers, hasSaved])
  const cnt = (s: Status) => verdicts.filter((v) => v.status === s).length
  const total = verdicts.length || 1
  const deepDone = hasSaved && answers.surveyType === 'deep'
  const todo: { t: string; act: () => void }[] = []
  if (!user?.profile.nickname) todo.push({ t: '별명을 정해 보세요', act: () => setTab('info') })
  if (!hasSaved) todo.push({ t: '맛보기 설문으로 받을 수 있는 지원 확인하기', act: () => openModal('diagnose') })
  else if (!deepDone) todo.push({ t: '심화 설문으로 결과를 더 정확하게 만들기', act: () => { closeModal(); openDeep() } })
  if (hasSaved) todo.push({ t: '결과 자세히 보고 신청 순서 확인하기', act: () => { closeModal(); nav('/result') } })

  const remove = async (id: string) => {
    if (!supabase || !window.confirm('이 설문 기록을 지울까요? 되돌릴 수 없어요.')) return
    const { error } = await supabase.from('survey_responses').delete().eq('id', id)
    if (error) setErr('지우지 못했어요. 잠시 후 다시 시도해 주세요.')
    else { setErr(''); setRows((r) => (r ?? []).filter((x) => x.id !== id)) }
  }
  const save = async () => { setSaved(''); setSaved((await updateProfile(form)) ? 'ok' : 'fail') }
  const toggleInterest = (id: string) => setForm((f) => ({ ...f, interests: f.interests.includes(id) ? f.interests.filter((x) => x !== id) : [...f.interests, id].slice(0, 8) }))

  if (!user) return null
  const simpleN = rows?.filter((r) => r.survey_type === 'simple').length ?? 0
  const deepN = rows?.filter((r) => r.survey_type === 'deep').length ?? 0
  const ageText = short(opts('Q1').find((o) => o.v === user.profile.ageBand)?.t ?? '')
  const resText = short(opts('Q2').find((o) => o.v === user.profile.residence)?.t ?? '')

  return (
    <div className="mypage">
      <div className="mp-hero">
        <span className="mp-avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
        <div>
          <h2>{user.name}<small>님</small></h2>
          <p className="mp-email">{user.email}</p>
          <p className="mp-chips">
            <span className="mp-chip">{user.isAdmin ? '관리자' : '일반 회원'}</span>
            {ageText && <span className="mp-chip">{ageText}</span>}
            {resText && <span className="mp-chip">{resText}</span>}
          </p>
        </div>
        {user.isAdmin && <Link className="mp-admin" to="/admin" onClick={closeModal}>대시보드 →</Link>}
      </div>

      <ol className="mp-steps" aria-label="설문 진행 단계">
        <li className={hasSaved ? 'done' : 'now'}><i>{hasSaved ? '✓' : '1'}</i>맛보기 설문</li>
        <li className={deepDone ? 'done' : hasSaved ? 'now' : ''}><i>{deepDone ? '✓' : '2'}</i>심화 설문</li>
        <li className={deepDone ? 'now' : ''}><i>3</i>신청 준비</li>
      </ol>

      <div className="mp-tabs" role="tablist">
        {([['sum', '요약'], ['result', '내 결과'], ['history', '설문 기록'], ['info', '내 정보']] as [Tab, string][]).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
        ))}
      </div>

      {tab === 'sum' && (
        <div className="mp-body">
          <div className="mp-tiles">
            <div className="mp-tile"><b>{hasSaved ? cnt('ok') : '–'}</b><span>신청할 수 있는 지원</span></div>
            <div className="mp-tile"><b>{hasSaved ? cnt('maybe') : '–'}</b><span>확인해 볼 지원</span></div>
            <div className="mp-tile"><b>{rows === null ? '–' : simpleN + deepN}</b><span>내 설문 횟수</span></div>
          </div>
          {hasSaved && (
            <div className="mp-bar" role="img" aria-label={`판정: 신청 ${cnt('ok')}개, 확인 ${cnt('maybe')}개, 어려움 ${cnt('no')}개`}>
              <i className="ok" style={{ flex: cnt('ok') / total }} /><i className="maybe" style={{ flex: cnt('maybe') / total }} /><i className="no" style={{ flex: cnt('no') / total }} />
            </div>
          )}
          {user.profile.interests.length > 0 && (
            <p className="mp-sub">관심 지원: {user.profile.interests.map((id) => POLICIES.find((p) => p.id === id)?.name).filter(Boolean).join(' · ')}</p>
          )}
          <h3 className="mp-h">다음에 하면 좋은 일</h3>
          <ul className="mp-todo">
            {todo.map((x) => <li key={x.t}><button type="button" onClick={x.act}><span>{x.t}</span><i aria-hidden="true">→</i></button></li>)}
            {todo.length === 0 && <li className="mp-sub">모두 마쳤어요. 결과에서 신청 순서를 확인해 보세요.</li>}
          </ul>
        </div>
      )}

      {tab === 'result' && (
        <div className="mp-body">
          {hasSaved ? (
            <>
              <p className="mp-sub">{deepDone ? '심화 설문' : '맛보기 설문'} 결과예요. 이 기기에 저장돼 있어요.</p>
              <ul className="mp-pol">
                {verdicts.map((v) => (
                  <li key={v.id} className={v.status}>
                    <i aria-hidden="true">{ST[v.status].g}</i>
                    <span><b>{POLICIES.find((p) => p.id === v.id)?.name ?? v.id}</b><small>{ST[v.status].t}</small></span>
                  </li>
                ))}
              </ul>
              <div className="mp-row">
                <Btn onClick={() => { closeModal(); nav('/result') }}>결과 자세히 보기</Btn>
                {!deepDone && <Btn variant="line" onClick={() => { closeModal(); openDeep() }}>심화 설문 하기</Btn>}
              </div>
            </>
          ) : (
            <>
              <p className="mp-big">아직 저장된 결과가 없어요</p>
              <p className="mp-sub">설문을 하면 이곳에서 다시 볼 수 있어요.</p>
              <div className="mp-row"><Btn onClick={() => openModal('diagnose')}>맛보기 설문 시작</Btn><Btn variant="line" onClick={() => { closeModal(); openDeep() }}>심화 설문 시작</Btn></div>
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="mp-body">
          <p className="mp-sub">로그인해서 한 설문 기록이에요. 이름·이메일 없이 구간 값으로만 저장돼 있어요.</p>
          {rows === null ? <p className="mp-sub">불러오는 중…</p> : rows.length === 0 ? <p className="mp-big">아직 기록이 없어요</p> : (
            <ul className="mp-list">
              {rows.map((r) => (
                <li key={r.id}>
                  <span><b>{r.survey_type === 'deep' ? '심화 설문' : '맛보기 설문'}</b> · {new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                  <button type="button" className="link-btn" onClick={() => remove(r.id)}>지우기</button>
                </li>
              ))}
            </ul>
          )}
          {err && <p className="login-msg" role="status">{err}</p>}
        </div>
      )}

      {tab === 'info' && (
        <div className="mp-body">
          <div className="field">
            <label htmlFor="mp-nick">별명 (최대 12자)</label>
            <input id="mp-nick" value={form.nickname} maxLength={12} placeholder="예: 세종청년" onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="mp-age">연령대</label>
            <select id="mp-age" value={form.ageBand} onChange={(e) => setForm({ ...form, ageBand: e.target.value })}>
              <option value="">선택 안 함</option>
              {opts('Q1').map((o) => <option key={o.v} value={o.v}>{short(o.t)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mp-res">거주 형태</label>
            <select id="mp-res" value={form.residence} onChange={(e) => setForm({ ...form, residence: e.target.value })}>
              <option value="">선택 안 함</option>
              {opts('Q2').map((o) => <option key={o.v} value={o.v}>{short(o.t)}</option>)}
            </select>
          </div>
          <div className="field">
            <span>관심 있는 지원 (여러 개 선택)</span>
            <div className="mp-interests">
              {POLICIES.map((p) => (
                <button key={p.id} type="button" aria-pressed={form.interests.includes(p.id)} className={form.interests.includes(p.id) ? 'on' : ''} onClick={() => toggleInterest(p.id)}>{p.name}</button>
              ))}
            </div>
          </div>
          <div className="mp-row">
            <Btn onClick={save}>저장하기</Btn>
            {saved === 'ok' && <span className="mp-saved" role="status">저장했어요</span>}
            {saved === 'fail' && <span className="login-msg" role="status">저장하지 못했어요. 잠시 후 다시 시도해 주세요.</span>}
          </div>
          <p className="mp-sub">별명 등은 내 계정에만 저장되고, 설문 응답과 연결해 보지 않아요. 비워도 괜찮아요. <Link to="/privacy" onClick={closeModal}>개인정보처리방침</Link></p>
          <hr className="mp-hr" />
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
