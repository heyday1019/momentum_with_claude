import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callFortuneModel } from '@/lib/openrouter/client'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  process.env.OPENROUTER_API_KEY = 'test-key'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
})

describe('callFortuneModel — USE_OPENROUTER_MOCK', () => {
  it('returns deterministic mock response when USE_OPENROUTER_MOCK=true and skips fetch', async () => {
    process.env.USE_OPENROUTER_MOCK = 'true'
    const fetchImpl = vi.fn()

    const out = await callFortuneModel<{ headline: string }>({
      systemPrompt: 's',
      userPrompt: 'general daily fortune',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(out.headline).toBeDefined()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('calls real fetch when USE_OPENROUTER_MOCK is unset', async () => {
    delete process.env.USE_OPENROUTER_MOCK
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"ok":1}' } }] }),
    } as Response)

    const out = await callFortuneModel<{ ok: number }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(out.ok).toBe(1)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('calls real fetch when USE_OPENROUTER_MOCK=false', async () => {
    process.env.USE_OPENROUTER_MOCK = 'false'
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"x":1}' } }] }),
    } as Response)

    const out = await callFortuneModel<{ x: number }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(out.x).toBe(1)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
