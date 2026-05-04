import {
  Sparkles, Wand2, Moon, Flower, Crown, BookOpen, Heart, Swords, Flame,
  Lightbulb, RotateCw, Scale, Hourglass, Sunset, Droplets, Lock, Zap, Star,
  Sun, Bell, Globe, type LucideIcon,
} from 'lucide-react'
import type { DrawnCard, SpreadPosition } from '@/lib/tarot/types'
import { POSITION_LABELS } from '@/lib/tarot/types'

interface Props {
  drawn: DrawnCard
  position: SpreadPosition
}

const ROMAN: Record<number, string> = {
  0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII',
  8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII', 14: 'XIV',
  15: 'XV', 16: 'XVI', 17: 'XVII', 18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI',
}

const GLYPHS: Record<number, LucideIcon> = {
  0: Sparkles, 1: Wand2, 2: Moon, 3: Flower, 4: Crown, 5: BookOpen,
  6: Heart, 7: Swords, 8: Flame, 9: Lightbulb,
  10: RotateCw, 11: Scale, 12: Hourglass, 13: Sunset, 14: Droplets,
  15: Lock, 16: Zap, 17: Star,
  18: Moon, 19: Sun, 20: Bell, 21: Globe,
}

interface Theme {
  bgFrom: string
  bgTo: string
  border: string
  glyph: string
  ink: string
  sub: string
}

// 5개 archetype: 시작(0–5) · 관계(6–9) · 변화(10–14) · 충격/영감(15–17) · 조명/완성(18–21)
const THEMES: Record<number, Theme> = {
  0: { bgFrom: '#FFF1E3', bgTo: '#FFD9B8', border: '#E8B894', glyph: '#B85D1A', ink: '#5C3D1F', sub: '#9C7A56' },
  1: { bgFrom: '#FFE6EC', bgTo: '#FAC0CC', border: '#E89AAA', glyph: '#B83056', ink: '#5C2032', sub: '#9C5A6E' },
  2: { bgFrom: '#EEE7FE', bgTo: '#CDB9F4', border: '#B099E2', glyph: '#5C3FB8', ink: '#2F2160', sub: '#705F9E' },
  3: { bgFrom: '#DFF3EE', bgTo: '#A8DCD0', border: '#7DBFB1', glyph: '#1B7D6E', ink: '#1A4A42', sub: '#558E84' },
  4: { bgFrom: '#FFF8DC', bgTo: '#F0DFA0', border: '#D4BE7C', glyph: '#806010', ink: '#4D3D0E', sub: '#8E7C50' },
}

function themeFor(id: number): Theme {
  if (id <= 5) return THEMES[0]
  if (id <= 9) return THEMES[1]
  if (id <= 14) return THEMES[2]
  if (id <= 17) return THEMES[3]
  return THEMES[4]
}

export function TarotCardDisplay({ drawn, position }: Props) {
  const isReversed = drawn.orientation === 'reversed'
  const Glyph = GLYPHS[drawn.card.id] ?? Sparkles
  const theme = themeFor(drawn.card.id)

  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className="inline-flex rounded-full bg-fortune-surface-soft px-2.5 py-1 text-[11px] font-bold text-fortune-ink">
        {POSITION_LABELS[position]}
      </span>

      <div
        className="aspect-[5/8] w-full rounded-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 1px 2px rgba(20,22,26,0.04)',
        }}
      >
        {/* 장식: 모서리 별표 */}
        <span className="absolute top-2 right-2 text-[10px] opacity-30" style={{ color: theme.glyph }}>✦</span>
        <span className="absolute bottom-2 left-2 text-[10px] opacity-30" style={{ color: theme.glyph }}>✦</span>

        <div className={'absolute inset-0 flex flex-col items-center justify-between py-3 px-2 ' + (isReversed ? 'rotate-180' : '')}>
          <span
            className="text-[11px] font-bold tracking-[0.18em] uppercase"
            style={{ color: theme.sub }}
          >
            {ROMAN[drawn.card.id] ?? drawn.card.id}
          </span>

          <span
            className="rounded-full size-12 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.55)' }}
          >
            <Glyph className="size-6" style={{ color: theme.glyph }} />
          </span>

          <div className="flex flex-col items-center gap-0.5 text-center">
            <span
              className="text-[13px] font-bold leading-tight"
              style={{ color: theme.ink }}
            >
              {drawn.card.name_kr}
            </span>
            <span
              className="text-[9px] tracking-wider uppercase"
              style={{ color: theme.sub }}
            >
              {drawn.card.name_en}
            </span>
          </div>
        </div>
      </div>

      <span
        className={
          'text-[11px] font-bold rounded-full px-2 py-0.5 ' +
          (isReversed
            ? 'bg-fortune-attention text-fortune-canvas'
            : 'bg-fortune-success text-fortune-canvas')
        }
      >
        {isReversed ? '역방향' : '정방향'}
      </span>
    </div>
  )
}
