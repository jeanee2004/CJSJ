import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn } from '../ui'
import { EMPTY_PROFILE, useStore } from '../store'
import type { Profile } from '../store'
import { supabase } from '../lib/supabase'
import { evaluate } from '../lib/eligibility'
import type { Status } from '../lib/eligibility'
import { POLICIES, policyById } from '../data/policies'
import { QUESTIONS } from '../data/survey'
import { DocBox } from './DocBox'
import { PrepBoard } from './PrepBoard'
import './MyPage.css'

// 로그인 후 마이페이지. 탭: 요약 / 내 결과 / 신청 준비 / 서류함 / 설문 기록 / 내 정보(별명 등 수정)
type Tab = 'sum' | 'result' | 'prep' | 'docs' | 'history' | 'info'
type Kind = 'simple' | 'deep'
interface Row { id: string; survey_type: 'simple' | 'deep'; created_at: string }

const ST: Record<Status, { t: string; g: string }> = { ok: { t: '신청할 수 있어요', g: '✓' }, maybe: { t: '확인해 보면 좋아요', g: '△' }, no: { t: '지금은 어려워요', g: '✕' } }
const opts = (id: string) => QUESTIONS.find((q) => q.id === id)?.opts ?? []
const short = (t: string) => t.replace(/ \(.*\)$/, '')

const SURVEY_INFO: Record<Kind, { name: string; min: string; n: number; line: string }> = {
  simple: { name: '맛보기 설문', min: '약 2분', n: 12, line: '핵심만 물어봐서 어떤 지원을 받을 수 있는지 빠르게 알려 드려요.' },
  deep: { name: '심화 설문', min: '약 5분', n: 24, line: '소득·자산 등을 더 자세히 물어 결과가 정확해지고, 제도별 준비 서류도 알려 드려요.' },
}

/** 설문 시작 전 확인 창 (마이페이지의 모든 설문 버튼이 이 창을 거친다) */
function StartConfirm({ kind, hasResult, onYes, onNo }: { kind: Kind; hasResult: boolean; onYes: () => void; onNo: () => void }) {
  const i = SURVEY_INFO[kind]
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onNo()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onNo])
  return (
    <div className="mp-confirm" role="presentation" onClick={onNo}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="mp-cf-t" aria-describedby="mp-cf-d" onClick={(e) => e.stopPropagation()}>
        <h3 id="mp-cf-t">{i.name}를 시작하시겠습니까?</h3>
        <p id="mp-cf-d">{i.line}</p>
        <ul>
          <li>문항 {i.n}개 안팎, {i.min} 걸려요.</li>
          <li>이름·전화번호 없이 구간 값으로만 저장돼요.</li>
          {hasResult && <li>이 기기에 저장된 지난 결과는 새 결과로 바뀔 수 있어요.</li>}
        </ul>
        <div className="mp-row"><Btn variant="line" onClick={onNo}>아니요</Btn><Btn onClick={onYes}>시작하기</Btn></div>
      </div>
    </div>
  )
}

export function MyPage() {
  const { user, answers, hasSaved, logout, closeModal, openModal, openDeep, clearSaved, updateProfile } = useStore()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('sum')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState('')
  const [form, setForm] = useState<Profile>(user?.profile ?? EMPTY_PROFILE)
  const [saved, setSaved] = useState<'' | 'ok' | 'fail'>('')
  const [ask, setAsk] = useState<Kind | null>(null)
  const [del, setDel] = useState<{ open: boolean; text: string; busy: boolean; err: string }>({ open: false, text: '', busy: false, err: '' })

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
  if (!hasSaved) todo.push({ t: '맛보기 설문으로 받을 수 있는 지원 확인하기', act: () => setAsk('simple') })
  else if (!deepDone) todo.push({ t: '심화 설문으로 결과를 더 정확하게 만들기', act: () => setAsk('deep') })
  todo.push({ t: '신청 준비 확인하고 서류 챙기기', act: () => setTab('prep') })
  if (hasSaved) todo.push({ t: '결과 자세히 보고 신청 순서 확인하기', act: () => { closeModal(); nav('/result') } })

  const begin = () => {
    const k = ask
    setAsk(null)
    if (k === 'simple') openModal('diagnose')
    else if (k === 'deep') { closeModal(); openDeep() }
  }
  const deleteAccount = async () => {
    if (!supabase || del.text.trim() !== '삭제' || del.busy) return
    setDel((d) => ({ ...d, busy: true, err: '' }))
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${token ?? ''}` } })
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) return setDel((d) => ({ ...d, busy: false, err: body.message ?? '삭제하지 못했어요. 잠시 후 다시 시도해 주세요.' }))
      logout(); closeModal(); nav('/')
    } catch { setDel((d) => ({ ...d, busy: false, err: '연결에 실패했어요. 잠시 후 다시 시도해 주세요.' })) }
  }
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
  const filled = [user.profile.nickname, user.profile.ageBand, user.profile.residence, user.profile.interests.length ? 'y' : ''].filter(Boolean).length
  const profilePct = Math.round((filled / 4) * 100)
  const lastAt = rows?.[0]?.created_at ? new Date(rows[0].created_at).toLocaleDateString('ko-KR') : null
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
          {profilePct < 100 && <div className="mp-meter" role="img" aria-label={`프로필 ${profilePct}% 완성`}><i style={{ width: `${profilePct}%` }} /></div>}
          <p className="mp-meta">{profilePct < 100 ? `프로필 ${profilePct}% 완성 · ` : ''}{lastAt ? `마지막 설문 ${lastAt}` : '아직 설문 기록이 없어요'}</p>
        </div>
        {user.isAdmin && <Link className="mp-admin" to="/admin" onClick={closeModal}>대시보드 →</Link>}
      </div>

      <ol className="mp-steps" aria-label="진행 단계">
        <li className={hasSaved ? 'done' : 'now'}><button type="button" onClick={() => (hasSaved ? setTab('result') : setAsk('simple'))}><i>{hasSaved ? '✓' : '1'}</i><span>맛보기 설문<small>{hasSaved ? '완료 · 결과 보기' : '약 2분'}</small></span></button></li>
        <li className={deepDone ? 'done' : hasSaved ? 'now' : ''}><button type="button" onClick={() => setAsk('deep')}><i>{deepDone ? '✓' : '2'}</i><span>심화 설문<small>{deepDone ? '완료 · 다시 하기' : '약 5분 · 더 정확'}</small></span></button></li>
        <li className={deepDone ? 'now' : ''}><button type="button" onClick={() => setTab('prep')}><i>3</i><span>신청 준비<small>서류 · 신청 링크</small></span></button></li>
      </ol>

      <div className="mp-tabs" role="tablist">
        {([['sum', '요약'], ['result', '내 결과'], ['prep', '신청 준비'], ['docs', '서류함'], ['history', '설문 기록'], ['info', '내 정보']] as [Tab, string][]).map(([k, t]) => (
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
                    <span><b>{policyById(v.id)?.name ?? v.id}</b><small>{ST[v.status].t}</small></span>
                  </li>
                ))}
              </ul>
              <div className="mp-row">
                <Btn onClick={() => { closeModal(); nav('/result') }}>결과 자세히 보기</Btn>
                {!deepDone && <Btn variant="line" onClick={() => setAsk('deep')}>심화 설문 하기</Btn>}
              </div>
            </>
          ) : (
            <>
              <p className="mp-big">아직 저장된 결과가 없어요</p>
              <p className="mp-sub">설문을 하면 이곳에서 다시 볼 수 있어요.</p>
              <div className="mp-row"><Btn onClick={() => setAsk('simple')}>맛보기 설문 시작</Btn><Btn variant="line" onClick={() => setAsk('deep')}>심화 설문 시작</Btn></div>
            </>
          )}
        </div>
      )}

      {tab === 'prep' && <PrepBoard uid={user.id} verdict={verdicts.map((v) => ({ id: v.id, status: v.status }))} interests={user.profile.interests} hasSaved={hasSaved} onDocs={() => setTab('docs')} onSurvey={() => setAsk('simple')} />}

      {tab === 'docs' && <DocBox uid={user.id} verdict={Object.fromEntries(verdicts.map((v) => [v.id, v.status]))} interests={user.profile.interests} />}

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
          <hr className="mp-hr" />
          <div className="mp-danger">
            <h3 className="mp-h">계정 삭제</h3>
            {user.isAdmin ? <p className="mp-sub">관리자 계정은 실수를 막으려고 여기서 삭제할 수 없어요.</p> : !del.open ? (
              <>
                <p className="mp-sub">계정과 별명·관심 지원이 지워지고 로그인할 수 없게 돼요. 지금까지 한 설문 응답은 이름·계정과의 연결이 끊긴 채 통계로만 남아요. 되돌릴 수 없어요.</p>
                <div className="mp-row"><Btn variant="line" onClick={() => setDel({ open: true, text: '', busy: false, err: '' })}>계정 삭제하기</Btn></div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="mp-del">정말 삭제하려면 아래에 <b>삭제</b> 라고 입력하세요</label>
                <input id="mp-del" value={del.text} autoComplete="off" onChange={(e) => setDel({ ...del, text: e.target.value })} />
                {del.err && <p className="login-msg" role="status">{del.err}</p>}
                <div className="mp-row">
                  <Btn variant="line" onClick={() => setDel({ open: false, text: '', busy: false, err: '' })}>취소</Btn>
                  <button type="button" className="mp-delete" disabled={del.text.trim() !== '삭제' || del.busy} onClick={() => void deleteAccount()}>{del.busy ? '삭제 중…' : '계정 영구 삭제'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mp-row mp-foot">
        <Btn variant="line" onClick={() => { logout(); closeModal(); nav('/') }}>로그아웃</Btn>
        <Btn onClick={closeModal}>닫기</Btn>
      </div>
      {ask && <StartConfirm kind={ask} hasResult={hasSaved} onYes={begin} onNo={() => setAsk(null)} />}
    </div>
  )
}
