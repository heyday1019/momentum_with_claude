import { FULL_DECK, DECK_BY_ID } from './deck'
import type { DrawnCard, Orientation } from './types'

/** Math.random 기본; 테스트에서 결정적 RNG 주입 가능 */
export type Rng = () => number

function pickUniqueIds(rng: Rng, count: number): number[] {
  const ids: number[] = []
  while (ids.length < count) {
    const candidate = Math.floor(rng() * FULL_DECK.length)
    if (!ids.includes(candidate)) ids.push(candidate)
  }
  return ids
}

/** 78장 중 3장을 중복 없이 뽑고 정/역 결정 */
export function drawThreeCards(rng: Rng = Math.random): DrawnCard[] {
  const ids = pickUniqueIds(rng, 3)
  return ids.map(id => ({
    card: DECK_BY_ID[id],
    orientation: rng() < 0.5 ? 'upright' : 'reversed',
  }))
}

/** 78장 중 1장을 뽑음 (오늘의 카드) */
export function drawOneCard(rng: Rng = Math.random): DrawnCard[] {
  const ids = pickUniqueIds(rng, 1)
  return ids.map(id => ({
    card: DECK_BY_ID[id],
    orientation: rng() < 0.5 ? 'upright' : 'reversed',
  }))
}

/** URL 직렬화: "0u,5r,12u" 또는 "0u" 형태 */
export function serializeDraws(draws: DrawnCard[]): string {
  return draws
    .map(d => `${d.card.id}${d.orientation === 'upright' ? 'u' : 'r'}`)
    .join(',')
}

/** "0u,5r,12u" 또는 "0u" → DrawnCard[]. 1 또는 3장만 허용. */
export function deserializeDraws(raw: string): DrawnCard[] | null {
  const tokens = raw.split(',')
  if (tokens.length !== 1 && tokens.length !== 3) return null

  const seenIds = new Set<number>()
  const draws: DrawnCard[] = []
  for (const token of tokens) {
    const m = /^(\d+)([ur])$/.exec(token)
    if (!m) return null
    const id = Number(m[1])
    if (!Number.isInteger(id) || id < 0 || id >= FULL_DECK.length) return null
    if (seenIds.has(id)) return null
    seenIds.add(id)
    const orientation: Orientation = m[2] === 'u' ? 'upright' : 'reversed'
    draws.push({ card: DECK_BY_ID[id], orientation })
  }
  return draws
}
