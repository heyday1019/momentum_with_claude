import { ImageResponse } from 'next/og'

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

export async function GET(request: Request) {
  const url = new URL(request.url)
  const summary = url.searchParams.get('s') ?? ''
  const advice = url.searchParams.get('a') ?? ''
  const symbolsRaw = url.searchParams.get('sym') ?? ''
  const persona = url.searchParams.get('p') ?? ''

  const symbols = symbolsRaw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length <= 12)
    .slice(0, 4)

  if (!summary) return new Response('summary required', { status: 400 })

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
          background: 'linear-gradient(135deg, #1A1B3D 0%, #2A2A60 50%, #3F3FAA 100%)',
          padding: '80px',
          fontFamily: 'Pretendard',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '36px', fontWeight: 700, opacity: 0.9 }}>꿈 해몽</span>
          <span style={{ fontSize: '22px', fontWeight: 700, opacity: 0.75, letterSpacing: '0.05em' }}>
            {persona ? persona : 'DREAM INTERPRETATION'}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0',
        }}>
          <span style={{
            fontSize: '52px',
            fontWeight: 700,
            lineHeight: 1.3,
            textAlign: 'center',
          }}>
            {summary}
          </span>
        </div>

        {symbols.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {symbols.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '12px 24px',
                  borderRadius: '999px',
                  fontSize: '24px',
                  fontWeight: 700,
                }}
              >
                ☾ {s}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          {advice && (
            <span style={{
              fontSize: '24px',
              fontWeight: 400,
              lineHeight: 1.4,
              textAlign: 'center',
              opacity: 0.85,
              maxWidth: '900px',
            }}>
              {advice}
            </span>
          )}
          <span style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '0.2em', opacity: 0.7 }}>
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
