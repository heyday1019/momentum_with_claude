import { describe, it, expect } from 'vitest'
import { drawThreeCards, drawOneCard, serializeDraws, deserializeDraws } from '@/lib/tarot/draw'
import { FULL_DECK } from '@/lib/tarot/deck'

const N = FULL_DECK.length // 78

describe('drawThreeCards', () => {
  it('returns exactly 3 unique cards', () => {
    const draws = drawThreeCards()
    expect(draws).toHaveLength(3)
    const ids = draws.map(d => d.card.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('every drawn card belongs to the full 78-card deck', () => {
    const draws = drawThreeCards()
    for (const d of draws) {
      expect(FULL_DECK.find(c => c.id === d.card.id)).toBeDefined()
      expect(['upright', 'reversed']).toContain(d.orientation)
    }
  })

  it('respects injected RNG (deterministic)', () => {
    // ids 3개 먼저, orientations 3개 나중. id 0/1/2 + 정·역·정
    const seq = [0.001, 1.5 / N, 2.5 / N, 0.1, 0.7, 0.2]
    let i = 0
    const rng = () => seq[i++]
    const draws = drawThreeCards(rng)
    expect(draws.map(d => d.card.id)).toEqual([0, 1, 2])
    expect(draws.map(d => d.orientation)).toEqual(['upright', 'reversed', 'upright'])
  })
})

describe('drawOneCard', () => {
  it('returns exactly 1 card', () => {
    const draws = drawOneCard()
    expect(draws).toHaveLength(1)
    expect(['upright', 'reversed']).toContain(draws[0].orientation)
    expect(FULL_DECK.find(c => c.id === draws[0].card.id)).toBeDefined()
  })

  it('respects injected RNG', () => {
    const seq = [25.5 / N, 0.6] // id=25 (Wands 4 = 22+3 — 실제로 25면 Wands 4) + reversed
    let i = 0
    const rng = () => seq[i++]
    const draws = drawOneCard(rng)
    expect(draws[0].card.id).toBe(25)
    expect(draws[0].orientation).toBe('reversed')
  })
})

describe('serializeDraws / deserializeDraws', () => {
  it('round-trips 3-card draws', () => {
    const draws = drawThreeCards()
    const raw = serializeDraws(draws)
    const restored = deserializeDraws(raw)
    expect(restored).not.toBeNull()
    expect(restored).toEqual(draws)
  })

  it('round-trips 1-card draws', () => {
    const draws = drawOneCard()
    const raw = serializeDraws(draws)
    const restored = deserializeDraws(raw)
    expect(restored).not.toBeNull()
    expect(restored).toEqual(draws)
  })

  it('produces compact format like "0u,5r,12u"', () => {
    const seq = [0.001, 5.5 / N, 12.5 / N, 0.1, 0.7, 0.2]
    let i = 0
    const draws = drawThreeCards(() => seq[i++])
    expect(serializeDraws(draws)).toBe('0u,5r,12u')
  })

  it('rejects malformed input', () => {
    expect(deserializeDraws('')).toBeNull()
    expect(deserializeDraws('0u,5r')).toBeNull()                  // 2장은 미지원
    expect(deserializeDraws('0u,5r,12u,1u')).toBeNull()           // 4장 초과
    expect(deserializeDraws('0u,5r,99u')).toBeNull()              // out of range (78 초과)
    expect(deserializeDraws('0u,0r,12u')).toBeNull()              // duplicate id
    expect(deserializeDraws('0x,5r,12u')).toBeNull()              // bad orientation
    expect(deserializeDraws('au,5r,12u')).toBeNull()              // bad id
  })
})
