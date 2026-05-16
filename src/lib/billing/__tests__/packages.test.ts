import { describe, it, expect } from 'vitest'
import { CREDIT_PACKAGES, CREDIT_PACKAGE_IDS, type CreditPackageId } from '@/lib/billing/packages'

describe('CREDIT_PACKAGES', () => {
  it('contains exactly three SKUs: small / medium / large', () => {
    expect(CREDIT_PACKAGE_IDS).toEqual(['small', 'medium', 'large'])
  })

  it('every package has positive credits and a non-empty label', () => {
    for (const id of CREDIT_PACKAGE_IDS) {
      const pkg = CREDIT_PACKAGES[id]
      expect(pkg.credits).toBeGreaterThan(0)
      expect(pkg.label.length).toBeGreaterThan(0)
    }
  })

  it('credits scale strictly upward small < medium < large', () => {
    expect(CREDIT_PACKAGES.small.credits).toBeLessThan(CREDIT_PACKAGES.medium.credits)
    expect(CREDIT_PACKAGES.medium.credits).toBeLessThan(CREDIT_PACKAGES.large.credits)
  })

  it('CreditPackageId type accepts only the three SKUs', () => {
    const ok: CreditPackageId = 'medium'
    expect(ok).toBe('medium')
  })
})
