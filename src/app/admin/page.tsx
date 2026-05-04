import { notFound } from 'next/navigation'
import { Shield } from 'lucide-react'
import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { getAdminStats, type AdminStats } from '@/app/actions/admin'
import { DREAM_PERSONAS } from '@/lib/fortune/dream-personas'

const FEATURE_LABELS: Record<string, string> = {
  daily: '오늘의 운세',
  zodiac: '띠 · 별자리',
  lotto: '로또',
  tarot_three: '타로 3장',
  tarot_one: '타로 1장',
  dream: '꿈 해몽',
}

export default async function AdminPage() {
  const res = await getAdminStats()
  if (!res.ok) notFound()
  const data = res.data

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <BackButton href="/" label="홈" />

        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-2">
            <span className="size-7 rounded-full bg-fortune-ink-deep inline-flex items-center justify-center">
              <Shield className="size-4 text-fortune-canvas" />
            </span>
            <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
              관리자 대시보드
            </h1>
          </div>
          <p className="text-sm font-bold text-fortune-charcoal">
            전체 사용자 활동 + AI 호출 통계
          </p>
        </div>

        <SummaryGrid data={data} />
        <PersonaSection items={data.personaPreference} />
        <ModelSection items={data.callsByModel} />
        <FeatureSection items={data.callsByFeature} />
        <RecentSection items={data.recentCalls} />
      </section>
    </main>
  )
}

function SummaryGrid({ data }: { data: AdminStats }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">전체 요약</h2>
      <div className="grid grid-cols-3 gap-2.5">
        <SummaryCard label="가입자" value={`${data.totalUsers}명`} accent="bg-[#F2F7FC]" />
        <SummaryCard label="AI 호출" value={`${data.totalCalls}회`} accent="bg-[#FFF5F4]" />
        <SummaryCard label="총 토큰" value={formatTokens(data.totalTokens)} accent="bg-[#FFFAE5]" />
      </div>
    </section>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-2xl border border-fortune-hairline-soft p-3.5 flex flex-col gap-0.5 ${accent}`}>
      <span className="text-[11px] font-bold text-fortune-charcoal">{label}</span>
      <span className="text-xl font-medium text-fortune-ink-deep leading-tight">{value}</span>
    </div>
  )
}

function PersonaSection({ items }: { items: AdminStats['personaPreference'] }) {
  if (items.length === 0) return null
  const total = items.reduce((s, i) => s + i.count, 0)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">꿈 해몽 페르소나 선호도 (전체)</h2>
      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-3">
        {DREAM_PERSONAS.map(p => {
          const item = items.find(i => i.persona === p.key)
          const count = item?.count ?? 0
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={p.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-bold text-fortune-ink-deep">{p.label}</span>
              <div className="flex-1 h-3 rounded-full bg-fortune-surface-soft overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #5C3FB8 0%, #9577E0 100%)',
                  }}
                />
              </div>
              <span className="w-20 text-right text-xs font-bold text-fortune-charcoal">
                {count}회 · {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
        <p className="text-xs font-bold text-fortune-stone text-center pt-1">총 {total}회 풀이</p>
      </div>
    </section>
  )
}

function ModelSection({ items }: { items: AdminStats['callsByModel'] }) {
  if (items.length === 0) return null
  const maxTokens = Math.max(...items.map(i => i.tokens), 1)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">모델별 토큰 사용량</h2>
      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-3">
        {items.map(({ model, count, tokens }) => (
          <div key={model} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-fortune-ink-deep truncate">{model}</span>
              <span className="text-xs font-bold text-fortune-charcoal shrink-0">
                {count}회 · {formatTokens(tokens)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-fortune-surface-soft overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(tokens / maxTokens) * 100}%`,
                  background: 'linear-gradient(90deg, #1B7D6E 0%, #5BC4B0 100%)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeatureSection({ items }: { items: AdminStats['callsByFeature'] }) {
  if (items.length === 0) return null
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">기능별 AI 호출</h2>
      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-3">
        {items.map(({ feature, count }) => (
          <div key={feature} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm font-bold text-fortune-ink-deep">
              {FEATURE_LABELS[feature] ?? feature}
            </span>
            <div className="flex-1 h-3 rounded-full bg-fortune-surface-soft overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(count / max) * 100}%`,
                  background: 'linear-gradient(90deg, #B83056 0%, #E89AAA 100%)',
                }}
              />
            </div>
            <span className="w-12 text-right text-xs font-bold text-fortune-charcoal">{count}회</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function RecentSection({ items }: { items: AdminStats['recentCalls'] }) {
  if (items.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fortune-ink-deep">최근 AI 호출 (20건)</h2>
      <div className="rounded-2xl border border-fortune-hairline-soft overflow-hidden">
        <ul className="divide-y divide-fortune-hairline-soft">
          {items.map(c => (
            <li key={c.id} className="p-3 flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-fortune-ink-deep">
                  {FEATURE_LABELS[c.feature] ?? c.feature}
                  {c.persona && <span className="text-fortune-charcoal"> · {c.persona}</span>}
                </span>
                <span className="text-[10px] font-bold text-fortune-stone shrink-0">
                  {formatRelative(c.created_at)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-fortune-charcoal truncate">{c.model}</span>
                <span className="text-[11px] font-bold text-fortune-charcoal shrink-0">
                  {c.total_tokens ? `${c.total_tokens} tok` : '-'}
                </span>
              </div>
              <span className="text-[10px] text-fortune-stone font-mono truncate">
                {c.user_id.slice(0, 8)}…
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const m = Math.floor(diffMs / 60_000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}
