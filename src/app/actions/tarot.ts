'use server'

import { createClient } from '@/lib/supabase/server'
import { callFortuneModel } from '@/lib/openrouter/client'
import { logAiCall } from '@/lib/openrouter/log'
import { consumeCredit } from '@/lib/billing/consume'
import { todayKst } from '@/lib/fortune/kst'
import { SYSTEM_PROMPT, buildTarotPrompt, buildTarotOneCardPrompt, type TarotPromptCard } from '@/lib/fortune/prompts'
import { POSITION_LABELS, SPREAD_POSITIONS, type DrawnCard } from '@/lib/tarot/types'
import type { Gender } from '@/lib/fortune/types'

export interface TarotInterpretation {
  headline: string
  interpretation: { past: string; present: string; future: string }
  summary: string
}

/** 로그인된 본인 프로필로 3장 스프레드 해석 (DB 저장 안 함) */
export async function getTarotReading(draws: DrawnCard[]): Promise<TarotInterpretation> {
  if (draws.length !== 3) throw new Error('INVALID_DRAW')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profileRow) throw new Error('NO_PROFILE')
  const profile = profileRow as { name: string; birthdate: string; gender: Gender }

  const today = todayKst()
  const cards: TarotPromptCard[] = draws.map((d, i) => ({
    position: POSITION_LABELS[SPREAD_POSITIONS[i]] as '과거' | '현재' | '미래',
    name_kr: d.card.name_kr,
    name_en: d.card.name_en,
    orientation: d.orientation === 'upright' ? '정방향' : '역방향',
    baseMeaning: d.orientation === 'upright' ? d.card.upright : d.card.reversed,
  }))

  await consumeCredit({ supabase, userId: user.id, reason: 'consume_tarot', relatedKind: 'tarot_three' })

  const result = await callFortuneModel<TarotInterpretation>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildTarotPrompt({
      name: profile.name,
      birthdate: profile.birthdate,
      gender: profile.gender,
      today,
      cards,
    }),
    expectJson: true,
    maxTokens: 1200,
    temperature: 0.7,
    onUsage: ({ model, usage }) => logAiCall({ supabase, userId: user.id, feature: 'tarot_three', model, usage }),
  })

  return result
}

export interface TarotOneCardInterpretation {
  headline: string
  interpretation: string
  advice: string
}

/** 1장 데일리 해석 (DB 저장 안 함, 매번 신선) */
export async function getTarotOneCardReading(draws: DrawnCard[]): Promise<TarotOneCardInterpretation> {
  if (draws.length !== 1) throw new Error('INVALID_DRAW')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profileRow) throw new Error('NO_PROFILE')
  const profile = profileRow as { name: string; birthdate: string; gender: Gender }

  const today = todayKst()
  const drawn = draws[0]
  const card: TarotPromptCard = {
    position: '오늘',
    name_kr: drawn.card.name_kr,
    name_en: drawn.card.name_en,
    orientation: drawn.orientation === 'upright' ? '정방향' : '역방향',
    baseMeaning: drawn.orientation === 'upright' ? drawn.card.upright : drawn.card.reversed,
  }

  await consumeCredit({ supabase, userId: user.id, reason: 'consume_tarot', relatedKind: 'tarot_one' })

  const result = await callFortuneModel<TarotOneCardInterpretation>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildTarotOneCardPrompt({
      name: profile.name,
      birthdate: profile.birthdate,
      gender: profile.gender,
      today,
      card,
    }),
    expectJson: true,
    maxTokens: 600,
    temperature: 0.7,
    onUsage: ({ model, usage }) => logAiCall({ supabase, userId: user.id, feature: 'tarot_one', model, usage }),
  })

  return result
}
