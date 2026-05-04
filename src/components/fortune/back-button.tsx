import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  href: string
  label: string
}

/** 서브 페이지 상단의 pill 형 백 버튼. 어디서나 동일한 모양. */
export function BackButton({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-fortune-hairline bg-fortune-surface-soft px-3.5 py-1.5 text-sm font-bold text-fortune-ink-deep w-fit"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  )
}
