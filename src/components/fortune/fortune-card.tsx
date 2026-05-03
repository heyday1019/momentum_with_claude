'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  title: string
  accentBg: string
  icon: ReactNode
  collapsedPreview: ReactNode
  expandedContent: ReactNode
  defaultOpen?: boolean
  toolbar?: ReactNode
}

export function FortuneCard({
  title, accentBg, icon, collapsedPreview, expandedContent, defaultOpen = false, toolbar,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-canvas p-6 flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2.5 text-left"
          aria-expanded={open}
        >
          <span className={`size-9 rounded-full inline-flex items-center justify-center ${accentBg}`}>
            {icon}
          </span>
          <span className="text-2xl font-medium text-fortune-ink-deep">{title}</span>
        </button>
        <div className="flex items-center gap-3.5">
          {toolbar}
          {open
            ? <ChevronUp className="size-5 text-fortune-steel" />
            : <ChevronDown className="size-5 text-fortune-steel" />
          }
        </div>
      </header>
      <div className="flex flex-col gap-3.5">
        {open ? expandedContent : collapsedPreview}
      </div>
    </section>
  )
}
