import { cookies } from 'next/headers'

export type Theme = 'light' | 'dark'

export const THEME_COOKIE = 'theme'
export const THEME_MAX_AGE = 60 * 60 * 24 * 365  // 1 year

export async function readTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value
  return value === 'dark' ? 'dark' : 'light'
}
