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

  const payload = `${id}.${ts}.${body}`

  // Polar 의 secret 형식이 standardwebhooks 호환인지 자체 인코딩인지 명확하지 않으므로
  // 가장 가능성 높은 4가지 키 해석을 모두 시도한다. 하나라도 v1 시그니처와 일치하면 통과.
  const keyCandidates: Buffer[] = []
  const suffixes: Array<{ prefix: string; encoding: 'base64' | 'base64url' }> = [
    { prefix: 'whsec_',      encoding: 'base64' },
    { prefix: 'polar_whs_',  encoding: 'base64' },
    { prefix: 'polar_whs_',  encoding: 'base64url' },
  ]
  for (const { prefix, encoding } of suffixes) {
    if (secret.startsWith(prefix)) {
      try { keyCandidates.push(Buffer.from(secret.slice(prefix.length), encoding)) } catch { /* skip */ }
    }
  }
  // Fallback: 전체 문자열 utf-8 (prefix 포함). 일부 구현은 raw string 을 키로 사용.
  keyCandidates.push(Buffer.from(secret, 'utf-8'))

  for (const key of keyCandidates) {
    const expected = createHmac('sha256', key).update(payload).digest('base64')
    for (const candidate of sig.split(' ')) {
      const [scheme, value] = candidate.split(',')
      if (scheme !== 'v1' || !value) continue
      const got = Buffer.from(value, 'base64')
      const exp = Buffer.from(expected, 'base64')
      if (got.length === exp.length && got.length > 0 && timingSafeEqual(got, exp)) return true
    }
  }
  return false
}
