import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * service_role 키 기반 Supabase 클라이언트 — RLS 우회.
 * 절대 클라이언트 번들에 import 되면 안 됨. 'server-only'로 가드.
 *
 * 사용처: /admin 페이지처럼 cross-user 데이터를 조회해야 하는 server-only 코드.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing')
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** ADMIN_EMAILS env 파싱 (콤마 구분, trim) */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails().includes(email.toLowerCase())
}
