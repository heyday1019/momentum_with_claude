'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Gender, ProfileInput } from '@/lib/fortune/types'
import { validateProfileInput } from '@/lib/fortune/validators'

interface Props {
  initial?: Partial<ProfileInput>
}

export function LookupForm({ initial }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [birthdate, setBirthdate] = useState(initial?.birthdate ?? '')
  const [gender, setGender] = useState<Gender | ''>(initial?.gender ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!gender) { setError('성별을 선택해주세요'); return }
    const validation = validateProfileInput({ name, birthdate, gender })
    if (validation) { setError(validation); return }
    const params = new URLSearchParams({ name: name.trim(), birthdate, gender })
    startTransition(() => router.push(`/lookup?${params.toString()}`))
  }

  const disabled = !name || !birthdate || !gender || isPending

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-fortune-ink">이름</label>
        <Input value={name} onChange={e => setName(e.target.value)} maxLength={30} placeholder="홍길동" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-fortune-ink">생년월일</label>
        <Input type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={birthdate} onChange={e => setBirthdate(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-fortune-ink">성별</label>
        <div className="flex gap-2">
          {([['female', '여성'], ['male', '남성'], ['other', '기타']] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setGender(v)}
              className={
                "flex-1 h-[54px] rounded-lg flex items-center justify-center gap-2.5 px-3.5 text-sm font-bold " +
                (gender === v
                  ? "border-2 border-fortune-primary-deep bg-fortune-canvas text-fortune-ink-deep"
                  : "border border-fortune-hairline bg-fortune-canvas text-fortune-ink")
              }
            >
              <span className={
                "size-5 rounded-full border-[1.5px] flex items-center justify-center " +
                (gender === v ? "border-fortune-primary-deep" : "border-fortune-hairline")
              }>
                {gender === v && <span className="size-2.5 rounded-full bg-fortune-primary-deep" />}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-fortune-critical-strong">{error}</p>}

      <Button type="submit" variant="buyCta" size="pill" disabled={disabled} className="w-full">
        {isPending ? '불러오는 중...' : '운세 보기'}
      </Button>
    </form>
  )
}
