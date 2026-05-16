import Link from 'next/link'
import { Settings, User } from 'lucide-react'
import { CreditBadge } from '@/components/billing/credit-badge'

export function AppHeader() {
  return (
    <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft bg-fortune-canvas">
      <Link href="/" aria-label="홈" className="text-lg font-bold tracking-tight text-fortune-ink-deep">
        운세
      </Link>
      <div className="flex items-center gap-2">
        <CreditBadge />
        <Link
          href="/settings"
          aria-label="설정"
          className="size-11 rounded-full inline-flex items-center justify-center"
        >
          <Settings className="size-5.5 text-fortune-ink-deep" />
        </Link>
        <Link
          href="/me"
          aria-label="내 정보"
          className="size-11 rounded-full inline-flex items-center justify-center"
        >
          <User className="size-5.5 text-fortune-ink-deep" />
        </Link>
      </div>
    </header>
  )
}
