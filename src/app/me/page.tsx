import Link from 'next/link'
import { ChevronLeft, Shield } from 'lucide-react'
import { ProfileForm } from '@/components/fortune/profile-form'
import { AccountActions } from '@/components/fortune/account-actions'
import { getMyProfile } from '@/app/actions/profile'
import { checkIsAdmin } from '@/app/actions/admin'

export default async function MePage() {
  const profile = await getMyProfile()
  if (!profile) return null
  const isAdmin = await checkIsAdmin()

  return (
    <main className="flex min-h-screen flex-col">
      <header className="h-15 flex items-center justify-between px-4 border-b border-fortune-hairline-soft">
        <Link href="/" className="size-11 inline-flex items-center justify-center" aria-label="뒤로">
          <ChevronLeft className="size-6 text-fortune-ink-deep" />
        </Link>
        <span className="text-base font-bold text-fortune-ink-deep">내 정보 · 설정</span>
        <span className="size-11" />
      </header>
      <section className="flex flex-col gap-6 p-6">
        <ProfileForm
          initial={{ name: profile.name, birthdate: profile.birthdate, gender: profile.gender }}
          ctaLabel="변경 사항 저장"
        />

        <hr className="border-fortune-hairline-soft" />

        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-2xl border border-fortune-ink-deep bg-fortune-ink-deep p-4 flex items-center gap-3 text-fortune-canvas"
          >
            <span className="size-10 rounded-full bg-white/15 inline-flex items-center justify-center shrink-0">
              <Shield className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">관리자 대시보드</span>
              <span className="text-xs font-bold opacity-80">전체 사용자 활동 + 토큰 통계</span>
            </div>
          </Link>
        )}

        <AccountActions />
      </section>
    </main>
  )
}
