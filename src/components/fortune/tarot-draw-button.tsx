'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { drawThreeCards, drawOneCard, serializeDraws } from '@/lib/tarot/draw'
import type { SpreadType } from '@/lib/tarot/types'

interface Props {
  spread?: SpreadType
}

export function TarotDrawButton({ spread = 'three' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = () => {
    const draws = spread === 'one' ? drawOneCard() : drawThreeCards()
    const param = serializeDraws(draws)
    startTransition(() => router.push(`/tarot/result?d=${encodeURIComponent(param)}`))
  }

  const label = spread === 'one' ? '오늘의 카드 1장 뽑기' : '카드 3장 뽑기'

  return (
    <Button
      onClick={onClick}
      disabled={isPending}
      variant="buyCta"
      size="pill"
      className="w-full"
    >
      <Sparkles className="size-4" />
      {isPending ? '카드를 펼치는 중...' : label}
    </Button>
  )
}
