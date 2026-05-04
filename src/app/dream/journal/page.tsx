import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { DreamJournalList } from '@/components/fortune/dream-journal-list'
import { getMyDreamJournal } from '@/app/actions/dream-journal'

export default async function DreamJournalPage() {
  const entries = await getMyDreamJournal()

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-5 px-4 py-6">
        <BackButton href="/dream" label="꿈 해몽" />

        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            꿈 일기
          </h1>
          <p className="text-sm font-bold text-fortune-charcoal">
            지금까지 풀이한 꿈들 — 최대 100건
          </p>
        </div>

        <DreamJournalList entries={entries} />
      </section>
    </main>
  )
}
