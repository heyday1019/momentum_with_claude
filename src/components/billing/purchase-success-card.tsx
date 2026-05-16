import Link from 'next/link'
import { CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  creditsAdded: number | null
  newBalance: number
}

export function PurchaseSuccessCard({ creditsAdded, newBalance }: Props) {
  return (
    <article className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-10 text-center">
      <CircleCheck className="size-16 text-fortune-success" />
      <h1 className="text-[28px] sm:text-[36px] leading-[1.28] font-medium text-fortune-ink-deep">
        {creditsAdded != null ? '충전이 완료됐어요' : '결제 확인 중이에요'}
      </h1>
      {creditsAdded != null && (
        <p className="text-2xl font-light text-fortune-charcoal">+{creditsAdded} 크레딧 적립</p>
      )}
      <p className="text-base text-fortune-ink">현재 잔액: {newBalance} 크레딧</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="pillSm" className="bg-fortune-ink-deep text-fortune-canvas hover:bg-fortune-charcoal">
          <Link href="/">운세 보러 가기</Link>
        </Button>
        <Button asChild size="pillSm" variant="ghostInk">
          <Link href="/billing">충전 페이지로</Link>
        </Button>
      </div>
    </article>
  )
}
