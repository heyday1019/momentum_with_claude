'use server'

import { createClient } from '@/lib/supabase/server'
import { todayKst } from '@/lib/fortune/kst'
import type { Json } from '@/lib/supabase/database.types'
import type { DreamPersonaKey } from '@/lib/fortune/dream-personas'

export interface KeywordStat {
  keyword: string
  count: number
}

export type DreamPersonaUsage = Record<DreamPersonaKey, number>

export interface InsightsData {
  /** 일일 운세 본 고유 날짜 수 */
  totalDays: number
  /** 오늘 포함 연속 일수 */
  currentStreak: number
  /** 가장 오래된 fortune_daily 날짜 (YYYY-MM-DD) */
  firstSeenDate: string | null
  /** 상위 키워드 (daily + zodiac 합산) */
  topKeywords: KeywordStat[]
  /** [월, 화, 수, 목, 금, 토, 일] 7개 카운트 (일일 기준 고유 날짜) */
  byWeekday: number[]
  /** 꿈 해몽 AI 페르소나별 사용 횟수 */
  dreamUsage: DreamPersonaUsage
}

const EMPTY: InsightsData = {
  totalDays: 0,
  currentStreak: 0,
  firstSeenDate: null,
  topKeywords: [],
  byWeekday: [0, 0, 0, 0, 0, 0, 0],
  dreamUsage: { master: 0, fortune: 0, fairy: 0 },
}

export async function getMyInsights(): Promise<InsightsData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return EMPTY

  const { data, error } = await supabase
    .from('fortune_daily')
    .select('date, fortune_type, content')
    .eq('user_id', user.id)
    .order('date', { ascending: true })
  if (error) {
    console.error('[insights] select error:', error)
    return EMPTY
  }
  if (!data || data.length === 0) return EMPTY

  const dailyDates = new Set<string>()
  const keywordCounts = new Map<string, number>()
  const byWeekday = [0, 0, 0, 0, 0, 0, 0]

  for (const row of data) {
    if (row.fortune_type === 'daily') dailyDates.add(row.date)
    const kw = extractKeyword(row.content)
    if (kw) keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1)
  }

  for (const dateStr of dailyDates) {
    const wd = weekdayMonFirst(dateStr)
    byWeekday[wd] += 1
  }

  const topKeywords = [...keywordCounts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const sortedDates = [...dailyDates].sort()
  const firstSeenDate = sortedDates[0] ?? null
  const currentStreak = computeStreak(dailyDates, todayKst())

  const dreamUsage = await loadDreamUsage(supabase, user.id)

  return {
    totalDays: dailyDates.size,
    currentStreak,
    firstSeenDate,
    topKeywords,
    byWeekday,
    dreamUsage,
  }
}

async function loadDreamUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<DreamPersonaUsage> {
  const counts: DreamPersonaUsage = { master: 0, fortune: 0, fairy: 0 }
  const { data, error } = await supabase
    .from('dream_ai_usage')
    .select('persona')
    .eq('user_id', userId)
  if (error) {
    console.error('[insights/dream_ai_usage] select error:', error)
    return counts
  }
  if (!data) return counts
  for (const row of data) {
    const p = row.persona as DreamPersonaKey | string
    if (p === 'master' || p === 'fortune' || p === 'fairy') counts[p] += 1
  }
  return counts
}

function extractKeyword(content: Json): string | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const v = (content as Record<string, unknown>).lucky_keyword
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

/** 0=월 ... 6=일 */
function weekdayMonFirst(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  // KST 기준 (시간정보 없으니 UTC로 다뤄도 요일은 동일)
  const date = new Date(Date.UTC(y, m - 1, d))
  // getUTCDay: 0=일 ... 6=토 → 0=월로 변환
  return (date.getUTCDay() + 6) % 7
}

/** 오늘부터 거꾸로 연속된 일수 계산. 오늘이 dates에 없으면 0 또는 어제까지 카운트? — 0 반환. */
function computeStreak(dates: Set<string>, today: string): number {
  if (!dates.has(today)) return 0
  let streak = 0
  let cursor = today
  while (dates.has(cursor)) {
    streak += 1
    cursor = prevDate(cursor)
  }
  return streak
}

function prevDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}
