'use server'

import { createClient } from '@/lib/supabase/server'
import { callFortuneModel } from '@/lib/openrouter/client'
import { todayKst, nextLottoDrawNumber } from '@/lib/fortune/kst'
import { zodiacAnimal, zodiacSign } from '@/lib/fortune/zodiac'
import { generateLottoNumbers } from '@/lib/fortune/lotto'
import {
  SYSTEM_PROMPT,
  buildDailyPrompt,
  buildZodiacPrompt,
  buildLottoCommentPrompt,
} from '@/lib/fortune/prompts'
import type { Json } from '@/lib/supabase/database.types'
import type {
  DailyContent,
  ZodiacContent,
  LottoResult,
  ProfileInput,
  ViewerProfile,
} from '@/lib/fortune/types'

async function requireProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) throw new Error('NO_PROFILE')
  return { supabase, user, profile: profile as { id: string; name: string; birthdate: string; gender: 'male'|'female'|'other' } }
}

export async function getDailyFortune(viewer?: ViewerProfile): Promise<DailyContent> {
  const { supabase, user, profile } = await requireProfile()
  const target: ProfileInput = viewer ?? { name: profile.name, birthdate: profile.birthdate, gender: profile.gender }
  const today = todayKst()

  if (!viewer) {
    const { data: cached } = await supabase
      .from('fortune_daily')
      .select('content')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('fortune_type', 'daily')
      .maybeSingle()
    if (cached) return cached.content as unknown as DailyContent
  }

  const result = await callFortuneModel<DailyContent>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildDailyPrompt({ ...target, today }),
    expectJson: true,
    maxTokens: 800,
    temperature: 0.7,
  })

  if (!viewer) {
    await supabase.from('fortune_daily').insert({
      user_id: user.id,
      date: today,
      fortune_type: 'daily',
      content: result as unknown as Json,
    })
  }

  return result
}
