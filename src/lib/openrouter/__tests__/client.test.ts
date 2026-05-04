import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callFortuneModel, OpenRouterError } from '@/lib/openrouter/client'

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-key'
})

describe('callFortuneModel', () => {
  it('parses JSON content from chat completion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"headline":"hi","body":"there"}' } }],
      }),
    } as Response)

    const out = await callFortuneModel<{ headline: string }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out.headline).toBe('hi')
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('retries once on 5xx', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '{"ok":1}' } }] }),
      })

    const out = await callFortuneModel<{ ok: number }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out.ok).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('strips ```json code fences before parsing', async () => {
    const fenced = '```json\n{"headline":"hi","body":"there"}\n```'
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: fenced } }] }),
    } as Response)

    const out = await callFortuneModel<{ headline: string; body: string }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out.headline).toBe('hi')
    expect(out.body).toBe('there')
  })

  it('extracts the first {…} block when wrapped in prose', async () => {
    const wrapped = 'Sure! Here is the JSON:\n{"ok":1}\nLet me know if you need more.'
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: wrapped } }] }),
    } as Response)

    const out = await callFortuneModel<{ ok: number }>({
      systemPrompt: 's',
      userPrompt: 'u',
      expectJson: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out.ok).toBe(1)
  })

  it('throws OpenRouterError if API key missing', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(
      callFortuneModel({
        systemPrompt: 's', userPrompt: 'u', expectJson: true,
        fetchImpl: vi.fn() as unknown as typeof fetch,
      })
    ).rejects.toBeInstanceOf(OpenRouterError)
  })
})
