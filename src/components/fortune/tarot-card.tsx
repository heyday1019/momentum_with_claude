import {
  Sparkles, Wand2, Moon, Flower, Crown, BookOpen, Heart, Swords, Flame,
  Lightbulb, RotateCw, Scale, Hourglass, Sunset, Droplets, Lock, Zap, Star,
  Sun, Bell, Globe, Coins, type LucideIcon,
} from 'lucide-react'
import type { DrawnCard, SpreadPosition, Suit } from '@/lib/tarot/types'
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

/** 메이저(id 0–21) 글리프 */
const MAJOR_GLYPHS: Record<number, LucideIcon> = {
  0: Sparkles, 1: Wand2, 2: Moon, 3: Flower, 4: Crown, 5: BookOpen,
  6: Heart, 7: Swords, 8: Flame, 9: Lightbulb,
  10: RotateCw, 11: Scale, 12: Hourglass, 13: Sunset, 14: Droplets,
  15: Lock, 16: Zap, 17: Star,
  18: Moon, 19: Sun, 20: Bell, 21: Globe,
}

/** 마이너 슈트별 글리프 */
const SUIT_GLYPHS: Record<Exclude<Suit, 'major'>, LucideIcon> = {
  wands: Flame,
  cups: Droplets,
  swords: Swords,
  pentacles: Coins,
}

interface Theme {
  bgFrom: string
  bgTo: string
  border: string
  glyph: string
  ink: string
  sub: string
}

// 메이저: 5개 archetype 그룹
const MAJOR_THEMES: Theme[] = [
  { bgFrom: '#FFF1E3', bgTo: '#FFD9B8', border: '#E8B894', glyph: '#B85D1A', ink: '#5C3D1F', sub: '#9C7A56' },
  { bgFrom: '#FFE6EC', bgTo: '#FAC0CC', border: '#E89AAA', glyph: '#B83056', ink: '#5C2032', sub: '#9C5A6E' },
  { bgFrom: '#EEE7FE', bgTo: '#CDB9F4', border: '#B099E2', glyph: '#5C3FB8', ink: '#2F2160', sub: '#705F9E' },
  { bgFrom: '#DFF3EE', bgTo: '#A8DCD0', border: '#7DBFB1', glyph: '#1B7D6E', ink: '#1A4A42', sub: '#558E84' },
  { bgFrom: '#FFF8DC', bgTo: '#F0DFA0', border: '#D4BE7C', glyph: '#806010', ink: '#4D3D0E', sub: '#8E7C50' },
]

// 마이너: 슈트별 단일 테마
const SUIT_THEMES: Record<Exclude<Suit, 'major'>, Theme> = {
  wands:     { bgFrom: '#FFEDDA', bgTo: '#FFC58A', border: '#E8A560', glyph: '#B83C00', ink: '#5C1F00', sub: '#9C5A33' },
  cups:      { bgFrom: '#E6F3FB', bgTo: '#A6D2EE', border: '#7AB2D9', glyph: '#1B5E8F', ink: '#0F3556', sub: '#4D7C9F' },
  swords:    { bgFrom: '#EEEAF4', bgTo: '#C5BAD8', border: '#9F92B8', glyph: '#3F3260', ink: '#241B3D', sub: '#5F567A' },
  pentacles: { bgFrom: '#EEF6E0', bgTo: '#C1DC95', border: '#94B86A', glyph: '#3F6E1B', ink: '#1F3A0E', sub: '#5F7A45' },
}

function themeFor(card: DrawnCard['card']): Theme {
  if (card.suit === 'major') {
    if (card.id <= 5) return MAJOR_THEMES[0]
    if (card.id <= 9) return MAJOR_THEMES[1]
    if (card.id <= 14) return MAJOR_THEMES[2]
    if (card.id <= 17) return MAJOR_THEMES[3]
    return MAJOR_THEMES[4]
  }
  return SUIT_THEMES[card.suit]
}

function glyphFor(card: DrawnCard['card']): LucideIcon {
  if (card.suit === 'major') return MAJOR_GLYPHS[card.id] ?? Sparkles
  return SUIT_GLYPHS[card.suit]
}

/** 마이너 카드 좌상단에 표시할 짧은 ID (예: "W3", "C-A", "S-K") */
function minorBadge(card: DrawnCard['card']): string {
  if (card.suit === 'major') return ROMAN[card.id] ?? String(card.id)
  const suitChar = { wands: 'W', cups: 'C', swords: 'S', pentacles: 'P' }[card.suit]
  const r = card.rank
  const rankShort = r === 1 ? 'A' : r === 11 ? 'P' : r === 12 ? 'Kn' : r === 13 ? 'Q' : r === 14 ? 'K' : String(r)
  return `${suitChar}-${rankShort}`
}

export function TarotCardDisplay({ drawn, position }: Props) {
  const isReversed = drawn.orientation === 'reversed'
  const Glyph = glyphFor(drawn.card)
  const theme = themeFor(drawn.card)
  const badge = minorBadge(drawn.card)

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
            {badge}
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
