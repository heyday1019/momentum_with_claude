'use server'

import { createClient } from '@/lib/supabase/server'
import { callFortuneModel } from '@/lib/openrouter/client'
import { logAiCall } from '@/lib/openrouter/log'
import { todayKst } from '@/lib/fortune/kst'
import { DREAM_PERSONA_PROMPTS, buildDreamPrompt } from '@/lib/fortune/prompts'
import { DREAM_PERSONAS, type DreamPersonaKey } from '@/lib/fortune/dream-personas'
import type { Gender } from '@/lib/fortune/types'
import type { Json } from '@/lib/supabase/database.types'

export interface DreamSymbol {
  symbol: string
  meaning: string
}

export interface DreamInterpretation {
  summary: string
  interpretation: string
  symbols: DreamSymbol[]
  advice: string
}

export type DreamActionResult =
  | { ok: true; persona: DreamPersonaKey; data: DreamInterpretation }
  | { ok: false; error: string }

const MIN_LEN = 10
const MAX_LEN = 1000
const VALID_PERSONAS: readonly DreamPersonaKey[] = ['master', 'fortune', 'fairy']

export async function getDreamInterpretation(input: {
  content: string
  persona: DreamPersonaKey
}): Promise<DreamActionResult> {
  const content = input.content.trim()
  if (content.length < MIN_LEN) return { ok: false, error: `꿈 내용을 ${MIN_LEN}자 이상 적어주세요` }
  if (content.length > MAX_LEN) return { ok: false, error: `${MAX_LEN}자 이하로 적어주세요` }
  if (!VALID_PERSONAS.includes(input.persona)) return { ok: false, error: '잘못된 캐릭터 선택이에요' }

  const persona = input.persona
  const meta = DREAM_PERSONAS.find(p => p.key === persona)!

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요' }

  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profileRow) return { ok: false, error: '프로필 정보를 찾을 수 없어요' }
  const profile = profileRow as { name: string; birthdate: string; gender: Gender }

  // 사용 통계 — 응답 성공 여부와 무관하게 클릭 시점에 누적 (실패도 사용자 의도)
  // 동시에 진행 (insert는 fire-and-forget으로 두지 않고 결과 확인)
  const usagePromise = supabase.from('dream_ai_usage').insert({
    user_id: user.id,
    persona,
    model: meta.model,
  })

  try {
    const result = await callFortuneModel<DreamInterpretation>({
      systemPrompt: DREAM_PERSONA_PROMPTS[persona],
      userPrompt: buildDreamPrompt({
        name: profile.name,
        birthdate: profile.birthdate,
        gender: profile.gender,
        today: todayKst(),
        dreamContent: content,
      }),
      expectJson: true,
      maxTokens: 1200,
      temperature: 0.75,
      model: meta.model,
      onUsage: ({ model, usage }) =>
        logAiCall({ supabase, userId: user.id, feature: 'dream', persona, model, usage }),
    })

    const { error: usageErr } = await usagePromise
    if (usageErr) console.error('[dream/usage] insert error:', usageErr)

    if (!Array.isArray(result.symbols) || result.symbols.length === 0) {
      return { ok: false, error: '해석 결과 형식이 올바르지 않아요. 다시 시도해주세요.' }
    }

    // 일기에 자동 보관 (조회/삭제는 사용자가 /dream/journal에서)
    const { error: journalErr } = await supabase.from('dream_journal').insert({
      user_id: user.id,
      persona,
      model: meta.model,
      dream_content: content,
      summary: result.summary,
      interpretation: result.interpretation,
      symbols: result.symbols as unknown as Json,
      advice: result.advice,
    })
    if (journalErr) console.error('[dream/journal] insert error:', journalErr)

    return { ok: true, persona, data: result }
  } catch (e) {
    console.error(`[dream/${persona}] AI call failed:`, e)
    // 통계는 그대로 commit (사용자가 시도했음을 기록)
    await usagePromise
    return { ok: false, error: '해석 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.' }
  }
}
