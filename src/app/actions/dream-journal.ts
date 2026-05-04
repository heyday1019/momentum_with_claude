'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DreamPersonaKey } from '@/lib/fortune/dream-personas'

export interface DreamJournalSymbol {
  symbol: string
  meaning: string
}

export interface DreamJournalEntry {
  id: number
  persona: DreamPersonaKey
  dream_content: string
  summary: string
  interpretation: string
  symbols: DreamJournalSymbol[]
  advice: string
  created_at: string
}

const VALID_PERSONAS: readonly DreamPersonaKey[] = ['master', 'fortune', 'fairy']

export async function getMyDreamJournal(): Promise<DreamJournalEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('dream_journal')
    .select('id, persona, dream_content, summary, interpretation, symbols, advice, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[dream-journal] select error:', error)
    return []
  }
  if (!data) return []

  return data.flatMap(row => {
    if (!VALID_PERSONAS.includes(row.persona as DreamPersonaKey)) return []
    const symbols = Array.isArray(row.symbols)
      ? (row.symbols as unknown as DreamJournalSymbol[])
      : []
    return [{
      id: row.id,
      persona: row.persona as DreamPersonaKey,
      dream_content: row.dream_content,
      summary: row.summary,
      interpretation: row.interpretation,
      symbols,
      advice: row.advice,
      created_at: row.created_at,
    }]
  })
}

export async function deleteDreamEntry(id: number): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: '잘못된 항목이에요' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요' }

  const { error } = await supabase
    .from('dream_journal')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) {
    console.error('[dream-journal] delete error:', error)
    return { ok: false, error: '삭제 중 문제가 생겼어요' }
  }

  revalidatePath('/dream/journal')
  return { ok: true }
}
