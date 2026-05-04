import { AppHeader } from '@/components/fortune/app-header'
import { BackButton } from '@/components/fortune/back-button'
import { TarotSpreadPicker } from '@/components/fortune/tarot-spread-picker'

export default function TarotEntryPage() {
  return (
    <main className="flex min-h-screen flex-col bg-fortune-canvas">
      <AppHeader />
      <section className="flex flex-col gap-6 px-4 py-6">
        <BackButton href="/" label="홈" />
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">
            궁금한 미래를 떠올리며
          </h1>
          <p className="text-base font-bold text-fortune-ink leading-relaxed">
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

        <TarotSpreadPicker />

        <p className="text-xs text-fortune-stone leading-relaxed text-center">
          78장 풀덱에서 무작위로 뽑아요. 결과는 저장되지 않아요.
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
