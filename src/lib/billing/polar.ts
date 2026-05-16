import 'server-only'

const SANDBOX_BASE = 'https://sandbox-api.polar.sh'
const PROD_BASE    = 'https://api.polar.sh'

function baseUrl(): string {
  return process.env.POLAR_ENV === 'production' ? PROD_BASE : SANDBOX_BASE
}

function token(): string {
  const t = process.env.POLAR_ORG_TOKEN
  if (!t) throw new Error('POLAR_ORG_TOKEN is not set')
  return t
}

export interface PolarFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  fetchImpl?: typeof fetch
}

export async function polarFetch<T = unknown>(
  path: string,
  opts: PolarFetchOptions = {},
): Promise<T> {
  const f = opts.fetchImpl ?? fetch
  const res = await f(`${baseUrl()}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'authorization': `Bearer ${token()}`,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Polar ${opts.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 300)}`)
  }
  return text ? (JSON.parse(text) as T) : (undefined as T)
}
