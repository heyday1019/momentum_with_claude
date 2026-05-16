import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCreditBalance } from '@/lib/billing/balance'

export async function CreditBadge() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const balance = await getCreditBalance(supabase, user.id)
  const empty = balance <= 0

  return (
    <Link
      href="/billing"
      aria-label={`크레딧 ${balance}개. 충전 페이지로`}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        empty
          ? 'bg-fortune-attention text-fortune-canvas'
          : 'bg-fortune-success text-fortune-canvas',
      ].join(' ')}
    >
      <span aria-hidden>●</span>
      <span>{balance}</span>
      {empty && <span className="hidden sm:inline">· 충전</span>}
    </Link>
  )
}
