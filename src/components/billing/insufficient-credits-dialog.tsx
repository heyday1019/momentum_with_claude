'use client'

import Link from 'next/link'
import { Dialog } from 'radix-ui'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
}

export function InsufficientCreditsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-6 shadow-lg"
        >
          <Dialog.Title className="text-lg font-bold text-fortune-ink-deep">
            크레딧이 부족해요
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-base leading-[1.5] text-fortune-charcoal">
            이 운세를 보려면 크레딧 1개가 필요해요. 지금 충전하면 바로 이어서 볼 수 있어요.
          </Dialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="pillSm" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button asChild variant="buyCta" size="pillSm">
              <Link href="/billing">충전하러 가기</Link>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
