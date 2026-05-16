import { CREDIT_PACKAGES, type CreditPackageId } from './packages'

const ENV_KEYS: Record<CreditPackageId, string> = {
  small:  'POLAR_PRODUCT_SMALL',
  medium: 'POLAR_PRODUCT_MEDIUM',
  large:  'POLAR_PRODUCT_LARGE',
}

export function deriveCreditsFromProduct(productId: string): number {
  for (const [sku, envKey] of Object.entries(ENV_KEYS) as [CreditPackageId, string][]) {
    const envValue = process.env[envKey]
    if (!envValue) throw new Error(`${envKey} is not set`)
    if (envValue === productId) return CREDIT_PACKAGES[sku].credits
  }
  throw new Error(`unknown product id: ${productId}`)
}

export function productIdFor(sku: CreditPackageId): string {
  const value = process.env[ENV_KEYS[sku]]
  if (!value) throw new Error(`${ENV_KEYS[sku]} is not set`)
  return value
}
