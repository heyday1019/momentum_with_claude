import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyPolarSignature } from '@/lib/billing/webhook-signature'

const SECRET_RAW = Buffer.from('test-secret-bytes-1234567890abcdef', 'utf-8')
const SECRET = `whsec_${SECRET_RAW.toString('base64')}`

function sign(id: string, ts: string, body: string): string {
  const payload = `${id}.${ts}.${body}`
  const sig = createHmac('sha256', SECRET_RAW).update(payload).digest('base64')
  return `v1,${sig}`
}

describe('verifyPolarSignature', () => {
  const now = Math.floor(Date.now() / 1000).toString()
  const body = JSON.stringify({ type: 'order.paid', data: { id: 'o1' } })
  const id = 'msg_123'

  it('accepts a correctly signed payload', () => {
    const ok = verifyPolarSignature({ id, ts: now, body, sig: sign(id, now, body), secret: SECRET })
    expect(ok).toBe(true)
  })

  it('rejects a tampered body', () => {
    const sig = sign(id, now, body)
    const ok = verifyPolarSignature({ id, ts: now, body: body + 'x', sig, secret: SECRET })
    expect(ok).toBe(false)
  })

  it('rejects a stale timestamp (skew > 5 min)', () => {
    const stale = (Math.floor(Date.now() / 1000) - 60 * 10).toString()
    const ok = verifyPolarSignature({ id, ts: stale, body, sig: sign(id, stale, body), secret: SECRET })
    expect(ok).toBe(false)
  })

  it('rejects when sig header is missing', () => {
    expect(verifyPolarSignature({ id, ts: now, body, sig: '', secret: SECRET })).toBe(false)
  })

  it('accepts when one of multiple space-separated signatures matches', () => {
    const valid = sign(id, now, body)
    const sig = `v1,wrongwrongwrong ${valid}`
    expect(verifyPolarSignature({ id, ts: now, body, sig, secret: SECRET })).toBe(true)
  })

  it('rejects when id or ts is missing', () => {
    expect(verifyPolarSignature({ id: '', ts: now, body, sig: sign('', now, body), secret: SECRET })).toBe(false)
    expect(verifyPolarSignature({ id, ts: '', body, sig: sign(id, '', body), secret: SECRET })).toBe(false)
  })

  it('rejects non-numeric timestamp', () => {
    expect(verifyPolarSignature({ id, ts: 'abc', body, sig: sign(id, 'abc', body), secret: SECRET })).toBe(false)
  })

  it('accepts a polar_whs_ prefixed secret', () => {
    const polarSecret = `polar_whs_${SECRET_RAW.toString('base64')}`
    const payload = `${id}.${now}.${body}`
    const sig = `v1,${createHmac('sha256', SECRET_RAW).update(payload).digest('base64')}`
    expect(verifyPolarSignature({ id, ts: now, body, sig, secret: polarSecret })).toBe(true)
  })
})
