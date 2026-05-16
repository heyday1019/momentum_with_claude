import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPolarSignature } from '@/lib/billing/webhook-signature'
import { deriveCreditsFromProduct } from '@/lib/billing/credits'
import { logBilling } from '@/lib/billing/log'

interface PolarOrder {
  id: string
  product_id: string
  customer: { external_id?: string | null }
  metadata?: Record<string, string>
}

interface PolarEvent {
  type: string
  data: PolarOrder
}

export async function POST(req: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET
  if (!secret) return new NextResponse('config missing', { status: 500 })

  const body = await req.text()
  const id  = req.headers.get('webhook-id') ?? ''
  const ts  = req.headers.get('webhook-timestamp') ?? ''
  const sig = req.headers.get('webhook-signature') ?? ''

  const admin = createAdminClient()

  if (!verifyPolarSignature({ id, ts, body, sig, secret })) {
    await logBilling({ supabase: admin, event: 'webhook_signature_invalid', payload: { id } })
    return new NextResponse('invalid signature', { status: 401 })
  }

  let event: PolarEvent
  try {
    event = JSON.parse(body) as PolarEvent
  } catch {
    return new NextResponse('invalid json', { status: 400 })
  }

  await logBilling({ supabase: admin, event: 'webhook_received', payload: { id, type: event.type } })

  if (event.type !== 'order.paid') {
    return new NextResponse('ignored', { status: 200 })
  }

  const order = event.data
  const userId = order.customer?.external_id
  if (!userId) {
    await logBilling({
      supabase: admin, event: 'error',
      payload: { phase: 'webhook', order_id: order.id },
      error: 'missing external_id',
    })
    return new NextResponse('ok', { status: 200 })
  }

  let credits: number
  try {
    credits = deriveCreditsFromProduct(order.product_id)
  } catch (e) {
    await logBilling({
      supabase: admin, event: 'error',
      payload: { phase: 'webhook', order_id: order.id, product_id: order.product_id },
      error: e instanceof Error ? e.message : String(e),
    })
    return new NextResponse('ok', { status: 200 })
  }

  const { error } = await admin.rpc('apply_credit_delta', {
    p_user_id: userId,
    p_delta: credits,
    p_reason: 'purchase',
    p_polar_order_id: order.id,
    p_related_kind: undefined,
    p_related_id: undefined,
  })

  if (error) {
    await logBilling({
      supabase: admin, event: 'error', userId,
      payload: { phase: 'webhook_rpc', order_id: order.id },
      error: error.message,
    })
    return new NextResponse('rpc failed', { status: 500 })
  }

  await logBilling({
    supabase: admin, event: 'credit_applied', userId,
    payload: { source: 'webhook', order_id: order.id, credits },
  })
  return new NextResponse('ok', { status: 200 })
}
