import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/fortune/app-header'
import { CardSkeleton } from '@/components/fortune/card-skeleton'
import { FortuneCardDaily } from '@/components/fortune/fortune-card-daily'
import { FortuneCardZodiac } from '@/components/fortune/fortune-card-zodiac'
import { FortuneCardLotto } from '@/components/fortune/fortune-card-lotto'
import { LookupForm } from '@/components/fortune/lookup-form'
import { getDailyFortune, getZodiacFortune, getLottoRec } from '@/app/actions/fortune'
import { validateProfileInput } from '@/lib/fortune/validators'
import type { Gender, ProfileInput } from '@/lib/fortune/types'

interface PageProps {
  searchParams: Promise<{ name?: string; birthdate?: string; gender?: string }>
}

export default async function LookupPage({ searchParams }: PageProps) {
  const params = await searchParams
  const candidate = parseSearchParams(params)
  const validationError = candidate ? validateProfileInput(candidate) : null
  const showResult = candidate !== null && validationError === null

  const today = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'Asia/Seoul',
  }).format(new Date())

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-5 px-4 py-6">
        {showResult ? (
          <>
            <div className="flex flex-col gap-3 pb-1">
              <Link
                href="/lookup"
                className="inline-flex items-center gap-1 text-sm font-bold text-fortune-steel w-fit"
              >
                <ArrowLeft className="size-4" />
                다른 사람 검색
              </Link>
              <div className="flex flex-col gap-1">
                <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
                  {candidate.name}님의 오늘 운세
                </h1>
                <p className="text-sm text-fortune-steel">{today}</p>
              </div>
            </div>
            <Suspense fallback={<CardSkeleton />}><DailyCard viewer={candidate} /></Suspense>
            <Suspense fallback={<CardSkeleton />}><ZodiacCard viewer={candidate} /></Suspense>
            <Suspense fallback={<CardSkeleton />}><LottoCard viewer={candidate} /></Suspense>
          </>
        ) : (
          <>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-bold text-fortune-steel w-fit"
            >
              <ArrowLeft className="size-4" />
              홈
            </Link>
            <div className="flex flex-col gap-1 pb-1">
              <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
                다른 사람의 운세
              </h1>
              <p className="text-sm text-fortune-steel">친구·가족 정보를 입력하면 오늘의 운세를 보여드릴게요</p>
            </div>
            {validationError && (
              <p className="text-sm text-fortune-critical-strong">{validationError}</p>
            )}
            <LookupForm initial={candidate ?? undefined} />
          </>
        )}
      </section>
    </main>
  )
}

function parseSearchParams(p: { name?: string; birthdate?: string; gender?: string }): ProfileInput | null {
  if (!p.name || !p.birthdate || !p.gender) return null
  return { name: p.name, birthdate: p.birthdate, gender: p.gender as Gender }
}

async function DailyCard({ viewer }: { viewer: ProfileInput }) {
  try {
    const data = await getDailyFortune(viewer)
    return <FortuneCardDaily data={data} />
  } catch (e) {
    console.error('[lookup/DailyCard] failed:', e)
    return <ErrorCard label="오늘의 운세" />
  }
}
async function ZodiacCard({ viewer }: { viewer: ProfileInput }) {
  try {
    const data = await getZodiacFortune(viewer)
    return <FortuneCardZodiac data={data} />
  } catch (e) {
    console.error('[lookup/ZodiacCard] failed:', e)
    return <ErrorCard label="띠 · 별자리" />
  }
}
async function LottoCard({ viewer }: { viewer: ProfileInput }) {
  try {
    const data = await getLottoRec(viewer)
    return <FortuneCardLotto data={data} />
  } catch (e) {
    console.error('[lookup/LottoCard] failed:', e)
    return <ErrorCard label="행운의 로또번호" />
  }
}

function ErrorCard({ label }: { label: string }) {
  return (
    <section className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-canvas p-6 flex flex-col gap-2">
      <span className="text-2xl font-medium text-fortune-ink-deep">{label}</span>
      <span className="inline-flex w-fit rounded-full bg-fortune-critical px-2.5 py-1 text-xs font-bold text-fortune-canvas">잠시 후 다시 시도해주세요</span>
    </section>
  )
}
