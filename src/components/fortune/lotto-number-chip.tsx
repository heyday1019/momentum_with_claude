function colorFor(n: number): { bg: string; fg: string } {
  if (n <= 10) return { bg: 'bg-fortune-warning', fg: 'text-fortune-ink-deep' }
  if (n <= 20) return { bg: 'bg-fortune-fb-blue', fg: 'text-fortune-canvas' }
  if (n <= 30) return { bg: 'bg-fortune-critical', fg: 'text-fortune-canvas' }
  if (n <= 40) return { bg: 'bg-fortune-charcoal', fg: 'text-fortune-canvas' }
  return { bg: 'bg-fortune-success', fg: 'text-fortune-canvas' }
}

export function LottoNumberChip({ n }: { n: number }) {
  const { bg, fg } = colorFor(n)
  return (
    <span className={`inline-flex size-[38px] items-center justify-center rounded-full font-bold text-base ${bg} ${fg}`}>
      {n}
    </span>
  )
}
