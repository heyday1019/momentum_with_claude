import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ProfileForm } from '@/components/fortune/profile-form'
import { AccountActions } from '@/components/fortune/account-actions'
import { getMyProfile, signOut } from '@/app/actions/profile'

export default async function MePage() {
  const profile = await getMyProfile()
  if (!profile) return null

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

        <AccountActions />

        <hr className="border-fortune-hairline-soft" />

        <form action={signOut}>
          <button
            type="submit"
            className="w-full h-[50px] rounded-full border-2 border-fortune-hairline bg-fortune-canvas text-sm font-bold text-fortune-critical"
          >
            로그아웃
          </button>
        </form>
        <p className="text-xs text-fortune-stone text-center">
          v0.1.0 · 도움이 필요하면 <a href="mailto:help@momentum.app" className="underline">help@momentum.app</a>
        </p>
      </section>
    </main>
  )
}
