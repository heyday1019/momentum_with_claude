export type Orientation = 'upright' | 'reversed'

/** Major Arcana 22장. id는 0(바보) ~ 21(세계) */
export interface TarotCard {
  id: number
  name_kr: string
  name_en: string
  /** 정방향 짧은 키워드 (한 줄) */
  upright: string
  /** 역방향 짧은 키워드 (한 줄) */
  reversed: string
}

export interface DrawnCard {
  card: TarotCard
  orientation: Orientation
}

export type SpreadPosition = 'past' | 'present' | 'future'

export const SPREAD_POSITIONS: readonly SpreadPosition[] = ['past', 'present', 'future'] as const
export const POSITION_LABELS: Record<SpreadPosition, string> = {
  past: '과거',
  present: '현재',
  future: '미래',
}

export interface TarotReading {
  draws: DrawnCard[]
  interpretation: string
}
