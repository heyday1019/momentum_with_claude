import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { DreamForm } from '@/components/fortune/dream-form'

export default function DreamPage() {
  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <BackButton href="/" label="홈" />

        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            꿈 해몽
          </h1>
          <p className="text-base font-bold text-fortune-ink leading-relaxed">
            어젯밤 꾼 꿈을 적어주시면<br />
            등장한 상징과 흐름을 풀어드릴게요.
          </p>
        </div>

        <DreamForm />
      </section>
    </main>
  )
}
