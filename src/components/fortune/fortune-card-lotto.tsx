import { Ticket } from 'lucide-react'
import { FortuneCard } from './fortune-card'
import { LottoNumberChip } from './lotto-number-chip'
import type { LottoResult } from '@/lib/fortune/types'

export function FortuneCardLotto({ data }: { data: LottoResult }) {
  return (
    <FortuneCard
      title="행운의 로또번호"
      accentBg="bg-[#FFF4D6]"
      icon={<Ticket className="size-[18px] text-[#80531C]" />}
      collapsedPreview={
        <>
          <span className="text-sm text-fortune-steel">{data.draw_number}회차 추천</span>
          <div className="flex gap-2 flex-wrap">
            {data.numbers.map(n => <LottoNumberChip key={n} n={n} />)}
          </div>
        </>
      }
      expandedContent={
        <>
          <span className="text-sm text-fortune-steel">{data.draw_number}회차 추천</span>
          <div className="flex gap-2 flex-wrap">
            {data.numbers.map(n => <LottoNumberChip key={n} n={n} />)}
          </div>
          <p className="text-base text-fortune-charcoal leading-relaxed">{data.comment}</p>
          <span className="text-xs text-fortune-stone">다음 추첨 후 새 번호로 갱신</span>
        </>
      }
    />
  )
}
