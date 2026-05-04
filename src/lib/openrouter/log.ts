import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { CallUsage } from './client'

export type AiCallFeature = 'daily' | 'zodiac' | 'lotto' | 'tarot_three' | 'tarot_one' | 'dream'
export type AiCallPersona = 'master' | 'fortune' | 'fairy'

interface LogParams {
  supabase: SupabaseClient<Database>
  userId: string
  feature: AiCallFeature
  persona?: AiCallPersona | null
  model: string
  usage: CallUsage
  success?: boolean
}

/**
 * AI 호출 로그를 ai_call_log에 insert. 실패는 console.error로만 surface — 호출자
 * 흐름을 막지 않음. RLS는 본인 row 한정 — service_role 없이 동작.
 */
export async function logAiCall(params: LogParams): Promise<void> {
  const { error } = await params.supabase.from('ai_call_log').insert({
    user_id: params.userId,
    feature: params.feature,
    persona: params.persona ?? null,
    model: params.model,
    prompt_tokens: params.usage.prompt_tokens ?? null,
    completion_tokens: params.usage.completion_tokens ?? null,
    total_tokens: params.usage.total_tokens ?? null,
    success: params.success ?? true,
  })
  if (error) console.error(`[ai_call_log/${params.feature}] insert error:`, error)
}
