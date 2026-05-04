import Link from 'next/link'
import { User } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft bg-fortune-canvas">
      <Link href="/" aria-label="홈" className="text-lg font-bold tracking-tight text-fortune-ink-deep">
        운세
      </Link>
      <Link href="/me" className="size-11 rounded-full inline-flex items-center justify-center" aria-label="내 정보">
        <User className="size-5.5 text-fortune-ink-deep" />
      </Link>
    </header>
  )
}
