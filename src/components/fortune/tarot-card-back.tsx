/**
 * 타로 카드의 통일된 "뒷면" 디자인.
 *
 * - 깊은 인디고 바탕 + 옅은 사선 해칭 = 오래된 종이 느낌
 * - 금박 더블 프레임 + 4모서리 4점 별 = 빈티지 카드 보더
 * - 중앙 16광선 태양 + 8점 별 = 신비주의 엠블럼
 * - 별 점 산포 = 별자리 분위기
 *
 * 아무 곳에서나 같은 모양이 나와야 하므로 모든 시각 요소는 SVG에 인라인.
 * 외부 폰트/이미지에 의존하지 않고 컨테이너 크기에 fluid하게 맞춤.
 */

interface Props {
  className?: string
}

const RAYS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i * 22.5 * Math.PI) / 180
  const isLong = i % 2 === 0
  const r1 = 24
  const r2 = isLong ? 32 : 28
  return {
    x1: Math.cos(angle) * r1,
    y1: Math.sin(angle) * r1,
    x2: Math.cos(angle) * r2,
    y2: Math.sin(angle) * r2,
    width: isLong ? 0.8 : 0.45,
  }
})

const CORNER_POSITIONS: Array<[number, number]> = [
  [10, 10],
  [90, 10],
  [10, 150],
  [90, 150],
]

const CONSTELLATION = [
  [22, 28, 0.6],
  [78, 32, 0.5],
  [20, 50, 0.4],
  [80, 54, 0.5],
  [16, 78, 0.35],
  [84, 82, 0.45],
  [18, 125, 0.5],
  [82, 120, 0.6],
  [25, 142, 0.4],
  [76, 138, 0.5],
] as const

export function TarotCardBack({ className = '' }: Props) {
  return (
    <div className={'overflow-hidden ' + className}>
      <svg
        viewBox="0 0 100 160"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-full w-full"
        aria-hidden
      >
        <defs>
          <radialGradient id="tcb-bg" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#1F2655" />
            <stop offset="60%" stopColor="#0E1336" />
            <stop offset="100%" stopColor="#06081D" />
          </radialGradient>
          <pattern
            id="tcb-hatch"
            width="3"
            height="3"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="3" stroke="#C9A961" strokeOpacity="0.06" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* 바탕 + 사선 해칭 */}
        <rect width="100" height="160" fill="url(#tcb-bg)" />
        <rect width="100" height="160" fill="url(#tcb-hatch)" />

        {/* 금박 3중 프레임 */}
        <rect x="3" y="3" width="94" height="154" rx="2" fill="none" stroke="#C9A961" strokeOpacity="0.45" strokeWidth="0.5" />
        <rect x="5" y="5" width="90" height="150" rx="1.5" fill="none" stroke="#C9A961" strokeOpacity="0.9" strokeWidth="0.7" />
        <rect x="7" y="7" width="86" height="146" fill="none" stroke="#C9A961" strokeOpacity="0.35" strokeWidth="0.4" />

        {/* 4모서리 작은 4점 별 */}
        <g fill="#E9D9A6" fillOpacity="0.85">
          {CORNER_POSITIONS.map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <path d="M0,-2.2 L0.6,-0.6 L2.2,0 L0.6,0.6 L0,2.2 L-0.6,0.6 L-2.2,0 L-0.6,-0.6 Z" />
              <circle r="0.45" fill="#0E1336" />
            </g>
          ))}
        </g>

        {/* 중앙 신비주의 엠블럼 */}
        <g transform="translate(50 80)">
          {/* 16광선 */}
          <g stroke="#C9A961" strokeOpacity="0.7" strokeLinecap="round">
            {RAYS.map((r, i) => (
              <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} strokeWidth={r.width} />
            ))}
          </g>
          {/* 외곽 링 */}
          <circle r="22" fill="none" stroke="#C9A961" strokeOpacity="0.95" strokeWidth="0.8" />
          <circle r="20.5" fill="none" stroke="#C9A961" strokeOpacity="0.3" strokeWidth="0.3" />
          {/* 내부 링 */}
          <circle r="16" fill="none" stroke="#C9A961" strokeOpacity="0.55" strokeWidth="0.4" />
          {/* 8점 별 — 두 개의 4점 별 겹침 */}
          <g>
            <path d="M0,-13 L3,-3 L13,0 L3,3 L0,13 L-3,3 L-13,0 L-3,-3 Z" fill="#E9D9A6" fillOpacity="0.85" />
            <path d="M0,-13 L3,-3 L13,0 L3,3 L0,13 L-3,3 L-13,0 L-3,-3 Z" fill="#C9A961" fillOpacity="0.55" transform="rotate(45)" />
          </g>
          {/* 중심점 */}
          <circle r="1.7" fill="#0E1336" />
          <circle r="0.8" fill="#E9D9A6" />
        </g>

        {/* 별자리 점들 */}
        <g fill="#E9D9A6">
          {CONSTELLATION.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fillOpacity="0.55" />
          ))}
        </g>
      </svg>
    </div>
  )
}
