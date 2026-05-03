import { describe, it, expect } from 'vitest'
import { generateLottoNumbers } from '@/lib/fortune/lotto'

describe('generateLottoNumbers', () => {
  const userA = '11111111-1111-1111-1111-111111111111'
  const userB = '22222222-2222-2222-2222-222222222222'

  it('returns 6 unique numbers in [1, 45], sorted asc', () => {
    const ns = generateLottoNumbers(userA, 1178)
    expect(ns).toHaveLength(6)
    expect(new Set(ns).size).toBe(6)
    ns.forEach(n => expect(n).toBeGreaterThanOrEqual(1))
    ns.forEach(n => expect(n).toBeLessThanOrEqual(45))
    expect(ns).toEqual([...ns].sort((a, b) => a - b))
  })

  it('is deterministic — same userId+drawNumber yields same numbers', () => {
    const a = generateLottoNumbers(userA, 1178)
    const b = generateLottoNumbers(userA, 1178)
    expect(a).toEqual(b)
  })

  it('different drawNumber yields different numbers (with high prob)', () => {
    const a = generateLottoNumbers(userA, 1178)
    const b = generateLottoNumbers(userA, 1179)
    expect(a).not.toEqual(b)
  })

  it('different userId yields different numbers (with high prob)', () => {
    const a = generateLottoNumbers(userA, 1178)
    const b = generateLottoNumbers(userB, 1178)
    expect(a).not.toEqual(b)
  })
})
