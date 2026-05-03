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

export async function getZodiacFortune(viewer?: ViewerProfile): Promise<ZodiacContent> {
  const { supabase, user, profile } = await requireProfile()
  const target: ProfileInput = viewer ?? { name: profile.name, birthdate: profile.birthdate, gender: profile.gender }
  const today = todayKst()

  if (!viewer) {
    const { data: cached } = await supabase
      .from('fortune_daily')
      .select('content')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('fortune_type', 'zodiac')
      .maybeSingle()
    if (cached) return cached.content as unknown as ZodiacContent
  }

  const animal = zodiacAnimal(target.birthdate)
  const sign = zodiacSign(target.birthdate)

  const result = await callFortuneModel<ZodiacContent>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildZodiacPrompt({
      birthdate: target.birthdate,
      today,
      zodiacAnimal: animal,
      zodiacSign: sign,
    }),
    expectJson: true,
    maxTokens: 500,
    temperature: 0.7,
  })

  // 모델이 다른 동물/별자리를 반환할 수 있으니 서버 계산값으로 덮어쓰기
  const safe: ZodiacContent = { ...result, zodiac_animal: animal, zodiac_sign: sign }

  if (!viewer) {
    await supabase.from('fortune_daily').insert({
      user_id: user.id,
      date: today,
      fortune_type: 'zodiac',
      content: safe as unknown as Json,
    })
  }

  return safe
}

export async function getLottoRec(viewer?: ViewerProfile): Promise<LottoResult> {
  const { supabase, user, profile } = await requireProfile()
  const target: ProfileInput = viewer ?? { name: profile.name, birthdate: profile.birthdate, gender: profile.gender }
  const today = todayKst()
  const drawNumber = nextLottoDrawNumber()

  if (!viewer) {
    const { data: cached } = await supabase
      .from('lotto_recommendations')
      .select('numbers, comment, draw_number')
      .eq('user_id', user.id)
      .eq('draw_number', drawNumber)
      .maybeSingle()
    if (cached) return {
      draw_number: cached.draw_number,
      numbers: cached.numbers as number[],
      comment: cached.comment,
    }
  }

  // viewer 모드면 anonymous seed로
  const seedKey = viewer ? `viewer:${target.name}:${target.birthdate}:${target.gender}` : user.id
  const numbers = generateLottoNumbers(seedKey, drawNumber)

  const { comment } = await callFortuneModel<{ comment: string }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildLottoCommentPrompt({
      name: target.name,
      drawNumber,
      numbers,
      today,
    }),
    expectJson: true,
    maxTokens: 200,
    temperature: 0.5,
  })

  if (!viewer) {
    await supabase.from('lotto_recommendations').insert({
      user_id: user.id,
      draw_number: drawNumber,
      numbers,
      comment,
    })
  }

  return { draw_number: drawNumber, numbers, comment }
}
