'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Loader2, Moon, Trash2 } from 'lucide-react'
import { deleteDreamEntry, type DreamJournalEntry } from '@/app/actions/dream-journal'
import { DREAM_PERSONAS } from '@/lib/fortune/dream-personas'

export function DreamJournalList({ entries }: { entries: DreamJournalEntry[] }) {
  const [items, setItems] = useState(entries)
  const [openId, setOpenId] = useState<number | null>(null)

  const onDelete = (id: number) => {
    setItems(prev => prev.filter(e => e.id !== id))
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-surface-soft p-8 flex flex-col items-center gap-3 text-center">
        <span className="size-12 rounded-full bg-fortune-canvas inline-flex items-center justify-center">
          <Moon className="size-5 text-fortune-steel" />
        </span>
        <p className="text-base font-bold text-fortune-ink-deep">아직 보관된 꿈이 없어요</p>
        <p className="text-sm text-fortune-steel leading-relaxed">
          꿈을 풀이하면 자동으로 여기에 쌓여요.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map(entry => (
        <DreamJournalItem
          key={entry.id}
          entry={entry}
          isOpen={openId === entry.id}
          onToggle={() => setOpenId(openId === entry.id ? null : entry.id)}
          onDeleted={() => onDelete(entry.id)}
        />
      ))}
    </ul>
  )
}

function DreamJournalItem({
  entry, isOpen, onToggle, onDeleted,
}: {
  entry: DreamJournalEntry
  isOpen: boolean
  onToggle: () => void
  onDeleted: () => void
}) {
  const meta = DREAM_PERSONAS.find(p => p.key === entry.persona)
  const dateLabel = formatDate(entry.created_at)
  const [isDeleting, startDelete] = useTransition()

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDeleting) return
    if (!confirm('이 꿈 일기를 삭제할까요? 되돌릴 수 없어요.')) return
    startDelete(async () => {
      const res = await deleteDreamEntry(entry.id)
      if (res.ok) onDeleted()
      else alert(res.error ?? '삭제 실패')
    })
  }

  return (
    <li className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        {meta && (
          <div className="relative size-12 rounded-full overflow-hidden shrink-0 bg-fortune-surface-soft">
            <Image src={meta.image} alt={meta.label} fill sizes="48px" className="object-cover" />
          </div>
        )}
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-fortune-charcoal shrink-0">{dateLabel}</span>
            {meta && <span className="text-xs font-bold text-fortune-steel truncate">· {meta.label}</span>}
          </div>
          <span className="text-sm font-bold text-fortune-ink-deep leading-snug line-clamp-2">
            {entry.summary}
          </span>
        </div>
        {isOpen
          ? <ChevronUp className="size-5 text-fortune-steel shrink-0" />
          : <ChevronDown className="size-5 text-fortune-steel shrink-0" />
        }
      </button>

      {isOpen && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-fortune-hairline-soft pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-fortune-steel">내가 적은 꿈</span>
            <p className="text-sm text-fortune-charcoal leading-relaxed whitespace-pre-wrap">
              {entry.dream_content}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-fortune-steel">전체 풀이</span>
            <p className="text-sm text-fortune-ink leading-relaxed">{entry.interpretation}</p>
          </div>

          {entry.symbols.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-fortune-steel">등장한 상징</span>
              <ul className="flex flex-col gap-2">
                {entry.symbols.map((s, i) => (
                  <li
                    key={`${s.symbol}-${i}`}
                    className="rounded-lg bg-fortune-surface-soft p-2.5 flex flex-col gap-0.5"
                  >
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-fortune-warning px-2 py-0.5 text-[11px] font-bold text-fortune-ink-deep">
                      <Moon className="size-3" />
                      {s.symbol}
                    </span>
                    <span className="text-xs text-fortune-charcoal leading-relaxed">{s.meaning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl bg-fortune-surface-soft p-3 flex flex-col gap-1">
            <span className="text-xs font-bold text-fortune-steel">오늘의 조언</span>
            <p className="text-sm text-fortune-ink-deep leading-relaxed">{entry.advice}</p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-1.5 self-end rounded-full border border-fortune-critical-strong px-3 py-1.5 text-xs font-bold text-fortune-critical-strong disabled:opacity-50"
          >
            {isDeleting
              ? <Loader2 className="size-3.5 animate-spin" />
              : <Trash2 className="size-3.5" />
            }
            삭제
          </button>
        </div>
      )}
    </li>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Seoul',
  }).format(date)
}
