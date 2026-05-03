const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** Asia/Seoul 기준 YYYY-MM-DD */
export function todayKst(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 한국 로또 6/45 1회차 추첨일: 2002-12-07 (토) 20:35 KST = 11:35 UTC
const FIRST_DRAW_KST_MS = Date.UTC(2002, 11, 7, 11, 35)
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** 다음 추첨 회차 번호. 추첨 시각 이후엔 그 다음 회차를 반환 */
export function nextLottoDrawNumber(now: Date = new Date()): number {
  const elapsed = now.getTime() - FIRST_DRAW_KST_MS
  return Math.floor(elapsed / WEEK_MS) + 2
}
