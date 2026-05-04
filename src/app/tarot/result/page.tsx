import { Suspense } from 'react'
import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { ShareButton } from '@/components/fortune/share-button'
import { TarotCardDisplay } from '@/components/fortune/tarot-card'
import { TarotDrawButton } from '@/components/fortune/tarot-draw-button'
import { deserializeDraws, serializeDraws } from '@/lib/tarot/draw'
import { SPREAD_POSITIONS, POSITION_LABELS, type DrawnCard } from '@/lib/tarot/types'
import { getTarotReading, type TarotInterpretation } from '@/app/actions/tarot'

interface PageProps {
  searchParams: Promise<{ d?: string }>
}

export default async function TarotResultPage({ searchParams }: PageProps) {
  const { d } = await searchParams
  const draws = d ? deserializeDraws(d) : null

  if (!draws) {
    return (
      <main className="flex min-h-screen flex-col bg-fortune-canvas">
        <AppHeader />
        <section className="flex flex-col gap-5 px-4 py-6">
          <h1 className="text-[24px] font-medium text-fortune-ink-deep">결과를 불러올 수 없어요</h1>
          <p className="text-sm text-fortune-steel">카드 정보가 올바르지 않아요. 다시 뽑아주세요.</p>
          <TarotDrawButton />
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <BackButton href="/tarot" label="타로 메인" />

        <h1 className="text-[24px] font-medium leading-tight text-fortune-ink-deep">
          뽑힌 카드 3장
        </h1>

        <div className="grid grid-cols-3 gap-3">
          {draws.map((drawn, i) => (
            <TarotCardDisplay key={drawn.card.id} drawn={drawn} position={SPREAD_POSITIONS[i]} />
          ))}
        </div>

        <Suspense fallback={<ReadingSkeleton />}>
          <ReadingSection draws={draws} />
        </Suspense>

        <TarotDrawButton />
      </section>
    </main>
  )
}

async function ReadingSection({ draws }: { draws: DrawnCard[] }) {
  let reading: TarotInterpretation
  try {
    reading = await getTarotReading(draws)
  } catch (e) {
    console.error('[tarot/result] reading failed:', e)
    return (
      <section className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-5 flex flex-col gap-2">
        <span className="text-base font-bold text-fortune-ink-deep">해석을 불러오지 못했어요</span>
        <span className="text-sm text-fortune-charcoal">잠시 후 다시 시도해주세요.</span>
      </section>
    )
  }

  const shareUrl = `/api/og/tarot?d=${encodeURIComponent(serializeDraws(draws))}&h=${encodeURIComponent(reading.headline)}`

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl bg-fortune-surface-soft p-5 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-xs font-bold text-fortune-steel">오늘의 메시지</span>
          <p className="text-lg font-medium text-fortune-ink-deep leading-snug">{reading.headline}</p>
        </div>
        <ShareButton
          imageUrl={shareUrl}
          title="오늘의 타로 3장"
          text={`타로 3장 · ${reading.headline}`}
        />
      </div>

      {SPREAD_POSITIONS.map((pos, i) => (
        <div key={pos} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="inline-flex rounded-full bg-fortune-warning px-2.5 py-0.5 text-xs font-bold text-fortune-ink-deep">
              {POSITION_LABELS[pos]}
            </span>
            <span className="text-sm font-bold text-fortune-ink">{draws[i].card.name_kr}</span>
            <span className="text-xs text-fortune-stone">
              {draws[i].orientation === 'upright' ? '정방향' : '역방향'}
            </span>
          </div>
          <p className="text-base text-fortune-ink leading-relaxed">{reading.interpretation[pos]}</p>
        </div>
      ))}

      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-1">
        <span className="text-xs font-bold text-fortune-steel">통합 메시지</span>
        <p className="text-base text-fortune-ink-deep leading-relaxed">{reading.summary}</p>
      </div>
    </section>
  )
}

function ReadingSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <div className="h-20 rounded-2xl bg-fortune-surface-soft animate-pulse" />
      <div className="h-24 rounded-lg bg-fortune-surface-soft animate-pulse" />
      <div className="h-24 rounded-lg bg-fortune-surface-soft animate-pulse" />
      <div className="h-24 rounded-lg bg-fortune-surface-soft animate-pulse" />
    </section>
  )
}
