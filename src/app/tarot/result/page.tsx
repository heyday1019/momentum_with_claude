import { Suspense } from 'react'
import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { ShareButton } from '@/components/fortune/share-button'
import { TarotCardDisplay } from '@/components/fortune/tarot-card'
import { TarotDrawButton } from '@/components/fortune/tarot-draw-button'
import { deserializeDraws, serializeDraws } from '@/lib/tarot/draw'
import { THREE_CARD_POSITIONS, ONE_CARD_POSITIONS, POSITION_LABELS, type DrawnCard } from '@/lib/tarot/types'
import {
  getTarotReading, getTarotOneCardReading,
  type TarotInterpretation, type TarotOneCardInterpretation,
} from '@/app/actions/tarot'
import { isInsufficient } from '@/lib/billing/consume'
import { NeedsCreditsCard } from '@/components/billing/needs-credits-card'

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

  const isOneCard = draws.length === 1
  const positions = isOneCard ? ONE_CARD_POSITIONS : THREE_CARD_POSITIONS

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <BackButton href="/tarot" label="타로 메인" />

        <h1 className="text-[24px] font-medium leading-tight text-fortune-ink-deep">
          {isOneCard ? '오늘의 카드' : '뽑힌 카드 3장'}
        </h1>

        <div className={isOneCard ? 'flex justify-center' : 'grid grid-cols-3 gap-3'}>
          {draws.map((drawn, i) => (
            <div key={drawn.card.id} className={isOneCard ? 'w-2/3 max-w-[260px]' : ''}>
              <TarotCardDisplay drawn={drawn} position={positions[i]} />
            </div>
          ))}
        </div>

        <Suspense fallback={<ReadingSkeleton />}>
          {isOneCard
            ? <OneCardReadingSection draws={draws} />
            : <ThreeCardReadingSection draws={draws} />
          }
        </Suspense>

        <TarotDrawButton spread={isOneCard ? 'one' : 'three'} />
      </section>
    </main>
  )
}

async function ThreeCardReadingSection({ draws }: { draws: DrawnCard[] }) {
  let reading: TarotInterpretation
  try {
    reading = await getTarotReading(draws)
  } catch (e) {
    if (isInsufficient(e)) return <NeedsCreditsCard label="타로 3장 해석" />
    console.error('[tarot/result/three] reading failed:', e)
    return <ReadingError />
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

      {THREE_CARD_POSITIONS.map((pos, i) => (
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
          <p className="text-base text-fortune-ink leading-relaxed">
            {pos === 'past' && reading.interpretation.past}
            {pos === 'present' && reading.interpretation.present}
            {pos === 'future' && reading.interpretation.future}
          </p>
        </div>
      ))}

      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-1">
        <span className="text-xs font-bold text-fortune-steel">통합 메시지</span>
        <p className="text-base text-fortune-ink-deep leading-relaxed">{reading.summary}</p>
      </div>
    </section>
  )
}

async function OneCardReadingSection({ draws }: { draws: DrawnCard[] }) {
  let reading: TarotOneCardInterpretation
  try {
    reading = await getTarotOneCardReading(draws)
  } catch (e) {
    if (isInsufficient(e)) return <NeedsCreditsCard label="오늘의 타로" />
    console.error('[tarot/result/one] reading failed:', e)
    return <ReadingError />
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
          title="오늘의 타로 카드"
          text={`오늘의 타로 · ${reading.headline}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="inline-flex rounded-full bg-fortune-warning px-2.5 py-0.5 text-xs font-bold text-fortune-ink-deep">
            오늘
          </span>
          <span className="text-sm font-bold text-fortune-ink">{draws[0].card.name_kr}</span>
          <span className="text-xs text-fortune-stone">
            {draws[0].orientation === 'upright' ? '정방향' : '역방향'}
          </span>
        </div>
        <p className="text-base text-fortune-ink leading-relaxed">{reading.interpretation}</p>
      </div>

      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-1">
        <span className="text-xs font-bold text-fortune-steel">오늘의 조언</span>
        <p className="text-base text-fortune-ink-deep leading-relaxed">{reading.advice}</p>
      </div>
    </section>
  )
}

function ReadingError() {
  return (
    <section className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-5 flex flex-col gap-2">
      <span className="text-base font-bold text-fortune-ink-deep">해석을 불러오지 못했어요</span>
      <span className="text-sm text-fortune-charcoal">잠시 후 다시 시도해주세요.</span>
    </section>
  )
}

function ReadingSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <div className="h-20 rounded-2xl bg-fortune-surface-soft animate-pulse" />
      <div className="h-24 rounded-lg bg-fortune-surface-soft animate-pulse" />
      <div className="h-24 rounded-lg bg-fortune-surface-soft animate-pulse" />
    </section>
  )
}
