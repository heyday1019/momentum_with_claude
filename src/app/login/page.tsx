import Link from 'next/link'
import { KakaoButton, GoogleButton } from '@/components/fortune/auth-button'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="relative h-[60vh] flex items-end p-6 pb-10 rounded-b-[32px] overflow-hidden bg-gradient-to-b from-fortune-charcoal to-fortune-ink-deep">
        <div className="flex flex-col gap-3 z-10">
          <h1 className="text-4xl font-medium text-fortune-canvas leading-tight tracking-tight">
            오늘의 나,<br />가볍게 들여다보세요
          </h1>
          <p className="text-base text-fortune-canvas/90 leading-normal max-w-[320px]">
            매일 자정에 새 운세가 도착해요. 친한 멘토가 옆에서 짚어주듯, 따뜻하게.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-6 pt-8">
        <KakaoButton />
        <GoogleButton />
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-fortune-hairline-soft" />
          <span className="text-xs text-fortune-steel">또는</span>
          <div className="flex-1 h-px bg-fortune-hairline-soft" />
        </div>
        <Link
          href="/login/email"
          className="h-[50px] rounded-full border-2 border-fortune-ink-deep flex items-center justify-center text-sm font-bold text-fortune-ink-deep"
        >
          이메일로 로그인
        </Link>
      </div>
    </main>
  )
}
