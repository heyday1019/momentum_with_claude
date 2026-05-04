import { MAJOR_ARCANA, MAJOR_ARCANA_BY_ID } from './deck'
import type { DrawnCard, Orientation } from './types'

/** Math.random 기본; 테스트에서 결정적 RNG 주입 가능 */
export type Rng = () => number

/** 22장 중 3장을 중복 없이 뽑고 각 장의 정/역 방향을 결정 */
export function drawThreeCards(rng: Rng = Math.random): DrawnCard[] {
  const ids: number[] = []
  while (ids.length < 3) {
    const candidate = Math.floor(rng() * MAJOR_ARCANA.length)
    if (!ids.includes(candidate)) ids.push(candidate)
  }
  return ids.map(id => ({
    card: MAJOR_ARCANA_BY_ID[id],
    orientation: rng() < 0.5 ? 'upright' : 'reversed',
  }))
}

/** URL 직렬화: "0u,5r,12u" 형태 */
export function serializeDraws(draws: DrawnCard[]): string {
  return draws
    .map(d => `${d.card.id}${d.orientation === 'upright' ? 'u' : 'r'}`)
    .join(',')
}

/** "0u,5r,12u" → DrawnCard[]. 형식·범위 위반 시 null */
export function deserializeDraws(raw: string): DrawnCard[] | null {
  const tokens = raw.split(',')
  if (tokens.length !== 3) return null

  const seenIds = new Set<number>()
  const draws: DrawnCard[] = []
  for (const token of tokens) {
    const m = /^(\d+)([ur])$/.exec(token)
    if (!m) return null
    const id = Number(m[1])
    if (!Number.isInteger(id) || id < 0 || id >= MAJOR_ARCANA.length) return null
    if (seenIds.has(id)) return null
    seenIds.add(id)
    const orientation: Orientation = m[2] === 'u' ? 'upright' : 'reversed'
    draws.push({ card: MAJOR_ARCANA_BY_ID[id], orientation })
  }
  return draws
}
