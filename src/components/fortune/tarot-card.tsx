import Image from 'next/image'
import type { DrawnCard, SpreadPosition } from '@/lib/tarot/types'
import { POSITION_LABELS } from '@/lib/tarot/types'
import { tarotImageSrc } from '@/lib/tarot/deck'

interface Props {
  drawn: DrawnCard
  position: SpreadPosition
}

export function TarotCardDisplay({ drawn, position }: Props) {
  const isReversed = drawn.orientation === 'reversed'
  const src = tarotImageSrc(drawn.card)

  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className="inline-flex rounded-full bg-fortune-surface-soft px-2.5 py-1 text-[11px] font-bold text-fortune-ink">
        {POSITION_LABELS[position]}
      </span>

      <div
        className="relative aspect-[5/8] w-full overflow-hidden rounded-2xl border border-fortune-hairline-soft bg-fortune-surface-soft"
        style={{ boxShadow: '0 1px 4px rgba(20,22,26,0.12)' }}
      >
        <Image
          src={src}
          alt={`${drawn.card.name_kr} (${drawn.card.name_en})`}
          fill
          sizes="(max-width: 640px) 33vw, 220px"
          className={'object-cover ' + (isReversed ? 'rotate-180' : '')}
          priority={false}
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[13px] font-bold leading-tight text-fortune-ink">
          {drawn.card.name_kr}
        </span>
        <span className="text-[10px] tracking-wider uppercase text-fortune-steel">
          {drawn.card.name_en}
        </span>
        <span
          className={
            'mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ' +
            (isReversed
              ? 'bg-fortune-attention text-fortune-canvas'
              : 'bg-fortune-success text-fortune-canvas')
          }
        >
          {isReversed ? '역방향' : '정방향'}
        </span>
      </div>
    </div>
  )
}
