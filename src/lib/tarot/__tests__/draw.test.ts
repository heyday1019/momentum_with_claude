import { describe, it, expect } from 'vitest'
import { drawThreeCards, serializeDraws, deserializeDraws } from '@/lib/tarot/draw'
import { MAJOR_ARCANA } from '@/lib/tarot/deck'

describe('drawThreeCards', () => {
  it('returns exactly 3 unique cards', () => {
    const draws = drawThreeCards()
    expect(draws).toHaveLength(3)
    const ids = draws.map(d => d.card.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('every drawn card belongs to the Major Arcana', () => {
    const draws = drawThreeCards()
    for (const d of draws) {
      expect(MAJOR_ARCANA.find(c => c.id === d.card.id)).toBeDefined()
      expect(['upright', 'reversed']).toContain(d.orientation)
    }
  })

  it('respects injected RNG (deterministic)', () => {
    // ids 3개 먼저, orientations 3개 나중. 카드 0/1/2 + 정·역·정 기대
    const seq = [0.001, 1.5 / 22, 2.5 / 22, 0.1, 0.7, 0.2]
    let i = 0
    const rng = () => seq[i++]
    const draws = drawThreeCards(rng)
    expect(draws.map(d => d.card.id)).toEqual([0, 1, 2])
    expect(draws.map(d => d.orientation)).toEqual(['upright', 'reversed', 'upright'])
  })
})

describe('serializeDraws / deserializeDraws', () => {
  it('round-trips correctly', () => {
    const draws = drawThreeCards()
    const raw = serializeDraws(draws)
    const restored = deserializeDraws(raw)
    expect(restored).not.toBeNull()
    expect(restored).toEqual(draws)
  })

  it('produces compact format like "0u,5r,12u"', () => {
    const seq = [0.001, 5.5 / 22, 12.5 / 22, 0.1, 0.7, 0.2]
    let i = 0
    const draws = drawThreeCards(() => seq[i++])
    expect(serializeDraws(draws)).toBe('0u,5r,12u')
  })

  it('rejects malformed input', () => {
    expect(deserializeDraws('')).toBeNull()
    expect(deserializeDraws('0u')).toBeNull()                  // wrong length
    expect(deserializeDraws('0u,5r,12u,1u')).toBeNull()        // wrong length
    expect(deserializeDraws('0u,5r,99u')).toBeNull()           // out of range
    expect(deserializeDraws('0u,0r,12u')).toBeNull()           // duplicate id
    expect(deserializeDraws('0x,5r,12u')).toBeNull()           // bad orientation
    expect(deserializeDraws('au,5r,12u')).toBeNull()           // bad id
  })
})
