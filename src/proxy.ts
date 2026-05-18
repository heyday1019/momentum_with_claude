import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// 정확 매칭 경로만 public — prefix 매칭은 /tarot/result, /dream/journal 같은 인증 자식까지 노출시키므로 사용하지 않음
const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/login/email',
  '/auth/callback',
  '/about',
  '/terms',
  '/privacy',
  '/fortune',
  '/tarot',
  '/dream',
  '/lotto',
  '/opengraph-image',
])
const ONBOARDING_PATH = '/onboarding'

export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // 정적 자원/이미지/api는 스킵
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/portfolio') ||
    pathname.includes('.')
  ) return response

  const isPublic = PUBLIC_PATHS.has(pathname)

  // 1) 미인증 + 보호 경로 → /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2) 인증 + 프로필 없음 + onboarding 외 → /onboarding
  if (user && pathname !== ONBOARDING_PATH && !isPublic) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (!profile) {
      const url = request.nextUrl.clone()
      url.pathname = ONBOARDING_PATH
      return NextResponse.redirect(url)
    }
  }

  // 3) 인증 + 프로필 있음 + /login 또는 /onboarding 진입 → /
  if (user && (isPublic || pathname === ONBOARDING_PATH)) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (profile && (pathname === '/login' || pathname === ONBOARDING_PATH)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
