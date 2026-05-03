export function CardSkeleton() {
  return (
    <section className="rounded-[32px] border border-fortune-hairline-soft bg-fortune-canvas p-6 flex flex-col gap-3 animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-fortune-surface-soft" />
      <div className="h-4 rounded-lg bg-fortune-surface-soft w-5/6" />
      <div className="h-4 rounded-lg bg-fortune-surface-soft w-3/4" />
      <div className="h-4 rounded-lg bg-fortune-surface-soft w-2/3" />
    </section>
  )
}
