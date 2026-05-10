'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { THEME_COOKIE, THEME_MAX_AGE, type Theme } from '@/lib/fortune/theme'

export async function setTheme(next: Theme): Promise<void> {
  if (next !== 'light' && next !== 'dark') return
  const store = await cookies()
  store.set(THEME_COOKIE, next, {
    path: '/',
    maxAge: THEME_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  revalidatePath('/', 'layout')
}
