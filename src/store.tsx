import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_ANSWERS } from './lib/eligibility'
import type { Answers } from './lib/eligibility'
import { cleanupLegacy, initialAnswers, onLogin, onLogout, saveIfMember, savedKey } from './lib/history'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { KV } from './lib/history'

// 로그인은 Supabase Auth(이메일+비밀번호). 진단 결과 원본은 브라우저 localStorage 에 두고,
// 통계용 설문 응답만 비식별화(가명 ID·구간 값)해서 Supabase 에 저장한다. (lib/responses.ts)
// · 진단 결과는 "로그인한 회원"에게만 저장한다. 비회원의 결과는 이 화면(메모리)에만 있고
//   새로고침·로그아웃하면 사라진다.
export type Modal = 'survey' | 'diagnose' | 'diagnoseDeep' | 'feedback' | 'mypage' | null
export type LoginReason = 'history' | 'deep' | null
/** 내 정보(선택 입력). Supabase Auth 의 user_metadata 에 저장하는 본인 전용 값이고, 설문 응답과는 연결하지 않는다 */
export interface Profile { nickname: string; ageBand: string; residence: string; interests: string[] }
export const EMPTY_PROFILE: Profile = { nickname: '', ageBand: '', residence: '', interests: [] }
export interface User { id: string; email: string; name: string; profile: Profile; via: string; isAdmin: boolean; respondentId: string | null }
interface Store {
  user: User | null
  logout: () => void
  /** 로그인 상태가 확인되기 전(새로고침 직후)에는 false */
  authReady: boolean
  /** 이 기기에 저장된 내 결과 지우기 */
  clearSaved: () => void
  /** 별명 등 내 정보 저장. 실패하면 false */
  updateProfile: (p: Profile) => Promise<boolean>
  answers: Answers
  setAnswers: (a: Answers) => void
  hasSaved: boolean
  /** 결과가 계정에 저장되는지(로그인 상태) */
  persisted: boolean
  popupOpen: boolean
  loginOpen: boolean
  loginReason: LoginReason
  setLoginOpen: (b: boolean) => void
  openLogin: (reason?: LoginReason) => void
  modal: Modal
  openModal: (m: Exclude<Modal, null>) => void
  /** 심화 설문: 로그인했으면 바로 열고, 아니면 로그인 후 이어서 연다 */
  openDeep: () => void
  closeModal: () => void
}

const Ctx = createContext<Store | null>(null)

// localStorage 를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 동작해야 한다
const kv: KV = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* noop */ } },
  remove: (k) => { try { localStorage.removeItem(k) } catch { /* noop */ } },
}

function readProfile(m: Record<string, unknown> | undefined): Profile {
  const p = (m?.profile ?? {}) as Partial<Profile>
  return {
    nickname: typeof p.nickname === 'string' ? p.nickname.slice(0, 12) : '',
    ageBand: typeof p.ageBand === 'string' ? p.ageBand : '',
    residence: typeof p.residence === 'string' ? p.residence : '',
    interests: Array.isArray(p.interests) ? p.interests.filter((x): x is string => typeof x === 'string').slice(0, 8) : [],
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  // 로그인 상태일 때만 저장된 결과를 불러온다 (로그인은 비동기라 로그인 후 아래 effect 에서 채운다)
  const [answers, setAnswersState] = useState<Answers | null>(() => initialAnswers(null, kv))
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<LoginReason>(null)
  const [modal, setModal] = useState<Modal>(null)
  const pendingDeep = useRef(false)
  const answersRef = useRef(answers)
  answersRef.current = answers

  useEffect(() => { cleanupLegacy(kv) }, [])
  // 팝업이 열려 있는 동안 뒤의 영상·나비를 멈추기 위한 표시 (블러 아래에서 재생 중인 영상은 매우 무겁다)
  useEffect(() => {
    document.body.classList.toggle('has-popup', loginOpen || modal !== null)
    return () => document.body.classList.remove('has-popup')
  }, [loginOpen, modal])

  // Supabase 로그인 상태를 따라간다. 관리자 여부·가명 ID 는 profiles(RLS)에서 읽는다
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    let seq = 0 // 늦게 끝난 이전 요청이 최신 로그인 상태를 덮어쓰지 않게 한다
    const apply = async (session: Session | null) => {
      const mine = ++seq
      if (!session) { setUser(null); setAuthReady(true); return }
      const { data, error } = await sb.from('profiles').select('role, respondent_id').eq('id', session.user.id).maybeSingle()
      if (mine !== seq) return
      const email = session.user.email ?? ''
      const profile = readProfile(session.user.user_metadata)
      setUser((prev) => ({
        id: session.user.id, email, profile, name: profile.nickname || email.split('@')[0] || '청년', via: 'email',
        // 프로필을 못 읽었으면(일시 오류) 이전에 알던 값을 유지한다
        isAdmin: session.user.app_metadata?.role === 'admin' || (error ? (prev?.id === session.user.id ? prev.isAdmin : false) : data?.role === 'admin'),
        respondentId: error ? (prev?.id === session.user.id ? prev.respondentId : null) : data?.respondent_id ?? null,
      }))
      setAuthReady(true)
    }
    void sb.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { setTimeout(() => void apply(s), 0) })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 로그인/로그아웃 전환 처리
  const prevId = useRef<string | null>(null)
  useEffect(() => {
    const id = user?.id ?? null
    if (id === prevId.current) return
    const was = prevId.current
    prevId.current = id
    if (id) {
      // 방금 비회원으로 진단한 결과가 있으면 내 계정에 저장하고, 없으면 예전에 저장한 결과를 불러온다
      setAnswersState(onLogin(id, was ? null : answersRef.current, kv)) // 계정이 바로 바뀐 경우 이전 계정의 결과는 넘기지 않는다
      setLoginOpen(false)
      setLoginReason(null)
      if (pendingDeep.current) { pendingDeep.current = false; setModal('diagnoseDeep') }
    } else if (was) setAnswersState(onLogout())
  }, [user])

  const setAnswers = useCallback((a: Answers) => {
    setAnswersState(a)
    saveIfMember(user?.id ?? null, a, kv) // 비회원은 저장하지 않는다
  }, [user])

  const clearSaved = useCallback(() => {
    if (user) kv.remove(savedKey(user.id))
    setAnswersState(null)
  }, [user])

  const updateProfile = useCallback(async (p: Profile) => {
    if (!supabase) return false
    const clean: Profile = { ...p, nickname: p.nickname.trim().slice(0, 12) }
    const { error } = await supabase.auth.updateUser({ data: { profile: clean } })
    if (error) return false
    setUser((u) => (u ? { ...u, profile: clean, name: clean.nickname || u.email.split('@')[0] || '청년' } : u))
    return true
  }, [])

  const logout = useCallback(() => {
    void supabase?.auth.signOut()
    setUser(null) // 화면에서 결과는 위 effect 가 치운다(이 기기에 저장된 결과는 남아 있다)
  }, [])

  const openLogin = useCallback((reason: LoginReason = null) => { setLoginReason(reason); setLoginOpen(true) }, [])
  const setLoginOpenFn = useCallback((b: boolean) => { setLoginOpen(b); if (!b) { setLoginReason(null); pendingDeep.current = false } }, [])
  const openModal = useCallback((m: Exclude<Modal, null>) => setModal(m), [])
  const closeModal = useCallback(() => setModal(null), [])
  const openDeep = useCallback(() => {
    if (user) setModal('diagnoseDeep')
    else { pendingDeep.current = true; setLoginReason('deep'); setLoginOpen(true) }
  }, [user])
  // 값이 바뀔 때만 새 객체를 만들어 불필요한 전체 리렌더를 막는다
  const value: Store = useMemo(() => ({
    user,
    logout,
    authReady,
    clearSaved,
    updateProfile,
    answers: answers ?? DEFAULT_ANSWERS,
    setAnswers,
    hasSaved: answers !== null,
    persisted: user !== null,
    popupOpen: loginOpen || modal !== null,
    loginOpen,
    loginReason,
    setLoginOpen: setLoginOpenFn,
    openLogin,
    modal,
    openModal,
    openDeep,
    closeModal,
  }), [user, logout, authReady, clearSaved, updateProfile, answers, setAnswers, loginOpen, loginReason, modal, openLogin, setLoginOpenFn, openModal, openDeep, closeModal])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider 필요')
  return v
}
