'use client'

import { useState } from 'react'
import { TarotDrawButton } from './tarot-draw-button'
import type { SpreadType } from '@/lib/tarot/types'

const OPTIONS: Array<{ value: SpreadType; label: string; sub: string }> = [
  { value: 'three', label: '3장 스프레드', sub: '과거 · 현재 · 미래' },
  { value: 'one',   label: '오늘의 카드',   sub: '하루의 핵심 한 장' },
]

export function TarotSpreadPicker() {
  const [spread, setSpread] = useState<SpreadType>('three')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(opt => {
          const active = spread === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSpread(opt.value)}
              className={
                'rounded-xl px-3 py-3 flex flex-col items-start gap-0.5 text-left ' +
                (active
                  ? 'border-2 border-fortune-primary-deep bg-fortune-canvas'
                  : 'border border-fortune-hairline bg-fortune-surface-soft')
              }
            >
              <span className={'text-sm font-bold ' + (active ? 'text-fortune-ink-deep' : 'text-fortune-ink')}>
                {opt.label}
              </span>
              <span className="text-xs font-bold text-fortune-charcoal">{opt.sub}</span>
            </button>
          )
        })}
      </div>

      <TarotDrawButton spread={spread} />
    </div>
  )
}
