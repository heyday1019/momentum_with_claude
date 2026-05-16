import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'node:crypto'

const insertMock = vi.fn().mockResolvedValue({ error: null })
const rpcMock    = vi.fn().mockResolvedValue({ data: null, error: null })

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ insert: insertMock }),
    rpc: rpcMock,
  }),
}))

const SECRET_RAW = Buffer.from('test-secret-bytes-1234567890abcdef', 'utf-8')
const SECRET = `whsec_${SECRET_RAW.toString('base64')}`

beforeEach(() => {
  process.env.POLAR_WEBHOOK_SECRET = SECRET
  process.env.POLAR_PRODUCT_SMALL  = 'prod_small_1'
  process.env.POLAR_PRODUCT_MEDIUM = 'prod_medium_1'
  process.env.POLAR_PRODUCT_LARGE  = 'prod_large_1'
  insertMock.mockClear()
  rpcMock.mockClear()
})

function makeReq(bodyObj: unknown, opts?: { tamper?: boolean; staleTs?: boolean }) {
  const body = JSON.stringify(bodyObj)
  const id = 'msg_1'
  const ts = opts?.staleTs
    ? String(Math.floor(Date.now() / 1000) - 60 * 30)
    : String(Math.floor(Date.now() / 1000))
  const sig = `v1,${createHmac('sha256', SECRET_RAW).update(`${id}.${ts}.${body}`).digest('base64')}`
  const transmitted = opts?.tamper ? body + 'x' : body
  return new Request('http://localhost/api/polar/webhook', {
    method: 'POST',
    headers: {
      'webhook-id': id,
      'webhook-timestamp': ts,
      'webhook-signature': sig,
      'content-type': 'application/json',
    },
    body: transmitted,
  })
}

describe('POST /api/polar/webhook', () => {
  it('returns 401 on invalid signature (tampered body)', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({ type: 'order.paid', data: { id: 'o1' } }, { tamper: true })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 200 and calls RPC on valid order.paid', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({
      type: 'order.paid',
      data: {
        id: 'order_abc',
        product_id: 'prod_medium_1',
        customer: { external_id: '00000000-0000-0000-0000-000000000001' },
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('apply_credit_delta', expect.objectContaining({
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_delta: 50,
      p_reason: 'purchase',
      p_polar_order_id: 'order_abc',
    }))
  })

  it('ignores non-order.paid events with 200', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({ type: 'order.created', data: { id: 'o1' } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 200 without RPC when external_id missing', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({
      type: 'order.paid',
      data: { id: 'order_z', product_id: 'prod_small_1', customer: {} },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 401 on stale timestamp', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({ type: 'order.paid', data: { id: 'o1' } }, { staleTs: true })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 without RPC when product_id is unknown', async () => {
    const { POST } = await import('@/app/api/polar/webhook/route')
    const req = makeReq({
      type: 'order.paid',
      data: {
        id: 'order_y',
        product_id: 'prod_does_not_exist',
        customer: { external_id: '00000000-0000-0000-0000-000000000001' },
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
