import { ImageResponse } from 'next/og'
import { deserializeDraws } from '@/lib/tarot/draw'
import { POSITION_LABELS, SPREAD_POSITIONS, type DrawnCard } from '@/lib/tarot/types'

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

interface CardTheme {
  bg: string
  ink: string
  sub: string
}

function themeFor(id: number): CardTheme {
  if (id <= 5)  return { bg: 'linear-gradient(160deg,#FFF1E3 0%,#FFD9B8 100%)', ink: '#5C3D1F', sub: '#9C7A56' }
  if (id <= 9)  return { bg: 'linear-gradient(160deg,#FFE6EC 0%,#FAC0CC 100%)', ink: '#5C2032', sub: '#9C5A6E' }
  if (id <= 14) return { bg: 'linear-gradient(160deg,#EEE7FE 0%,#CDB9F4 100%)', ink: '#2F2160', sub: '#705F9E' }
  if (id <= 17) return { bg: 'linear-gradient(160deg,#DFF3EE 0%,#A8DCD0 100%)', ink: '#1A4A42', sub: '#558E84' }
  return            { bg: 'linear-gradient(160deg,#FFF8DC 0%,#F0DFA0 100%)', ink: '#4D3D0E', sub: '#8E7C50' }
}

const ROMAN: Record<number, string> = {
  0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII',
  8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV',
  15: 'XV', 16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI',
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const d = url.searchParams.get('d') ?? ''
  const headline = url.searchParams.get('h') ?? ''

  const draws = deserializeDraws(d)
  if (!draws) return new Response('잘못된 카드 정보', { status: 400 })

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
          background: 'linear-gradient(180deg,#FAF7F2 0%,#EDE5D6 100%)',
          padding: '70px',
          fontFamily: 'Pretendard',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '32px', color: '#806010', fontWeight: 700, letterSpacing: '0.05em' }}>
            오늘의 타로
          </span>
          <span style={{ fontSize: '22px', color: '#5C5040', fontWeight: 400 }}>
            과거 · 현재 · 미래
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
          {draws.map((drawn: DrawnCard, i: number) => {
            const theme = themeFor(drawn.card.id)
            const isReversed = drawn.orientation === 'reversed'
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <span style={{
                  fontSize: '20px', fontWeight: 700, color: '#5C5040',
                  background: 'rgba(255,255,255,0.7)',
                  padding: '6px 16px', borderRadius: '999px',
                }}>
                  {POSITION_LABELS[SPREAD_POSITIONS[i]]}
                </span>
                <div style={{
                  width: '220px',
                  height: '352px',
                  borderRadius: '24px',
                  background: theme.bg,
                  border: isReversed ? '2px dashed rgba(0,0,0,0.15)' : '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px 16px',
                }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: theme.sub, textAlign: 'center', letterSpacing: '0.15em' }}>
                    {ROMAN[drawn.card.id] ?? drawn.card.id}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: theme.ink, textAlign: 'center' }}>
                      {drawn.card.name_kr}
                    </span>
                    <span style={{ fontSize: '14px', color: theme.sub, fontWeight: 400, letterSpacing: '0.1em' }}>
                      {drawn.card.name_en}
                    </span>
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: theme.sub, textAlign: 'center', letterSpacing: '0.15em' }}>
                    {ROMAN[drawn.card.id] ?? drawn.card.id}
                  </span>
                </div>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: isReversed ? '#D49B45' : '#1B7D6E',
                  padding: '4px 12px',
                  borderRadius: '999px',
                }}>
                  {isReversed ? '역방향' : '정방향'}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          {headline && (
            <span style={{
              fontSize: '34px',
              color: '#14161A',
              fontWeight: 700,
              lineHeight: 1.3,
              textAlign: 'center',
              maxWidth: '900px',
            }}>
              {headline}
            </span>
          )}
          <span style={{ fontSize: '24px', color: '#806010', fontWeight: 700, letterSpacing: '0.2em' }}>
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
      headers: { 'Cache-Control': 'public, max-age=3600' },
    }
  )
}
