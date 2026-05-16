import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_SKEW_SECONDS = 60 * 5

interface VerifyArgs {
  id: string
  ts: string
  body: string
  sig: string
  secret: string
}

export function verifyPolarSignature({ id, ts, body, sig, secret }: VerifyArgs): boolean {
  if (!id || !ts || !sig || !secret) return false

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - tsNum) > MAX_SKEW_SECONDS) return false

  // Polar issues secrets with `polar_whs_` prefix; Standard Webhooks default is `whsec_`.
  // Both encode the HMAC key as base64 after the prefix.
  let rawSecret: Buffer
  if (secret.startsWith('whsec_')) {
    rawSecret = Buffer.from(secret.slice('whsec_'.length), 'base64')
  } else if (secret.startsWith('polar_whs_')) {
    rawSecret = Buffer.from(secret.slice('polar_whs_'.length), 'base64')
  } else {
    rawSecret = Buffer.from(secret, 'utf-8')
  }

  const payload = `${id}.${ts}.${body}`
  const expected = createHmac('sha256', rawSecret).update(payload).digest('base64')

  for (const candidate of sig.split(' ')) {
    const [scheme, value] = candidate.split(',')
    if (scheme !== 'v1' || !value) continue
    const got = Buffer.from(value, 'base64')
    const exp = Buffer.from(expected, 'base64')
    if (got.length === exp.length && timingSafeEqual(got, exp)) return true
  }
  return false
}
