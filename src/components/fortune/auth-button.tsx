'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle } from 'lucide-react'

export function KakaoButton() {
  const onClick = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <Button variant="kakao" size="pill" className="w-full gap-2.5" onClick={onClick}>
      <MessageCircle className="size-5" /> 카카오로 계속하기
    </Button>
  )
}

export function GoogleButton() {
  const onClick = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <Button variant="google" size="pill" className="w-full gap-2.5" onClick={onClick}>
      <span className="text-[#4285F4] font-bold text-lg">G</span> 구글로 계속하기
    </Button>
  )
}
