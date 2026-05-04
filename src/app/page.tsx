import { Suspense } from 'react'
import Link from 'next/link'
import { Users, ArrowRight, Sparkles } from 'lucide-react'
import { AppHeader } from '@/components/fortune/app-header'
import { CardSkeleton } from '@/components/fortune/card-skeleton'
import { FortuneCardDaily } from '@/components/fortune/fortune-card-daily'
import { FortuneCardZodiac } from '@/components/fortune/fortune-card-zodiac'
import { FortuneCardLotto } from '@/components/fortune/fortune-card-lotto'
import { getDailyFortune, getZodiacFortune, getLottoRec } from '@/app/actions/fortune'
import { getMyProfile } from '@/app/actions/profile'

export default async function HomePage() {
  const profile = await getMyProfile()
  const today = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'Asia/Seoul',
  }).format(new Date())

  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-5 px-4 py-6">
        <div className="flex flex-col gap-1 pb-1">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            {profile?.name}님, 오늘의 운세예요
          </h1>
          <p className="text-sm text-fortune-steel">{today}</p>
        </div>
        <Suspense fallback={<CardSkeleton />}><DailyCard /></Suspense>
        <Suspense fallback={<CardSkeleton />}><ZodiacCard /></Suspense>
        <Suspense fallback={<CardSkeleton />}><LottoCard /></Suspense>

        <Link
          href="/tarot"
          className="rounded-[32px] p-6 flex items-center gap-4 mt-2 text-fortune-canvas"
          style={{ backgroundImage: 'linear-gradient(135deg, #14161A 0%, #2D3035 100%)' }}
        >
          <span className="size-12 rounded-full bg-white/10 inline-flex items-center justify-center shrink-0">
            <Sparkles className="size-5" />
          </span>
          <span className="flex-1 flex flex-col gap-0.5">
            <span className="text-base font-bold">오늘의 타로 3장</span>
            <span className="text-sm opacity-70">과거 · 현재 · 미래의 흐름 보기</span>
          </span>
          <ArrowRight className="size-5 opacity-70" />
        </Link>

        <Link
          href="/lookup"
          className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-surface-soft p-6 flex items-center gap-4"
        >
          <span className="size-12 rounded-full bg-fortune-canvas inline-flex items-center justify-center shrink-0">
            <Users className="size-5 text-fortune-primary-deep" />
          </span>
          <span className="flex-1 flex flex-col gap-0.5">
            <span className="text-base font-bold text-fortune-ink-deep">친구·가족 운세 보기</span>
            <span className="text-sm text-fortune-steel">이름과 생일만 알면 OK</span>
          </span>
          <ArrowRight className="size-5 text-fortune-steel" />
        </Link>
      </section>
    </main>
  )
}

async function DailyCard() {
  try {
    const data = await getDailyFortune()
    return <FortuneCardDaily data={data} />
  } catch (e) {
    console.error('[DailyCard] failed:', e)
    return <ErrorCard label="오늘의 운세" />
  }
}
async function ZodiacCard() {
  try {
    const data = await getZodiacFortune()
    return <FortuneCardZodiac data={data} />
  } catch (e) {
    console.error('[ZodiacCard] failed:', e)
    return <ErrorCard label="띠 · 별자리" />
  }
}
async function LottoCard() {
  try {
    const data = await getLottoRec()
    return <FortuneCardLotto data={data} />
  } catch (e) {
    console.error('[LottoCard] failed:', e)
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
