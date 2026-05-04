'use server'

import { createClient } from '@/lib/supabase/server'
import type { DailyContent, ZodiacContent } from '@/lib/fortune/types'

export interface HistoryEntry {
  date: string
  daily: DailyContent | null
  zodiac: ZodiacContent | null
}

const DEFAULT_DAYS_BACK = 30

/** 본인의 fortune_daily를 날짜 내림차순으로 그룹핑. 오늘 포함, 기본 30일치. */
export async function getMyHistory(daysBack: number = DEFAULT_DAYS_BACK): Promise<HistoryEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - daysBack)
  const sinceDate = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('fortune_daily')
    .select('date, fortune_type, content')
    .eq('user_id', user.id)
    .gte('date', sinceDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('[history] select error:', error)
    return []
  }
  if (!data) return []

  const byDate = new Map<string, HistoryEntry>()
  for (const row of data) {
    const key = row.date
    if (!byDate.has(key)) byDate.set(key, { date: key, daily: null, zodiac: null })
    const entry = byDate.get(key)!
    if (row.fortune_type === 'daily') entry.daily = row.content as unknown as DailyContent
    else if (row.fortune_type === 'zodiac') entry.zodiac = row.content as unknown as ZodiacContent
  }
  return Array.from(byDate.values())
}
