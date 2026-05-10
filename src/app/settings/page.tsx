import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { readTheme } from '@/lib/fortune/theme'
import { signOut } from '@/app/actions/profile'
import { ThemeToggle } from '@/components/fortune/theme-toggle'

export default async function SettingsPage() {
  const theme = await readTheme()

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft">
        <Link href="/" aria-label="뒤로" className="size-11 inline-flex items-center justify-center">
          <ChevronLeft className="size-6 text-fortune-ink-deep" />
        </Link>
        <span className="text-base font-bold text-fortune-ink-deep">설정</span>
        <span className="size-11" />
      </header>

      <section className="flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-fortune-ink-deep">외관</h2>
          <div className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-4 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-fortune-ink-deep">테마</span>
              <span className="text-xs font-bold text-fortune-charcoal">디바이스마다 따로 저장돼요</span>
            </div>
            <ThemeToggle initial={theme} />
          </div>
        </div>

        <hr className="border-fortune-hairline-soft" />

        <form action={signOut} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-fortune-ink-deep">계정</h2>
          <button
            type="submit"
            className="w-full h-[50px] rounded-full border-2 border-fortune-hairline bg-fortune-canvas text-sm font-bold text-fortune-critical"
          >
            로그아웃
          </button>
        </form>

        <p className="text-xs text-fortune-stone text-center">
          v0.1.0 · 도움이 필요하면{' '}
          <a href="mailto:help@momentum.app" className="underline">help@momentum.app</a>
        </p>
      </section>
    </main>
  )
}
