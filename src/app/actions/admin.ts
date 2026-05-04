'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminEmail } from '@/lib/supabase/admin'

export interface AdminStats {
  totalUsers: number
  totalCalls: number
  callsByFeature: Array<{ feature: string; count: number }>
  callsByModel: Array<{ model: string; count: number; tokens: number }>
  personaPreference: Array<{ persona: string; count: number }>
  recentCalls: Array<{
    id: number
    created_at: string
    user_id: string
    feature: string
    persona: string | null
    model: string
    total_tokens: number | null
  }>
  totalTokens: number
}

export type AdminStatsResult =
  | { ok: true; data: AdminStats }
  | { ok: false; error: string }

/** 현재 로그인 사용자가 ADMIN_EMAILS에 포함되는지. */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminEmail(user?.email)
}

/** 관리자 통계 조회. 비관리자는 거부. */
export async function getAdminStats(): Promise<AdminStatsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) return { ok: false, error: '권한이 없어요' }

  const admin = createAdminClient()

  const [profilesRes, callsRes, personaRes] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('ai_call_log').select('id, created_at, user_id, feature, persona, model, total_tokens').order('created_at', { ascending: false }).limit(500),
    admin.from('dream_ai_usage').select('persona'),
  ])

  if (callsRes.error) return { ok: false, error: callsRes.error.message }

  const calls = callsRes.data ?? []
  const totalUsers = profilesRes.count ?? 0
  const totalCalls = calls.length
  const totalTokens = calls.reduce((s, r) => s + (r.total_tokens ?? 0), 0)

  // feature별 카운트
  const featureMap = new Map<string, number>()
  for (const c of calls) featureMap.set(c.feature, (featureMap.get(c.feature) ?? 0) + 1)
  const callsByFeature = [...featureMap.entries()]
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)

  // model별 카운트 + 토큰 합계
  const modelMap = new Map<string, { count: number; tokens: number }>()
  for (const c of calls) {
    const cur = modelMap.get(c.model) ?? { count: 0, tokens: 0 }
    cur.count += 1
    cur.tokens += c.total_tokens ?? 0
    modelMap.set(c.model, cur)
  }
  const callsByModel = [...modelMap.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.tokens - a.tokens)

  // persona 선호도 (dream_ai_usage 기준 — 모든 사용자)
  const personaMap = new Map<string, number>()
  for (const r of personaRes.data ?? []) {
    personaMap.set(r.persona, (personaMap.get(r.persona) ?? 0) + 1)
  }
  const personaPreference = [...personaMap.entries()]
    .map(([persona, count]) => ({ persona, count }))
    .sort((a, b) => b.count - a.count)

  return {
    ok: true,
    data: {
      totalUsers,
      totalCalls,
      callsByFeature,
      callsByModel,
      personaPreference,
      recentCalls: calls.slice(0, 20),
      totalTokens,
    },
  }
}
