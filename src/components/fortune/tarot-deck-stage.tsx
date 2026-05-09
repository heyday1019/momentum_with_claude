'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, type Transition } from 'framer-motion'
import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TarotCardBack } from './tarot-card-back'
import { drawOneCard, drawThreeCards, serializeDraws } from '@/lib/tarot/draw'
import { tarotImageSrc } from '@/lib/tarot/deck'
import type { DrawnCard, SpreadType } from '@/lib/tarot/types'

/** 부채에 펼치는 카드 뒷면 수 */
const FAN_COUNT = 13
/** 카드 한 장의 px 폭 — 기본 모바일 우선 */
const CARD_WIDTH = 64
/** 부채 양 끝 각도 (도) */
const FAN_ANGLE_HALF = 28
/** 인접 카드 간 X 간격 */
const FAN_X_STEP = 16

const SPREADS: Array<{ value: SpreadType; label: string; sub: string }> = [
  { value: 'three', label: '3장 스프레드', sub: '과거 · 현재 · 미래' },
  { value: 'one', label: '오늘의 카드', sub: '하루의 핵심 한 장' },
]

const THREE_LABELS = ['과거', '현재', '미래']

type Phase = 'idle' | 'flying' | 'flipping' | 'settled'

interface FlightInfo {
  /** 부채 인덱스 0..FAN_COUNT-1 */
  fanIdx: number
  /** 슬롯 인덱스 0..(슬롯수-1) */
  slotIdx: number
  /** 카드 데이터 */
  drawn: DrawnCard
  /** fan 위치에서 슬롯 위치까지의 px 차이 (clientX/Y 기준) */
  dx: number
  dy: number
}

/**
 * 1..total-1 범위에서 count개의 무작위 distinct index를 균등 영역에서 선택.
 * 3장은 좌/중/우 영역에서 1개씩, 1장은 중앙 ±2.
 */
function pickFanIndices(total: number, count: number): number[] {
  if (count === 1) {
    const half = Math.floor(total / 2)
    const offset = Math.floor(Math.random() * 5) - 2
    return [Math.min(Math.max(half + offset, 0), total - 1)]
  }
  // 3-card: 좌·중·우 1/3씩
  const third = Math.floor(total / 3)
  return [
    Math.floor(Math.random() * third),
    third + Math.floor(Math.random() * third),
    2 * third + Math.floor(Math.random() * (total - 2 * third)),
  ]
}

export function TarotDeckStage() {
  const router = useRouter()
  const [spread, setSpread] = useState<SpreadType>('three')
  const [phase, setPhase] = useState<Phase>('idle')
  const [flights, setFlights] = useState<FlightInfo[]>([])

  const slotRefs = useRef<Array<HTMLDivElement | null>>([])
  const fanRefs = useRef<Array<HTMLDivElement | null>>([])

  const slotCount = spread === 'three' ? 3 : 1

  const handleDraw = () => {
    if (phase !== 'idle') return
    const draws = spread === 'three' ? drawThreeCards() : drawOneCard()
    const fanIdxs = pickFanIndices(FAN_COUNT, draws.length)

    const computed: FlightInfo[] = draws.map((drawn, slotIdx) => {
      const fanIdx = fanIdxs[slotIdx]
      const fanRect = fanRefs.current[fanIdx]?.getBoundingClientRect()
      const slotRect = slotRefs.current[slotIdx]?.getBoundingClientRect()
      if (!fanRect || !slotRect) {
        return { fanIdx, slotIdx, drawn, dx: 0, dy: -200 }
      }
      const fanCx = fanRect.left + fanRect.width / 2
      const fanCy = fanRect.top + fanRect.height / 2
      const slotCx = slotRect.left + slotRect.width / 2
      const slotCy = slotRect.top + slotRect.height / 2
      return {
        fanIdx,
        slotIdx,
        drawn,
        dx: slotCx - fanCx,
        dy: slotCy - fanCy,
      }
    })

    setFlights(computed)
    setPhase('flying')

    const FLY_BASE = 700
    const STAGGER = 180
    const FLIP_BASE = 520
    const totalFly = FLY_BASE + STAGGER * (draws.length - 1)
    const totalFlip = FLIP_BASE + STAGGER * (draws.length - 1)

    setTimeout(() => setPhase('flipping'), totalFly + 50)
    setTimeout(() => setPhase('settled'), totalFly + totalFlip + 100)
    setTimeout(() => {
      const param = serializeDraws(draws)
      router.push(`/tarot/result?d=${encodeURIComponent(param)}`)
    }, totalFly + totalFlip + 850)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 다크 스테이지: 슬롯 + 부채 덱 */}
      <div
        className="relative overflow-hidden rounded-[32px] px-4 pt-7 pb-6"
        style={{
          background: 'radial-gradient(circle at 50% 35%, #2D3142 0%, #14161A 65%, #0A0C12 100%)',
        }}
      >
        {/* 슬롯 줄 */}
        <div className={'flex justify-center ' + (slotCount === 3 ? 'gap-3' : '')}>
          {Array.from({ length: slotCount }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                ref={(el) => {
                  slotRefs.current[i] = el
                }}
                className="aspect-[5/8] rounded-xl border-2 border-dashed border-white/25 bg-white/[0.04]"
                style={{ width: CARD_WIDTH + 8 }}
              />
              <span className="text-[10px] font-bold tracking-wider uppercase text-white/55">
                {slotCount === 3 ? THREE_LABELS[i] : '오늘'}
              </span>
            </div>
          ))}
        </div>

        {/* 부채 덱 */}
        <div className="relative mt-9 h-[140px]">
          {Array.from({ length: FAN_COUNT }).map((_, i) => (
            <FanCard
              key={i}
              index={i}
              cardRef={(el) => {
                fanRefs.current[i] = el
              }}
              flight={flights.find((f) => f.fanIdx === i) ?? null}
              phase={phase}
            />
          ))}
        </div>
      </div>

      {/* 스프레드 선택 */}
      <div className="grid grid-cols-2 gap-2">
        {SPREADS.map((opt) => {
          const active = spread === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSpread(opt.value)}
              disabled={phase !== 'idle'}
              className={
                'rounded-xl px-3 py-3 flex flex-col items-start gap-0.5 text-left transition-colors ' +
                (active
                  ? 'border-2 border-fortune-primary-deep bg-fortune-canvas'
                  : 'border border-fortune-hairline bg-fortune-surface-soft') +
                (phase !== 'idle' ? ' opacity-60 cursor-not-allowed' : '')
              }
            >
              <span className={'text-sm font-bold ' + (active ? 'text-fortune-ink-deep' : 'text-fortune-ink')}>
                {opt.label}
              </span>
              <span className="text-xs font-bold text-fortune-charcoal">{opt.sub}</span>
            </button>
          )
        })}
      </div>

      {/* 뽑기 버튼 */}
      <Button
        onClick={handleDraw}
        disabled={phase !== 'idle'}
        variant="buyCta"
        size="pill"
        className="w-full"
      >
        <Sparkles className="size-4" />
        {phase === 'idle'
          ? spread === 'one'
            ? '오늘의 카드 1장 뽑기'
            : '카드 3장 뽑기'
          : '카드를 펼치는 중...'}
      </Button>

      <p className="text-xs text-fortune-stone leading-relaxed text-center">
        78장 풀덱에서 무작위로 뽑아요. 결과는 저장되지 않아요.
      </p>
    </div>
  )
}

interface FanCardProps {
  index: number
  cardRef: (el: HTMLDivElement | null) => void
  flight: FlightInfo | null
  phase: Phase
}

function FanCard({ index, cardRef, flight, phase }: FanCardProps) {
  const half = Math.floor(FAN_COUNT / 2)
  const baseAngle = ((index - half) / half) * FAN_ANGLE_HALF
  const baseX = (index - half) * FAN_X_STEP

  const isFlying = flight !== null && phase !== 'idle'
  const isFlipped = isFlying && (phase === 'flipping' || phase === 'settled')

  const flyTransition: Transition = {
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1], // easeOutQuint feel
    delay: flight ? flight.slotIdx * 0.18 : 0,
  }

  const restingAnim = { x: baseX, y: 0, rotate: baseAngle, scale: 1, zIndex: index }
  const flyingAnim = flight
    ? { x: baseX + flight.dx, y: flight.dy, rotate: 0, scale: 1.18, zIndex: 100 + flight.slotIdx }
    : restingAnim

  return (
    <motion.div
      className="absolute left-1/2 bottom-0 origin-bottom"
      style={{ width: CARD_WIDTH, marginLeft: -CARD_WIDTH / 2 }}
      initial={restingAnim}
      animate={isFlying ? flyingAnim : restingAnim}
      transition={flyTransition}
    >
      <FlippableFace
        cardRef={cardRef}
        flipped={isFlipped}
        flipDelay={flight ? flight.slotIdx * 0.18 : 0}
        drawn={flight?.drawn ?? null}
      />
    </motion.div>
  )
}

interface FlippableFaceProps {
  cardRef: (el: HTMLDivElement | null) => void
  flipped: boolean
  flipDelay: number
  drawn: DrawnCard | null
}

function FlippableFace({ cardRef, flipped, flipDelay, drawn }: FlippableFaceProps) {
  return (
    <motion.div
      ref={cardRef}
      className="relative aspect-[5/8]"
      style={{ transformStyle: 'preserve-3d', perspective: 800 }}
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ duration: 0.55, ease: 'easeInOut', delay: flipped ? flipDelay : 0 }}
    >
      {/* 뒷면 (정면 0°에서 보임) */}
      <div
        className="absolute inset-0"
        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
      >
        <TarotCardBack className="h-full w-full rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.45)]" />
      </div>
      {/* 앞면 (180°에서 보임) — 카드가 그려질 때만 렌더 */}
      {drawn && (
        <div
          className="absolute inset-0 overflow-hidden rounded-xl border border-fortune-hairline-soft bg-fortune-surface-soft"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: '0 4px 14px rgba(20,22,26,0.35)',
          }}
        >
          <Image
            src={tarotImageSrc(drawn.card)}
            alt={drawn.card.name_kr}
            fill
            sizes="120px"
            className={
              'object-cover ' + (drawn.orientation === 'reversed' ? 'rotate-180' : '')
            }
            priority
          />
        </div>
      )}
    </motion.div>
  )
}
