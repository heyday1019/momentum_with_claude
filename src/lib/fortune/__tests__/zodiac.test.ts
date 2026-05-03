import { describe, it, expect } from 'vitest'
import { zodiacAnimal, zodiacSign } from '@/lib/fortune/zodiac'

describe('zodiacAnimal', () => {
  it('1995 → 돼지띠', () => expect(zodiacAnimal('1995-08-12')).toBe('돼지'))
  it('1988 → 용띠', () => expect(zodiacAnimal('1988-01-01')).toBe('용'))
  it('2000 → 용띠', () => expect(zodiacAnimal('2000-06-15')).toBe('용'))
  it('1996 → 쥐띠', () => expect(zodiacAnimal('1996-03-03')).toBe('쥐'))
})

describe('zodiacSign', () => {
  it('8월 12일 → 사자자리', () => expect(zodiacSign('1995-08-12')).toBe('사자자리'))
  it('1월 5일 → 염소자리', () => expect(zodiacSign('1995-01-05')).toBe('염소자리'))
  it('1월 25일 → 물병자리', () => expect(zodiacSign('1995-01-25')).toBe('물병자리'))
  it('3월 21일 → 양자리', () => expect(zodiacSign('1995-03-21')).toBe('양자리'))
  it('12월 22일 → 염소자리', () => expect(zodiacSign('1995-12-22')).toBe('염소자리'))
})
