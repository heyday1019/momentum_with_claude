import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const errorParam = url.searchParams.get('error')
  const errorDesc = url.searchParams.get('error_description')

  // Supabase 측에서 OAuth 에러가 나서 그대로 돌아온 경우
  if (errorParam) {
    console.error('[auth/callback] provider error:', errorParam, errorDesc)
    const back = new URL('/login', request.url)
    back.searchParams.set('error', errorDesc ?? errorParam)
    return NextResponse.redirect(back)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 세션 쿠키를 실어 보낼 응답 객체. 쿠키는 이 객체에 직접 set 해야
  // exchangeCodeForSession 결과가 브라우저까지 도달한다.
  const response = NextResponse.redirect(new URL('/', request.url))

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message)
    const back = new URL('/login', request.url)
    back.searchParams.set('error', error.message)
    return NextResponse.redirect(back)
  }

  return response
}
