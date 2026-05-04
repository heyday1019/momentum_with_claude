import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/fortune/app-header'
import { TarotDrawButton } from '@/components/fortune/tarot-draw-button'

export default function TarotEntryPage() {
  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-bold text-fortune-steel w-fit"
        >
          <ArrowLeft className="size-4" />
          홈
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            궁금한 미래를 떠올리며
          </h1>
          <p className="text-base text-fortune-ink leading-relaxed">
            마음 속에 질문 하나를 그려보고,<br />
            카드 3장을 뽑아보세요.
          </p>
        </div>

        <div
          className="rounded-[32px] aspect-[3/4] flex flex-col items-center justify-center gap-3 p-6"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #2D3035 0%, #14161A 100%)',
          }}
        >
          <CardBackTriple />
        </div>

        <TarotDrawButton />

        <p className="text-xs text-fortune-stone leading-relaxed text-center">
          매번 새로운 무작위 결과예요. 결과는 저장되지 않아요.
        </p>
      </section>
    </main>
  )
}

function CardBackTriple() {
  return (
    <div className="flex gap-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="aspect-[5/9] w-16 rounded-xl border border-white/10 flex items-center justify-center"
          style={{
            background:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 6px)',
          }}
        >
          <span className="text-white/30 text-2xl font-light">★</span>
        </div>
      ))}
    </div>
  )
}
