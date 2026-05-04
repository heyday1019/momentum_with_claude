'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Json } from '@/lib/supabase/database.types'

export interface ExportPayload {
  exported_at: string
  user_id: string
  profile: {
    name: string
    birthdate: string
    gender: string
    created_at: string
    updated_at: string
  } | null
  fortune_daily: Array<{
    date: string
    fortune_type: string
    content: Json
    created_at: string
  }>
  lotto_recommendations: Array<{
    draw_number: number
    numbers: number[]
    comment: string
    created_at: string
  }>
  dream_journal: Array<{
    persona: string
    model: string
    dream_content: string
    summary: string
    interpretation: string
    symbols: Json
    advice: string
    created_at: string
  }>
  dream_ai_usage: Array<{
    persona: string
    model: string
    created_at: string
  }>
}

export type ExportResult =
  | { ok: true; data: ExportPayload }
  | { ok: false; error: string }

/** 본인 데이터 전체를 한 번의 호출로 가져옴. RLS로 본인 row만 통과. */
export async function exportMyData(): Promise<ExportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요' }

  const [profileRes, dailyRes, lottoRes, journalRes, usageRes] = await Promise.all([
    supabase.from('profiles').select('name, birthdate, gender, created_at, updated_at').eq('id', user.id).maybeSingle(),
    supabase.from('fortune_daily').select('date, fortune_type, content, created_at').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('lotto_recommendations').select('draw_number, numbers, comment, created_at').eq('user_id', user.id).order('draw_number', { ascending: false }),
    supabase.from('dream_journal').select('persona, model, dream_content, summary, interpretation, symbols, advice, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('dream_ai_usage').select('persona, model, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return {
    ok: true,
    data: {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      profile: profileRes.data,
      fortune_daily: dailyRes.data ?? [],
      lotto_recommendations: lottoRes.data ?? [],
      dream_journal: journalRes.data ?? [],
      dream_ai_usage: usageRes.data ?? [],
    },
  }
}

/**
 * 본인의 모든 도메인 데이터를 삭제. profiles row 삭제 시 FK ON DELETE CASCADE로
 * fortune_daily / lotto_recommendations / dream_journal / dream_ai_usage 모두 함께 사라짐.
 *
 * 주의: auth.users 자체는 anon key로 삭제 불가 (service role 필요). 따라서
 * 사용자가 다시 로그인하면 빈 상태로 시작하게 됨. 사용자에게 명확히 고지 필요.
 */
export async function deleteMyData(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요' }

  const { error } = await supabase.from('profiles').delete().eq('id', user.id)
  if (error) {
    console.error('[account/delete] profile delete error:', error)
    return { ok: false, error: '삭제 중 문제가 생겼어요' }
  }

  await supabase.auth.signOut()
  redirect('/login')
}
