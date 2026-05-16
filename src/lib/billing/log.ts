import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'

export type BillingEvent =
  | 'checkout_started' | 'webhook_received' | 'webhook_signature_invalid'
  | 'credit_applied' | 'error'

export interface LogArgs {
  supabase: SupabaseClient<Database>
  event: BillingEvent
  userId?: string | null
  payload?: Record<string, unknown>
  error?: string | null
}

export async function logBilling(args: LogArgs): Promise<void> {
  const { error } = await args.supabase.from('billing_log').insert({
    event: args.event,
    user_id: args.userId ?? null,
    payload: (args.payload ?? {}) as Json,
    error: args.error ?? null,
  })
  if (error) console.error(`[billing_log/${args.event}] insert error:`, error)
}
