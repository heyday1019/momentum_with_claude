import { MoonStar, Star } from 'lucide-react'
import { FortuneCard } from './fortune-card'
import { ShareButton } from './share-button'
import type { ZodiacContent } from '@/lib/fortune/types'

export function FortuneCardZodiac({ data }: { data: ZodiacContent }) {
  return (
    <FortuneCard
      title="띠 · 별자리"
      accentBg="bg-[#E6F0FA]"
      cardBg="bg-[#F2F7FC]"
      icon={<MoonStar className="size-[18px] text-fortune-primary-deep" />}
      toolbar={
        <ShareButton
          imageUrl="/api/og/zodiac"
          title="띠 · 별자리 운세"
          text={`${data.zodiac_animal}띠 · ${data.zodiac_sign} · ${data.headline}`}
        />
      }
      collapsedPreview={
        <>
          <div className="flex gap-1.5">
            <Pill text={`${data.zodiac_animal}띠`} />
            <Pill text={data.zodiac_sign} />
          </div>
          <p className="text-lg font-medium text-fortune-ink leading-snug">{data.headline}</p>
        </>
      }
      expandedContent={
        <>
          <div className="flex gap-1.5">
            <Pill text={`${data.zodiac_animal}띠`} />
            <Pill text={data.zodiac_sign} />
          </div>
          <p className="text-lg font-medium text-fortune-ink-deep leading-snug">{data.headline}</p>
          <p className="text-base text-fortune-ink leading-relaxed">{data.body}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fortune-warning px-2.5 py-1">
              <Star className="size-3 text-fortune-ink-deep" />
              <span className="text-xs font-bold text-fortune-ink-deep">오늘의 키워드 · {data.lucky_keyword}</span>
            </span>
            <span className="text-xs text-fortune-stone">내일 자정 갱신</span>
          </div>
        </>
      }
    />
  )
}

function Pill({ text }: { text: string }) {
  return (
    <span className="inline-flex rounded-full border border-fortune-hairline-soft bg-fortune-surface-soft px-2.5 py-1 text-xs font-bold text-fortune-ink">{text}</span>
  )
}
