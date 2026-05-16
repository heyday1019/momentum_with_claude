'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { polarFetch } from '@/lib/billing/polar'
import { productIdFor } from '@/lib/billing/credits'
import { logBilling } from '@/lib/billing/log'
import { CREDIT_PACKAGES, CREDIT_PACKAGE_IDS, type CreditPackageId } from '@/lib/billing/packages'

interface CheckoutResponse {
  url: string
  id: string
}

export async function startCheckout(sku: CreditPackageId): Promise<never> {
  if (!CREDIT_PACKAGE_IDS.includes(sku)) throw new Error('INVALID_SKU')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')

  const productId = productIdFor(sku)
  const credits = CREDIT_PACKAGES[sku].credits
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is not set')

  let checkout: CheckoutResponse
  try {
    checkout = await polarFetch<CheckoutResponse>('/v1/checkouts/', {
      method: 'POST',
      body: {
        products: [productId],
        customer_external_id: user.id,
        customer_email: user.email,
        success_url: `${siteUrl}/billing/success?checkout_id={CHECKOUT_ID}`,
        metadata: { sku, credits: String(credits), user_id: user.id },
      },
    })
  } catch (e) {
    await logBilling({
      supabase, event: 'error', userId: user.id,
      payload: { phase: 'checkout_create', sku },
      error: e instanceof Error ? e.message : String(e),
    })
    throw e
  }

  await logBilling({
    supabase, event: 'checkout_started', userId: user.id,
    payload: { sku, credits, checkout_id: checkout.id, product_id: productId },
  })
  redirect(checkout.url)
}
