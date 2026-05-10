'use client'

import { useOptimistic, useTransition } from 'react'
import { Sun, Moon } from 'lucide-react'
import { setTheme } from '@/app/actions/theme'
import type { Theme } from '@/lib/fortune/theme'

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [optimistic, setOptimistic] = useOptimistic<Theme>(initial)
  const [, startTransition] = useTransition()

  const onPick = (next: Theme) => {
    if (next === optimistic) return
    startTransition(async () => {
      setOptimistic(next)
      await setTheme(next)
    })
  }

  return (
    <div role="radiogroup" aria-label="테마" className="inline-flex p-1 rounded-full bg-fortune-surface-soft">
      <Segment
        value="light"
        current={optimistic}
        onPick={onPick}
        icon={<Sun className="size-4" />}
        label="라이트"
      />
      <Segment
        value="dark"
        current={optimistic}
        onPick={onPick}
        icon={<Moon className="size-4" />}
        label="다크"
      />
    </div>
  )
}

function Segment({
  value,
  current,
  onPick,
  icon,
  label,
}: {
  value: Theme
  current: Theme
  onPick: (v: Theme) => void
  icon: React.ReactNode
  label: string
}) {
  const active = value === current
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onPick(value)}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
        active
          ? 'bg-fortune-canvas text-fortune-ink-deep shadow-[rgba(0,0,0,0.2)_1px_1px_0px_0px]'
          : 'text-fortune-charcoal'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
