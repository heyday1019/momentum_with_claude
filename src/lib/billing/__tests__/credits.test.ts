import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { deriveCreditsFromProduct, productIdFor } from '@/lib/billing/credits'

const ORIG = { ...process.env }

beforeEach(() => {
  process.env.POLAR_PRODUCT_SMALL  = 'prod_small_1'
  process.env.POLAR_PRODUCT_MEDIUM = 'prod_medium_1'
  process.env.POLAR_PRODUCT_LARGE  = 'prod_large_1'
})

afterEach(() => {
  process.env = { ...ORIG }
})

describe('deriveCreditsFromProduct', () => {
  it('maps each env product id to its package credits', () => {
    expect(deriveCreditsFromProduct('prod_small_1')).toBe(10)
    expect(deriveCreditsFromProduct('prod_medium_1')).toBe(50)
    expect(deriveCreditsFromProduct('prod_large_1')).toBe(200)
  })

  it('throws for unknown product id', () => {
    expect(() => deriveCreditsFromProduct('prod_unknown')).toThrow(/unknown product/i)
  })

  it('throws if an env var is missing', () => {
    delete process.env.POLAR_PRODUCT_MEDIUM
    expect(() => deriveCreditsFromProduct('prod_medium_1')).toThrow(/POLAR_PRODUCT_MEDIUM/)
  })
})

describe('productIdFor', () => {
  it('returns the env value for each sku', () => {
    expect(productIdFor('small')).toBe('prod_small_1')
    expect(productIdFor('large')).toBe('prod_large_1')
  })

  it('throws if the env var is missing', () => {
    delete process.env.POLAR_PRODUCT_SMALL
    expect(() => productIdFor('small')).toThrow(/POLAR_PRODUCT_SMALL/)
  })
})
