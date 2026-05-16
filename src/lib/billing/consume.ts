import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type ConsumeReason =
  | 'consume_daily' | 'consume_zodiac' | 'consume_tarot'
  | 'consume_dream' | 'consume_lotto'

export interface ConsumeArgs {
  supabase: SupabaseClient<Database>
  userId: string
  reason: ConsumeReason
  relatedKind?: string
  relatedId?: string
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS')
    this.name = 'InsufficientCreditsError'
  }
}

export async function consumeCredit(args: ConsumeArgs): Promise<number> {
  const { data, error } = await args.supabase.rpc('apply_credit_delta', {
    p_user_id: args.userId,
    p_delta: -1,
    p_reason: args.reason,
    p_polar_order_id: undefined,
    p_related_kind: args.relatedKind ?? undefined,
    p_related_id: args.relatedId ?? undefined,
  })
  if (error) {
    if ((error.message ?? '').includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError()
    }
    throw new Error(`apply_credit_delta failed: ${error.message}`)
  }
  return data as number
}

export function isInsufficient(e: unknown): e is InsufficientCreditsError {
  return e instanceof InsufficientCreditsError
    || (e instanceof Error && e.message === 'INSUFFICIENT_CREDITS')
}
