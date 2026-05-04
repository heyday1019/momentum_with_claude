import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { nextLottoDrawNumber } from '@/lib/fortune/kst'

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

// 동행복권 공식 색상 — 1~10 노랑 / 11~20 파랑 / 21~30 빨강 / 31~40 회색 / 41~45 초록
function ballStyle(n: number): { bg: string; ink: string } {
  if (n <= 10) return { bg: '#FBC400', ink: '#14161A' }
  if (n <= 20) return { bg: '#69C8F2', ink: '#FFFFFF' }
  if (n <= 30) return { bg: '#FF7272', ink: '#FFFFFF' }
  if (n <= 40) return { bg: '#AAAAAA', ink: '#FFFFFF' }
  return { bg: '#B0D840', ink: '#FFFFFF' }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const drawNumber = nextLottoDrawNumber()
  const { data: rows } = await supabase
    .from('lotto_recommendations')
    .select('numbers, comment, draw_number')
    .match({ user_id: user.id, draw_number: drawNumber })
    .limit(1)

  const row = rows?.[0]
  if (!row) return new Response('운세 데이터가 없습니다', { status: 404 })

  const numbers = row.numbers as number[]
  const comment = row.comment as string

  const { data: profile } = await supabase
    .from('profiles').select('name').eq('id', user.id).single()
  const name = (profile?.name as string | undefined) ?? ''

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
          background: 'linear-gradient(135deg, #FFFAE5 0%, #FFEFB3 60%, #FFD86B 100%)',
          padding: '80px',
          fontFamily: 'Pretendard',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '36px', color: '#80531C', fontWeight: 700 }}>행운의 로또번호</span>
          <span style={{ fontSize: '30px', color: '#5C3D14', fontWeight: 400 }}>
            {name ? `${name}님 · ${drawNumber}회차 추천` : `${drawNumber}회차 추천`}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          {numbers.map((n, i) => {
            const s = ballStyle(n)
            return (
              <div
                key={i}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '999px',
                  background: s.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '52px',
                  fontWeight: 700,
                  color: s.ink,
                  boxShadow: '0 4px 12px rgba(20,22,26,0.15)',
                }}
              >
                {n}
              </div>
            )
          })}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          alignItems: 'center',
        }}>
          <span style={{
            fontSize: '32px',
            color: '#14161A',
            fontWeight: 700,
            lineHeight: 1.35,
            textAlign: 'center',
            maxWidth: '900px',
          }}>
            {comment}
          </span>
          <span style={{ fontSize: '26px', color: '#80531C', fontWeight: 700, letterSpacing: '0.2em' }}>
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
