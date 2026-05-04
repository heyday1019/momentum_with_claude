import { BarChart3 } from 'lucide-react'
import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { getMyInsights, type InsightsData, type KeywordStat } from '@/app/actions/insights'

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const

export default async function InsightsPage() {
  const data = await getMyInsights()
  const isEmpty = data.totalDays === 0

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <BackButton href="/" label="홈" />

        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            내 운세 인사이트
          </h1>
          <p className="text-sm font-bold text-fortune-charcoal">
            지금까지 본 운세 데이터에서 발견한 패턴
          </p>
        </div>

        {isEmpty ? <EmptyState /> : (
          <>
            <SummarySection data={data} />
            <KeywordsSection items={data.topKeywords} />
            <WeekdaySection counts={data.byWeekday} />
          </>
        )}
      </section>
    </main>
  )
}

function SummarySection({ data }: { data: InsightsData }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">사용 요약</h2>
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="총 운세 일수" value={`${data.totalDays}일`} accent="bg-[#FFF5F4]" />
        <SummaryCard label="연속 일수" value={`${data.currentStreak}일`} accent="bg-[#F2F7FC]" />
        <SummaryCard
          label="첫 방문"
          value={data.firstSeenDate ? formatShortDate(data.firstSeenDate) : '-'}
          accent="bg-[#FFFAE5]"
        />
        <SummaryCard
          label="연속 신호"
          value={data.currentStreak >= 3 ? '🔥 활활' : data.currentStreak === 0 ? '오늘 보기' : '진행 중'}
          accent="bg-[#F4ECDD]"
        />
      </div>
    </section>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-2xl border border-fortune-hairline-soft p-4 flex flex-col gap-1 ${accent}`}>
      <span className="text-xs font-bold text-fortune-charcoal">{label}</span>
      <span className="text-2xl font-medium text-fortune-ink-deep leading-tight">{value}</span>
    </div>
  )
}

function KeywordsSection({ items }: { items: KeywordStat[] }) {
  if (items.length === 0) {
    return null
  }
  const max = Math.max(...items.map(i => i.count))
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">자주 나온 키워드 TOP {items.length}</h2>
      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-3">
        {items.map(({ keyword, count }) => (
          <div key={keyword} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-bold text-fortune-ink-deep">{keyword}</span>
            <div className="flex-1 h-3 rounded-full bg-fortune-surface-soft overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(count / max) * 100}%`,
                  background: 'linear-gradient(90deg, #FFD600 0%, #FFAA00 100%)',
                }}
              />
            </div>
            <span className="w-10 text-right text-sm font-bold text-fortune-charcoal">{count}회</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function WeekdaySection({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">요일별 운세 본 빈도</h2>
      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex items-end justify-between gap-2 h-44">
        {counts.map((c, i) => {
          const heightPct = (c / max) * 100
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
              <span className="text-[10px] font-bold text-fortune-charcoal">{c || ''}</span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(heightPct, c > 0 ? 6 : 2)}%`,
                  background: c > 0
                    ? 'linear-gradient(180deg, #94BFE8 0%, #5C8AC0 100%)'
                    : 'rgba(20,22,26,0.06)',
                }}
              />
              <span className="text-xs font-bold text-fortune-ink">{WEEKDAY_LABELS[i]}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-surface-soft p-8 flex flex-col items-center gap-3 text-center">
      <span className="size-12 rounded-full bg-fortune-canvas inline-flex items-center justify-center">
        <BarChart3 className="size-5 text-fortune-steel" />
      </span>
      <p className="text-base font-bold text-fortune-ink-deep">아직 분석할 데이터가 없어요</p>
      <p className="text-sm text-fortune-steel leading-relaxed">
        홈에서 오늘의 운세를 한 번 보시면<br />
        쌓인 데이터로 인사이트를 보여드려요.
      </p>
    </div>
  )
}

function formatShortDate(yyyyMmDd: string): string {
  const [, m, d] = yyyyMmDd.split('-')
  return `${Number(m)}/${Number(d)}`
}
