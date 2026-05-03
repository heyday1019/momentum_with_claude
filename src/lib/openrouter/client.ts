const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'anthropic/claude-haiku-4-5'

export interface CallOptions {
  systemPrompt: string
  userPrompt: string
  /** JSON.parse 가능한 응답을 강제 */
  expectJson: true
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  /** 의존성 주입용 (테스트). 기본 globalThis.fetch */
  fetchImpl?: typeof fetch
}

export class OpenRouterError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

/** 1회 재시도 포함 — JSON 파싱 실패 시 한 번만 더 호출 */
export async function callFortuneModel<T>(opts: CallOptions): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterError('OPENROUTER_API_KEY missing', 500)

  const fetchImpl = opts.fetchImpl ?? fetch

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: opts.maxTokens ?? 800,
    temperature: opts.temperature ?? 0.7,
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    'X-Title': 'Momentum Fortune',
  }

  const timeoutMs = opts.timeoutMs ?? 15000

  const callOnce = async (): Promise<T> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        throw new OpenRouterError(`OpenRouter ${res.status}`, res.status)
      }
      const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      const content = json.choices?.[0]?.message?.content
      if (!content) throw new OpenRouterError('Empty response')
      return JSON.parse(content) as T
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    return await callOnce()
  } catch (e) {
    if (e instanceof OpenRouterError && e.status && e.status >= 400 && e.status < 500 && e.status !== 429) {
      throw e
    }
    return await callOnce()
  }
}
