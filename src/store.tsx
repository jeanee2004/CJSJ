import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_ANSWERS } from './lib/eligibility'
import type { Answers } from './lib/eligibility'
import { cleanupLegacy, initialAnswers, onLogin, onLogout, saveIfMember } from './lib/history'
import type { KV } from './lib/history'

// 데모용 상태. 서버 저장 없음 — 브라우저 localStorage에만 보관한다. (PRD: 익명·개인정보 미저장)
// · 진단 결과는 "로그인한 회원"에게만 저장한다. 비회원의 결과는 이 화면(메모리)에만 있고
//   새로고침·로그아웃하면 사라진다.
export type Modal = 'diagnose' | 'feedback' | null
export type LoginReason = 'history' | null
interface User { name: string; via: string }
interface Store {
  user: User | null
  login: (u: User) => void
  logout: () => void
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
  closeModal: () => void
}

const Ctx = createContext<Store | null>(null)
const USER_KEY = 'cjsj.user'

// localStorage 를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 동작해야 한다
const kv: KV = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch { /* noop */ } },
  remove: (k) => { try { localStorage.removeItem(k) } catch { /* noop */ } },
}

function read<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => read<User>(USER_KEY))
  // 로그인 상태일 때만 저장된 결과를 불러온다
  const [answers, setAnswersState] = useState<Answers | null>(() => initialAnswers(read<User>(USER_KEY)?.name ?? null, kv))
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginReason, setLoginReason] = useState<LoginReason>(null)
  const [modal, setModal] = useState<Modal>(null)
  const answersRef = useRef(answers)
  answersRef.current = answers

  useEffect(() => { cleanupLegacy(kv) }, [])
  // 팝업이 열려 있는 동안 뒤의 영상·나비를 멈추기 위한 표시 (블러 아래에서 재생 중인 영상은 매우 무겁다)
  useEffect(() => {
    document.body.classList.toggle('has-popup', loginOpen || modal !== null)
    return () => document.body.classList.remove('has-popup')
  }, [loginOpen, modal])
  useEffect(() => { if (user) kv.set(USER_KEY, JSON.stringify(user)); else kv.remove(USER_KEY) }, [user])

  const setAnswers = useCallback((a: Answers) => {
    setAnswersState(a)
    saveIfMember(user?.name ?? null, a, kv) // 비회원은 저장하지 않는다
  }, [user])

  const login = useCallback((u: User) => {
    setUser(u)
    // 방금 비회원으로 진단한 결과가 있으면 내 계정에 저장하고, 없으면 예전에 저장한 결과를 불러온다
    setAnswersState(onLogin(u.name, answersRef.current, kv))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setAnswersState(onLogout()) // 화면에서 결과를 치운다(계정에 저장된 결과는 남아 있다)
  }, [])

  const value: Store = {
    user,
    login,
    logout,
    answers: answers ?? DEFAULT_ANSWERS,
    setAnswers,
    hasSaved: answers !== null,
    persisted: user !== null,
    popupOpen: loginOpen || modal !== null,
    loginOpen,
    loginReason,
    setLoginOpen: (b) => { setLoginOpen(b); if (!b) setLoginReason(null) },
    openLogin: (reason = null) => { setLoginReason(reason); setLoginOpen(true) },
    modal,
    openModal: (m) => setModal(m),
    closeModal: () => setModal(null),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider 필요')
  return v
}
