import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 임시 진단 endpoint — env 키 존재 여부만 반환, 값은 절대 노출하지 않음.
// production env vars 가 함수 runtime 에 실제 주입되는지 확인용. 진단 후 제거.
export async function GET() {
  const keys = [
    'POLAR_ENV',
    'POLAR_ORG_TOKEN',
    'POLAR_WEBHOOK_SECRET',
    'POLAR_PRODUCT_SMALL',
    'POLAR_PRODUCT_MEDIUM',
    'POLAR_PRODUCT_LARGE',
    'NEXT_PUBLIC_SITE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
  ] as const

  const present = Object.fromEntries(keys.map(k => [k, Boolean(process.env[k])]))
  const allPolarKeys = Object.keys(process.env).filter(k => k.startsWith('POLAR'))

  return NextResponse.json({
    present,
    allPolarKeys,
    vercel_env: process.env.VERCEL_ENV ?? null,
    vercel_url: process.env.VERCEL_URL ?? null,
  })
}
