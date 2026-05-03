import { createHash } from 'node:crypto'

/** sha256(userId + ":" + drawNumber)의 첫 4 byte → uint32 */
function seedFrom(userId: string, drawNumber: number): number {
  const h = createHash('sha256').update(`${userId}:${drawNumber}`).digest()
  return h.readUInt32BE(0) >>> 0
}

/** mulberry32 PRNG (deterministic, fast, good enough for 6-number draw) */
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateLottoNumbers(userId: string, drawNumber: number): number[] {
  const rand = mulberry32(seedFrom(userId, drawNumber))
  const pool: number[] = Array.from({ length: 45 }, (_, i) => i + 1)
  const picked: number[] = []
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(rand() * pool.length)
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked.sort((a, b) => a - b)
}
