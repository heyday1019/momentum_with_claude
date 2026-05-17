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
  status?: string
  // Polar 응답에서 customer_external_id 가 root 일 수도, customer 객체에 nested 일 수도 있음.
  customer_external_id?: string | null
  customer?: { external_id?: string | null } | null
  product_id?: string
  // order 도 nested 또는 flat 일 수 있음.
  order_id?: string | null
  order?: { id: string; product_id?: string } | null
  // 진단용 추가 필드 — 실제 응답에 무엇이 있는지 보려고
  [key: string]: unknown
}

const SUCCESS_STATUSES = new Set(['succeeded', 'confirmed', 'paid', 'completed'])

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
      const externalId = checkout.customer_external_id ?? checkout.customer?.external_id ?? null
      const productId = checkout.product_id ?? checkout.order?.product_id ?? null
      const status = checkout.status ?? ''
      const matches =
        SUCCESS_STATUSES.has(status)
        && orderId
        && externalId === user.id
        && productId

      // 진단 — 실제로 본 응답 필드들을 기록. 결제 후에도 매칭 안 되면 어디서 어긋났는지 확인.
      const admin = createAdminClient()
      await logBilling({
        supabase: admin,
        event: matches ? 'webhook_received' : 'error',
        userId: user.id,
        payload: {
          phase: 'success_url_inspect',
          checkout_id: checkoutId,
          status,
          status_matches: SUCCESS_STATUSES.has(status),
          orderId,
          externalId_matches: externalId === user.id,
          productId,
          response_keys: Object.keys(checkout),
        },
        error: matches ? null : 'success_url_no_match',
      })

      if (matches && productId && orderId) {
        const credits = deriveCreditsFromProduct(productId)
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
      const admin = createAdminClient()
      await logBilling({
        supabase: admin, event: 'error', userId: user.id,
        payload: { phase: 'success_fetch', checkout_id: checkoutId },
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const newBalance = await getCreditBalance(supabase, user.id)

  return (
    <main className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-16">
      <PurchaseSuccessCard creditsAdded={creditsAdded} newBalance={newBalance} />
    </main>
  )
}
