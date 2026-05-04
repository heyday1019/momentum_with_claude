'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { drawThreeCards, serializeDraws } from '@/lib/tarot/draw'

export function TarotDrawButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = () => {
    const draws = drawThreeCards()
    const param = serializeDraws(draws)
    startTransition(() => router.push(`/tarot/result?d=${encodeURIComponent(param)}`))
  }

  return (
    <Button
      onClick={onClick}
      disabled={isPending}
      variant="buyCta"
      size="pill"
      className="w-full"
    >
      <Sparkles className="size-4" />
      {isPending ? '카드를 펼치는 중...' : '카드 뽑기'}
    </Button>
  )
}
