import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { polarFetch } from '@/lib/billing/polar'
import { deriveCreditsFromProduct } from '@/lib/billing/credits'
import { getCreditBalance } from '@/lib/billing/balance'
import { logBilling } from '@/lib/billing/log'
import { PurchaseSuccessCard } from '@/components/billing/purchase-success-card'

export const dynamic = 'force-dynamic'

interface PolarCheckoutResp {
  status: string
  customer_external_id: string | null
  product_id: string
  // Polar의 checkout 응답이 order를 nested로 줄 수도, order_id만 줄 수도 있음.
  // 보수적으로 두 모양 모두 처리.
  order_id?: string | null
  order?: { id: string } | null
}

interface PageProps {
  searchParams: Promise<{ checkout_id?: string }>
}

export default async function SuccessPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { checkout_id: checkoutId } = await searchParams
  let creditsAdded: number | null = null

  if (checkoutId) {
    try {
      const checkout = await polarFetch<PolarCheckoutResp>(`/v1/checkouts/${checkoutId}`)
      const orderId = checkout.order?.id ?? checkout.order_id ?? null
      if (
        checkout.status === 'succeeded'
        && orderId
        && checkout.customer_external_id === user.id
      ) {
        const credits = deriveCreditsFromProduct(checkout.product_id)
        const admin = createAdminClient()
        const { error } = await admin.rpc('apply_credit_delta', {
          p_user_id: user.id,
          p_delta: credits,
          p_reason: 'purchase',
          p_polar_order_id: orderId,
          p_related_kind: undefined,
          p_related_id: undefined,
        })
        if (error) {
          await logBilling({
            supabase: admin, event: 'error', userId: user.id,
            payload: { phase: 'success_rpc', checkout_id: checkoutId },
            error: error.message,
          })
        } else {
          await logBilling({
            supabase: admin, event: 'credit_applied', userId: user.id,
            payload: { source: 'success_url', order_id: orderId, credits },
          })
          creditsAdded = credits
        }
      }
    } catch (e) {
      console.error('[billing/success] checkout fetch failed:', e)
    }
  }

  const newBalance = await getCreditBalance(supabase, user.id)

  return (
    <main className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-16">
      <PurchaseSuccessCard creditsAdded={creditsAdded} newBalance={newBalance} />
    </main>
  )
}
