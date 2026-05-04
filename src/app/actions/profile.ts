'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { validateProfileInput } from '@/lib/fortune/validators'
import type { ProfileInput, ProfileRow } from '@/lib/fortune/types'

export async function getMyProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return data as ProfileRow | null
}

export async function upsertProfile(input: ProfileInput): Promise<{ ok: boolean; error?: string }> {
  const err = validateProfileInput(input)
  if (err) return { ok: false, error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인이 필요해요' }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    name: input.name.trim(),
    birthdate: input.birthdate,
    gender: input.gender,
  }, { onConflict: 'id' })

  if (error) return { ok: false, error: '저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.' }

  revalidatePath('/')
  revalidatePath('/me')
  return { ok: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
