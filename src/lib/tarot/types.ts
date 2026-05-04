export type Orientation = 'upright' | 'reversed'

/** 슈트: major(메이저 아르카나 0–21) + 4개 마이너 슈트 (각 14장) */
export type Suit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'

export const SUIT_LABELS_KR: Record<Suit, string> = {
  major: '메이저',
  wands: '완드',
  cups: '컵',
  swords: '소드',
  pentacles: '펜타클',
}

/**
 * 78장 전체. id는 0–77 고유.
 *  0–21: Major Arcana (suit='major', rank=0..21)
 * 22–35: Wands (Ace=22, 2=23, …, King=35)
 * 36–49: Cups
 * 50–63: Swords
 * 64–77: Pentacles
 */
export interface TarotCard {
  id: number
  name_kr: string
  name_en: string
  /** 정방향 짧은 키워드 */
  upright: string
  /** 역방향 짧은 키워드 */
  reversed: string
  suit: Suit
  /** major: 0..21, minor: 1..14 (14는 King) */
  rank: number
}

export interface DrawnCard {
  card: TarotCard
  orientation: Orientation
}

export type SpreadType = 'three' | 'one'
export type SpreadPosition = 'past' | 'present' | 'future' | 'today'

export const THREE_CARD_POSITIONS: readonly SpreadPosition[] = ['past', 'present', 'future'] as const
export const ONE_CARD_POSITIONS: readonly SpreadPosition[] = ['today'] as const

export const POSITION_LABELS: Record<SpreadPosition, string> = {
  past: '과거',
  present: '현재',
  future: '미래',
  today: '오늘',
}

/** 기존 호환용 alias — 외부에 export된 SPREAD_POSITIONS는 3장 기준. */
export const SPREAD_POSITIONS = THREE_CARD_POSITIONS

export interface TarotReading {
  draws: DrawnCard[]
  interpretation: string
}
