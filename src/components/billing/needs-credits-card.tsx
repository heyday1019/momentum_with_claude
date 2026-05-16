import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface Props {
  label: string
}

export function NeedsCreditsCard({ label }: Props) {
  return (
    <section className="rounded-[32px] border border-fortune-primary/40 bg-fortune-primary-soft/15 p-6 flex flex-col gap-3">
      <header className="flex items-center gap-2.5">
        <span className="size-9 rounded-full inline-flex items-center justify-center bg-fortune-primary/15 text-fortune-primary-deep">
          <Sparkles className="size-5" />
        </span>
        <span className="text-2xl font-medium text-fortune-ink-deep">{label}</span>
      </header>
      <p className="text-sm text-fortune-charcoal">
        크레딧이 부족해서 새 해석을 불러올 수 없어요. 충전하면 바로 이어서 볼 수 있어요.
      </p>
      <Link
        href="/billing"
        className="inline-flex w-fit items-center rounded-full bg-fortune-primary px-5 py-2.5 text-sm font-bold text-fortune-canvas"
      >
        충전하러 가기
      </Link>
    </section>
  )
}
