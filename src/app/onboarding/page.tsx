import { ProfileForm } from '@/components/fortune/profile-form'

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col p-6 pt-10 gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-medium leading-tight text-fortune-ink-deep">
          잠깐, 당신을 알려주세요
        </h1>
        <p className="text-base text-fortune-charcoal leading-relaxed">
          운세를 정확히 보기 위한 기본 정보예요. 한 번만 알려주시면 돼요.
        </p>
      </header>
      <ProfileForm ctaLabel="시작하기" redirectAfter="/" />
    </main>
  )
}
