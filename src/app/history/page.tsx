import Link from 'next/link'
import { History } from 'lucide-react'
import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { FortuneCardDaily } from '@/components/fortune/fortune-card-daily'
import { FortuneCardZodiac } from '@/components/fortune/fortune-card-zodiac'
import { getMyHistory, type HistoryEntry } from '@/app/actions/history'
import { todayKst } from '@/lib/fortune/kst'

export default async function HistoryPage() {
  const entries = await getMyHistory()
  const today = todayKst()

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-5 px-4 py-6">
        <BackButton href="/" label="홈" />

        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            지난 운세 기록
          </h1>
          <p className="text-sm font-bold text-fortune-charcoal">최근 30일치 일일·띠별자리 운세</p>
        </div>

        {entries.length === 0 ? <EmptyState /> : (
          <div className="flex flex-col gap-6">
            {entries.map(entry => (
              <DaySection key={entry.date} entry={entry} isToday={entry.date === today} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function DaySection({ entry, isToday }: { entry: HistoryEntry; isToday: boolean }) {
  const dateLabel = formatKoreanDate(entry.date)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-bold text-fortune-ink-deep">{dateLabel}</h2>
        {isToday && (
          <span className="inline-flex rounded-full bg-fortune-warning px-2 py-0.5 text-[10px] font-bold text-fortune-ink-deep">
            오늘
          </span>
        )}
      </div>
      {entry.daily && <FortuneCardDaily data={entry.daily} />}
      {entry.zodiac && <FortuneCardZodiac data={entry.zodiac} />}
      {!entry.daily && !entry.zodiac && (
        <p className="text-sm text-fortune-stone">기록이 없어요</p>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-surface-soft p-8 flex flex-col items-center gap-3 text-center">
      <span className="size-12 rounded-full bg-fortune-canvas inline-flex items-center justify-center">
        <History className="size-5 text-fortune-steel" />
      </span>
      <p className="text-base font-bold text-fortune-ink-deep">아직 기록이 없어요</p>
      <p className="text-sm text-fortune-steel leading-relaxed">
        홈에서 오늘의 운세를 한 번 보시면<br />
        다음부터 여기에 쌓여요.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-bold text-fortune-primary-deep mt-1"
      >
        홈으로 가기
      </Link>
    </div>
  )
}

function formatKoreanDate(yyyyMmDd: string): string {
  // yyyy-mm-dd → "5월 4일 (월)"
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
    timeZone: 'UTC',
  }).format(date)
}
