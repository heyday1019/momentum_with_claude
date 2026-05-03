'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ProfileInput, ProfileRow } from '@/lib/fortune/types'

export async function getMyProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return data as ProfileRow | null
}

function validateProfileInput(input: ProfileInput): string | null {
  if (!input.name || input.name.trim().length === 0) return '이름을 입력해주세요'
  if (input.name.length > 30) return '이름은 30자 이하로 입력해주세요'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthdate)) return '생년월일 형식이 올바르지 않아요'
  const d = new Date(input.birthdate)
  if (Number.isNaN(d.getTime())) return '생년월일이 유효하지 않아요'
  if (d < new Date('1900-01-01') || d > new Date()) return '생년월일은 1900년 이후, 오늘 이전이어야 해요'
  if (!['male', 'female', 'other'].includes(input.gender)) return '성별 선택이 올바르지 않아요'
  return null
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
