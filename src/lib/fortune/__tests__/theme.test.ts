import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStore = { get: vi.fn() }
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieStore),
}))

import { readTheme } from '@/lib/fortune/theme'

describe('readTheme', () => {
  beforeEach(() => {
    cookieStore.get.mockReset()
  })

  it("returns 'light' when cookie is missing", async () => {
    cookieStore.get.mockReturnValue(undefined)
    expect(await readTheme()).toBe('light')
  })

  it("returns 'dark' when cookie value is 'dark'", async () => {
    cookieStore.get.mockReturnValue({ value: 'dark' })
    expect(await readTheme()).toBe('dark')
  })

  it("returns 'light' when cookie value is 'light'", async () => {
    cookieStore.get.mockReturnValue({ value: 'light' })
    expect(await readTheme()).toBe('light')
  })

  it("falls back to 'light' for any non-'dark' value", async () => {
    for (const bad of ['foo', '', 'DARK', '1', 'true']) {
      cookieStore.get.mockReturnValue({ value: bad })
      expect(await readTheme()).toBe('light')
    }
  })
})
