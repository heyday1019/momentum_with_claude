export const CREDIT_PACKAGES = {
  small:  { credits: 10,  label: '한 주 체험팩' },
  medium: { credits: 50,  label: '한 달 든든팩' },
  large:  { credits: 200, label: '헤비유저팩' },
} as const

export const CREDIT_PACKAGE_IDS = ['small', 'medium', 'large'] as const

export type CreditPackageId = typeof CREDIT_PACKAGE_IDS[number]
