import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCreditBalance } from '@/lib/billing/balance'
import { CreditPackageCard } from '@/components/billing/credit-package-card'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const balance = await getCreditBalance(supabase, user.id)

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] sm:text-[48px] leading-[1.17] font-medium text-fortune-ink-deep">
            크레딧 충전
          </h1>
          <p className="text-base sm:text-lg leading-[1.44] text-fortune-charcoal">
            AI 운세 호출 1회당 크레딧 1개가 사용돼요.
          </p>
        </div>
        <div className="rounded-full bg-fortune-surface-soft px-4 py-2 text-sm font-bold text-fortune-ink-deep">
          현재 잔액 {balance} 크레딧
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <CreditPackageCard sku="small"  price="$1.99" />
        <CreditPackageCard sku="medium" price="$7.99" discountLabel="-20% off" featured />
        <CreditPackageCard sku="large"  price="$24.99" discountLabel="-37% off" />
      </section>

      <footer className="text-xs text-fortune-steel">
        Sandbox 테스트: 카드번호 4242 4242 4242 4242 · 어떤 미래 만료일·CVC도 OK
      </footer>
    </main>
  )
}
