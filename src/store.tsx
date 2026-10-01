import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_ANSWERS } from './lib/eligibility'
import type { Answers } from './lib/eligibility'

// 데모용 상태. 서버 저장 없음 — 브라우저 localStorage에만 보관한다. (PRD: 익명·개인정보 미저장)
interface User { name: string; via: string }
interface Store {
  user: User | null
  login: (u: User) => void
  logout: () => void
  answers: Answers
  setAnswers: (a: Answers) => void
  hasSaved: boolean
  loginOpen: boolean
  setLoginOpen: (b: boolean) => void
}

const Ctx = createContext<Store | null>(null)
const K = { user: 'cjsj.user', answers: 'cjsj.answers' }

function read<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : null
  } catch {
    return null
  }
}
function write(key: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* 저장 불가 환경에서도 동작해야 한다 */
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => read<User>(K.user))
  const saved = useMemo(() => read<Answers>(K.answers), [])
  const [answers, setAnswersState] = useState<Answers>(saved ?? DEFAULT_ANSWERS)
  const [hasSaved, setHasSaved] = useState(!!saved)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => write(K.user, user), [user])
  const setAnswers = useCallback((a: Answers) => {
    setAnswersState(a)
    setHasSaved(true)
    write(K.answers, a)
  }, [])

  const value: Store = {
    user,
    login: (u) => setUser(u),
    logout: () => setUser(null),
    answers,
    setAnswers,
    hasSaved,
    loginOpen,
    setLoginOpen,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider 필요')
  return v
}
