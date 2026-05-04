import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { todayKst } from '@/lib/fortune/kst'
import type { DailyContent } from '@/lib/fortune/types'

export const runtime = 'nodejs'

const FONT_BOLD_URL = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf'
const FONT_REGULAR_URL = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/packages/pretendard/dist/public/static/Pretendard-Regular.otf'

let cachedBold: ArrayBuffer | null = null
let cachedRegular: ArrayBuffer | null = null

async function loadFonts(): Promise<{ bold: ArrayBuffer; regular: ArrayBuffer }> {
  if (!cachedBold) cachedBold = await fetch(FONT_BOLD_URL).then(r => r.arrayBuffer())
  if (!cachedRegular) cachedRegular = await fetch(FONT_REGULAR_URL).then(r => r.arrayBuffer())
  return { bold: cachedBold!, regular: cachedRegular! }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const today = todayKst()
  const { data: rows } = await supabase
    .from('fortune_daily')
    .select('content')
    .match({ user_id: user.id, date: today, fortune_type: 'daily' })
    .limit(1)

  const content = rows?.[0]?.content as DailyContent | undefined
  if (!content) return new Response('운세 데이터가 없습니다', { status: 404 })

  const { data: profile } = await supabase
    .from('profiles').select('name').eq('id', user.id).single()
  const name = (profile?.name as string | undefined) ?? ''

  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'long',
    timeZone: 'Asia/Seoul',
  }).format(new Date())

  const { bold, regular } = await loadFonts()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #FFF5F4 0%, #FFD6D2 60%, #FFB8B0 100%)',
          padding: '80px',
          fontFamily: 'Pretendard',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '36px', color: '#9C5A6E', fontWeight: 700 }}>오늘의 운세</span>
          <span style={{ fontSize: '30px', color: '#5C2032', fontWeight: 400 }}>
            {name ? `${name}님 · ${dateLabel}` : dateLabel}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 0',
        }}>
          <span style={{
            fontSize: '64px',
            color: '#14161A',
            fontWeight: 700,
            lineHeight: 1.25,
            textAlign: 'center',
          }}>
            {content.headline}
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          alignItems: 'center',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FFD600',
            padding: '16px 32px',
            borderRadius: '999px',
            fontSize: '30px',
            fontWeight: 700,
            color: '#14161A',
          }}>
            ★ 키워드 · {content.lucky_keyword}
          </div>
          <span style={{ fontSize: '26px', color: '#9C5A6E', fontWeight: 700, letterSpacing: '0.2em' }}>
            MOMENTUM
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
        { name: 'Pretendard', data: regular, weight: 400, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'private, no-store' },
    }
  )
}
