import { describe, it, expect } from 'vitest'
import {
  SYSTEM_PROMPT,
  buildDailyPrompt,
  buildZodiacPrompt,
  buildLottoCommentPrompt,
} from '@/lib/fortune/prompts'

describe('SYSTEM_PROMPT', () => {
  it('includes 친근 멘토 tone directives', () => {
    expect(SYSTEM_PROMPT).toContain('친한 멘토')
    expect(SYSTEM_PROMPT).toContain('JSON')
  })
  it('forbids medical/legal/financial assertions', () => {
    expect(SYSTEM_PROMPT).toMatch(/의학|법률|금융/)
  })
})

describe('buildDailyPrompt', () => {
  it('includes name, birthdate, gender, today', () => {
    const p = buildDailyPrompt({
      name: '수민',
      birthdate: '1995-08-12',
      gender: 'female',
      today: '2026-05-03',
    })
    expect(p).toContain('수민')
    expect(p).toContain('1995-08-12')
    expect(p).toContain('2026-05-03')
    expect(p).toMatch(/categories|love|money|health|work/i)
  })
})

describe('buildZodiacPrompt', () => {
  it('embeds pre-computed animal + sign', () => {
    const p = buildZodiacPrompt({
      birthdate: '1995-08-12',
      today: '2026-05-03',
      zodiacAnimal: '돼지',
      zodiacSign: '사자자리',
    })
    expect(p).toContain('돼지')
    expect(p).toContain('사자자리')
  })
})

describe('buildLottoCommentPrompt', () => {
  it('includes the 6 numbers and draw number', () => {
    const p = buildLottoCommentPrompt({
      name: '수민',
      drawNumber: 1178,
      numbers: [7, 14, 23, 31, 38, 42],
      today: '2026-05-03',
    })
    expect(p).toContain('1178')
    expect(p).toMatch(/7.*14.*23.*31.*38.*42/)
  })
})
