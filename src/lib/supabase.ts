import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// 프런트에는 공개용(publishable) 키만 넣는다. secret 키는 api/ 서버에서만 쓴다.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** 환경변수가 없으면 null — 이때 사이트는 로그인·저장 없이(체험 모드로) 동작한다 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
