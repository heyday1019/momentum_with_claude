import { describe, it, expect } from 'vitest'
import { todayKst, nextLottoDrawNumber } from '@/lib/fortune/kst'

describe('todayKst', () => {
  it('returns YYYY-MM-DD in Asia/Seoul', () => {
    const utc = new Date('2026-05-03T05:00:00.000Z')
    expect(todayKst(utc)).toBe('2026-05-03')
  })

  it('rolls over at KST midnight even if UTC is previous day', () => {
    const utc = new Date('2026-05-03T15:30:00.000Z')
    expect(todayKst(utc)).toBe('2026-05-04')
  })

  it('handles before KST midnight (UTC same day)', () => {
    const utc = new Date('2026-05-03T14:30:00.000Z')
    expect(todayKst(utc)).toBe('2026-05-03')
  })
})

describe('nextLottoDrawNumber', () => {
  it('returns the same number on a Sunday and the previous Monday', () => {
    const friday = new Date('2026-05-01T03:00:00.000Z')
    const saturdayBeforeDraw = new Date('2026-05-02T11:00:00.000Z')
    const saturdayAfterDraw = new Date('2026-05-02T13:00:00.000Z')

    const a = nextLottoDrawNumber(friday)
    const b = nextLottoDrawNumber(saturdayBeforeDraw)
    expect(a).toBe(b)

    const c = nextLottoDrawNumber(saturdayAfterDraw)
    expect(c).toBe(a + 1)
  })

  it('returns a positive integer', () => {
    expect(nextLottoDrawNumber(new Date('2026-05-03T00:00:00Z'))).toBeGreaterThan(0)
  })
})
