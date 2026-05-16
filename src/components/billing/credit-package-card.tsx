'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { CREDIT_PACKAGES, type CreditPackageId } from '@/lib/billing/packages'
import { startCheckout } from '@/app/actions/billing'

interface Props {
  sku: CreditPackageId
  price: string
  discountLabel?: string
  featured?: boolean
}

export function CreditPackageCard({ sku, price, discountLabel, featured }: Props) {
  const [pending, start] = useTransition()
  const pkg = CREDIT_PACKAGES[sku]

  const onClick = () => start(async () => { await startCheckout(sku) })

  return (
    <article
      className={[
        'relative flex flex-col gap-3 rounded-2xl bg-fortune-canvas p-6',
        'shadow-[0_1px_4px_0_rgba(20,22,26,0.3)]',
        featured ? 'border-2 border-fortune-primary' : 'border border-fortune-hairline-soft',
      ].join(' ')}
    >
      {featured && (
        <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-fortune-attention px-2.5 py-1 text-[0.75rem] font-bold text-fortune-canvas">
          Most popular
        </span>
      )}
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-fortune-ink-deep">{pkg.label}</h3>
        {discountLabel && (
          <span className="rounded-full bg-fortune-warning px-2.5 py-1 text-[0.75rem] font-bold text-fortune-ink-deep">
            {discountLabel}
          </span>
        )}
      </header>
      <div className="text-[64px] leading-[1.16] font-medium text-fortune-ink-deep">
        {pkg.credits}
      </div>
      <div className="-mt-2 text-sm text-fortune-charcoal">크레딧</div>
      <div className="text-[36px] leading-[1.28] font-medium text-fortune-ink-deep">{price}</div>

      <Button
        type="button"
        onClick={onClick}
        disabled={pending}
        variant="buyCta"
        size="pill"
        className="mt-2 w-full"
      >
        {pending ? '이동 중…' : '충전'}
      </Button>
    </article>
  )
}
