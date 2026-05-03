'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function EmailLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^.+@.+\..+$/.test(email)) { setError('이메일 형식이 올바르지 않아요'); return }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setError('전송 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.'); return }
      setSent(true)
    })
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="h-15 flex items-center px-4 border-b border-fortune-hairline-soft">
        <Link href="/login" className="size-11 inline-flex items-center justify-center" aria-label="뒤로">
          <ChevronLeft className="size-6 text-fortune-ink-deep" />
        </Link>
      </header>
      <form onSubmit={onSubmit} className="flex flex-col gap-6 p-6 pt-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-light leading-tight text-fortune-ink-deep">이메일로 로그인</h1>
          <p className="text-base text-fortune-charcoal leading-relaxed">입력하신 메일로 로그인 링크를 보내드려요. 다른 비밀번호는 필요 없어요.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-fortune-ink">이메일</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={sent}
          />
        </div>
        {error && <p className="text-sm text-fortune-critical-strong">{error}</p>}
        {sent ? (
          <div className="rounded-full bg-fortune-success px-4 py-3 text-center text-sm font-bold text-fortune-canvas">
            메일을 확인해주세요
          </div>
        ) : (
          <Button type="submit" variant="buyCta" size="pill" className="w-full" disabled={isPending || !email}>
            {isPending ? '전송 중...' : '로그인 링크 받기'}
          </Button>
        )}
        <p className="text-xs text-fortune-steel text-center">메일이 안 와요? 스팸함을 확인해보세요.</p>
      </form>
    </main>
  )
}
