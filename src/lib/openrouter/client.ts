const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'anthropic/claude-haiku-4-5'

export interface CallUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export interface CallOptions {
  systemPrompt: string
  userPrompt: string
  /** JSON.parse 가능한 응답을 강제 */
  expectJson: true
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  /** OpenRouter 모델 식별자. 미지정 시 anthropic/claude-haiku-4-5 */
  model?: string
  /** 응답 토큰 정보 콜백 (성공 시 1회 호출). 로깅 용도. */
  onUsage?: (info: { model: string; usage: CallUsage }) => void | Promise<void>
  /** 의존성 주입용 (테스트). 기본 globalThis.fetch */
  fetchImpl?: typeof fetch
}

export class OpenRouterError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

/**
 * 모델이 ```json ... ``` 코드펜스로 감싼 응답을 보내도 파싱한다.
 * 우선 그대로 JSON.parse → 실패 시 펜스 제거 → 그래도 실패면 첫 {…} 블록 추출.
 */
function parseJsonLoose<T>(raw: string): T {
  const tryParse = (s: string): T | null => {
    try { return JSON.parse(s) as T } catch { return null }
  }
  const direct = tryParse(raw)
  if (direct !== null) return direct

  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const fenced = tryParse(stripped)
  if (fenced !== null) return fenced

  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first !== -1 && last > first) {
    const sliced = tryParse(raw.slice(first, last + 1))
    if (sliced !== null) return sliced
  }
  throw new OpenRouterError('Response is not valid JSON')
}

/** 1회 재시도 포함 — JSON 파싱 실패 시 한 번만 더 호출 */
export async function callFortuneModel<T>(opts: CallOptions): Promise<T> {
  if (process.env.USE_OPENROUTER_MOCK === 'true') {
    const mock = await import('./__mocks__/client')
    return mock.callFortuneModel<T>({ userPrompt: opts.userPrompt })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterError('OPENROUTER_API_KEY missing', 500)

  const fetchImpl = opts.fetchImpl ?? fetch

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
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

  const callOnce = async (): Promise<{ data: T; usage: CallUsage; model: string }> => {
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
      const json = await res.json() as {
        model?: string
        choices?: Array<{ message?: { content?: string } }>
        usage?: CallUsage
      }
      const content = json.choices?.[0]?.message?.content
      if (!content) throw new OpenRouterError('Empty response')
      return {
        data: parseJsonLoose<T>(content),
        usage: json.usage ?? {},
        model: json.model ?? body.model,
      }
    } finally {
      clearTimeout(timer)
    }
  }

  let result: { data: T; usage: CallUsage; model: string }
  try {
    result = await callOnce()
  } catch (e) {
    if (e instanceof OpenRouterError && e.status && e.status >= 400 && e.status < 500 && e.status !== 429) {
      throw e
    }
    result = await callOnce()
  }

  if (opts.onUsage) {
    try { await opts.onUsage({ model: result.model, usage: result.usage }) }
    catch (err) { console.error('[openrouter/onUsage] failed:', err) }
  }

  return result.data
}
