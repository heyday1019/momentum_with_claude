import { Sparkles, Heart, Banknote, Activity, Briefcase, Star } from 'lucide-react'
import { FortuneCard } from './fortune-card'
import { ShareButton } from './share-button'
import type { DailyContent } from '@/lib/fortune/types'

const CATEGORIES: Array<[keyof DailyContent['categories'], string, React.ComponentType<{ className?: string }>, string]> = [
  ['love', '애정', Heart, 'text-fortune-critical'],
  ['money', '금전', Banknote, 'text-fortune-success'],
  ['health', '건강', Activity, 'text-fortune-fb-blue'],
  ['work', '일', Briefcase, 'text-[#6B46C1]'],
]

export function FortuneCardDaily({ data }: { data: DailyContent }) {
  return (
    <FortuneCard
      title="오늘의 운세"
      accentBg="bg-[#FFE3E1]"
      cardBg="bg-[#FFF5F4]"
      icon={<Sparkles className="size-[18px] text-fortune-critical-strong" />}
      toolbar={
        <ShareButton
          imageUrl="/api/og/daily"
          title="오늘의 운세"
          text={`오늘의 운세 · ${data.headline} · 키워드 ${data.lucky_keyword}`}
        />
      }
      collapsedPreview={
        <>
          <p className="text-lg font-medium text-fortune-ink leading-snug">{data.headline}</p>
          <KeywordBadge keyword={data.lucky_keyword} />
        </>
      }
      expandedContent={
        <>
          <p className="text-lg font-medium text-fortune-ink-deep leading-snug">{data.headline}</p>
          <p className="text-base text-fortune-ink leading-relaxed">{data.body}</p>
          <div className="flex flex-col gap-2.5 py-3">
            {CATEGORIES.map(([key, label, Icon, iconColor]) => (
              <div key={key} className="flex gap-3 items-start">
                <span className="size-8 rounded-full bg-fortune-surface-soft inline-flex items-center justify-center shrink-0">
                  <Icon className={`size-4 ${iconColor}`} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-fortune-ink">{label}</span>
                  <span className="text-sm text-fortune-charcoal leading-relaxed">{data.categories[key]}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <KeywordBadge keyword={data.lucky_keyword} />
            <span className="text-xs text-fortune-stone">내일 자정 갱신</span>
          </div>
        </>
      }
    />
  )
}

function KeywordBadge({ keyword }: { keyword: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-fortune-warning px-2.5 py-1 self-start">
      <Star className="size-3 text-fortune-ink-deep" />
      <span className="text-xs font-bold text-fortune-ink-deep">오늘의 키워드 · {keyword}</span>
    </span>
  )
}
