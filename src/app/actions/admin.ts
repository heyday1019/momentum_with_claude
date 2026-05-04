'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminEmail } from '@/lib/supabase/admin'

export interface AdminStats {
  totalUsers: number
  totalCalls: number
  callsByFeature: Array<{ feature: string; count: number }>
  callsByModel: Array<{ model: string; count: number; tokens: number; estimatedUsd: number }>
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
  /** 모든 모델 USD 추정 합계 */
  totalEstimatedUsd: number
  /** 최근 14일 일별 호출 카운트 (오래된 → 최신) */
  daily: Array<{ date: string; count: number; tokens: number }>
  /** 호출 수 TOP 10 사용자 */
  topUsers: Array<{ user_id: string; email: string | null; name: string | null; calls: number; tokens: number }>
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

/**
 * 모델별 USD per 1K tokens 추정 (output 토큰 가정 — input/output 비분리). OpenRouter
 * 공식 단가에 가까운 round number. 실제 비용과 다를 수 있어 "추정"으로만 표기.
 */
const MODEL_USD_PER_1K_TOKENS: Record<string, number> = {
  'anthropic/claude-haiku-4-5': 0.001,
  'openai/gpt-4o-mini': 0.0006,
  'google/gemini-2.5-flash': 0.0003,
}

function estimateUsd(model: string, tokens: number): number {
  const rate = MODEL_USD_PER_1K_TOKENS[model] ?? 0.001
  return (tokens / 1000) * rate
}

/** 관리자 통계 조회. 비관리자는 거부. */
export async function getAdminStats(): Promise<AdminStatsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) return { ok: false, error: '권한이 없어요' }

  const admin = createAdminClient()

  const since14 = new Date()
  since14.setUTCDate(since14.getUTCDate() - 13)
  const sinceIso = since14.toISOString()

  const [profilesRes, callsRes, personaRes, recent14Res, profilesByIdRes] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('ai_call_log').select('id, created_at, user_id, feature, persona, model, total_tokens').order('created_at', { ascending: false }).limit(2000),
    admin.from('dream_ai_usage').select('persona'),
    admin.from('ai_call_log').select('user_id, total_tokens, created_at').gte('created_at', sinceIso),
    admin.from('profiles').select('id, name'),
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

  // model별 카운트 + 토큰 + USD 추정
  const modelMap = new Map<string, { count: number; tokens: number }>()
  for (const c of calls) {
    const cur = modelMap.get(c.model) ?? { count: 0, tokens: 0 }
    cur.count += 1
    cur.tokens += c.total_tokens ?? 0
    modelMap.set(c.model, cur)
  }
  const callsByModel = [...modelMap.entries()]
    .map(([model, v]) => ({ model, ...v, estimatedUsd: estimateUsd(model, v.tokens) }))
    .sort((a, b) => b.tokens - a.tokens)
  const totalEstimatedUsd = callsByModel.reduce((s, m) => s + m.estimatedUsd, 0)

  // persona 선호도 (dream_ai_usage 기준 — 모든 사용자)
  const personaMap = new Map<string, number>()
  for (const r of personaRes.data ?? []) {
    personaMap.set(r.persona, (personaMap.get(r.persona) ?? 0) + 1)
  }
  const personaPreference = [...personaMap.entries()]
    .map(([persona, count]) => ({ persona, count }))
    .sort((a, b) => b.count - a.count)

  // 최근 14일 일별 추이 (KST date)
  const dailyMap = new Map<string, { count: number; tokens: number }>()
  // 일자 슬롯 미리 생성 (호출 0건인 날도 막대로 표시)
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, { count: 0, tokens: 0 })
  }
  for (const c of recent14Res.data ?? []) {
    const key = c.created_at.slice(0, 10) // ISO date prefix (UTC). 단순화 — KST 변환은 후순위
    if (!dailyMap.has(key)) continue
    const cur = dailyMap.get(key)!
    cur.count += 1
    cur.tokens += c.total_tokens ?? 0
  }
  const daily = [...dailyMap.entries()].map(([date, v]) => ({ date, ...v }))

  // top users — 전체 calls 누적 카운트
  const userMap = new Map<string, { calls: number; tokens: number }>()
  for (const c of calls) {
    const cur = userMap.get(c.user_id) ?? { calls: 0, tokens: 0 }
    cur.calls += 1
    cur.tokens += c.total_tokens ?? 0
    userMap.set(c.user_id, cur)
  }
  const profileById = new Map(
    (profilesByIdRes.data ?? []).map(p => [p.id as string, p.name as string])
  )
  const topUsers = [...userMap.entries()]
    .map(([user_id, v]) => ({
      user_id,
      email: null,
      name: profileById.get(user_id) ?? null,
      ...v,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10)

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
      totalEstimatedUsd,
      daily,
      topUsers,
    },
  }
}
