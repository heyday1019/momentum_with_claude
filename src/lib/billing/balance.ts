import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export async function getCreditBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[getCreditBalance] error:', error)
    return 0
  }
  return data?.balance ?? 0
}
