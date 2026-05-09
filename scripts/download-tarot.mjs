// Rider–Waite–Smith (1909) 타로 78장 이미지 다운로드 스크립트.
//
// Wikimedia Commons에 호스팅된 퍼블릭 도메인 이미지를 가져와
// `public/tarot/<slug>.jpg`로 저장한다. 슬러그는 src/lib/tarot/deck.ts의
// tarotImageSlug()와 1:1로 일치해야 한다.
//
// 사용법: `node scripts/download-tarot.mjs`
//   - 이미 존재하는 파일은 건너뜀
//   - --force 플래그 시 덮어쓰기

import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'tarot')
const FORCE = process.argv.includes('--force')

const COMMONS_PREFIX = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
const UA = 'momentum-tarot-fetch/1.0 (https://github.com/; tarot ui)'

// Major Arcana 22장
const MAJORS = [
  'RWS_Tarot_00_Fool.jpg',
  'RWS_Tarot_01_Magician.jpg',
  'RWS_Tarot_02_High_Priestess.jpg',
  'RWS_Tarot_03_Empress.jpg',
  'RWS_Tarot_04_Emperor.jpg',
  'RWS_Tarot_05_Hierophant.jpg',
  'RWS_Tarot_06_Lovers.jpg',
  'RWS_Tarot_07_Chariot.jpg',
  'RWS_Tarot_08_Strength.jpg',
  'RWS_Tarot_09_Hermit.jpg',
  'RWS_Tarot_10_Wheel_of_Fortune.jpg',
  'RWS_Tarot_11_Justice.jpg',
  'RWS_Tarot_12_Hanged_Man.jpg',
  'RWS_Tarot_13_Death.jpg',
  'RWS_Tarot_14_Temperance.jpg',
  'RWS_Tarot_15_Devil.jpg',
  'RWS_Tarot_16_Tower.jpg',
  'RWS_Tarot_17_Star.jpg',
  'RWS_Tarot_18_Moon.jpg',
  'RWS_Tarot_19_Sun.jpg',
  'RWS_Tarot_20_Judgement.jpg',
  'RWS_Tarot_21_World.jpg',
]

// Wikimedia Commons 마이너 슈트 prefix
const MINOR_PREFIX = {
  wands: 'Wands',
  cups: 'Cups',
  swords: 'Swords',
  pentacles: 'Pents', // Wikimedia는 'Pents'로 사용
}

const pad2 = (n) => String(n).padStart(2, '0')

// 다운로드 대상 빌드
const targets = []
MAJORS.forEach((file, i) => {
  targets.push({ slug: `major-${pad2(i)}`, file })
})
for (const [suit, prefix] of Object.entries(MINOR_PREFIX)) {
  for (let r = 1; r <= 14; r++) {
    targets.push({ slug: `${suit}-${pad2(r)}`, file: `${prefix}${pad2(r)}.jpg` })
  }
}

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function downloadOnce(target) {
  const url = COMMONS_PREFIX + encodeURIComponent(target.file)
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } })
  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after')) || 0
    return { ok: false, retryable: true, error: `HTTP 429`, retryAfter: retry }
  }
  if (!res.ok) {
    return { ok: false, retryable: false, error: `HTTP ${res.status}` }
  }
  const ct = res.headers.get('content-type') || ''
  if (!ct.startsWith('image/')) {
    return { ok: false, retryable: false, error: `unexpected content-type: ${ct}` }
  }
  const buf = Buffer.from(await res.arrayBuffer())
  return { ok: true, buf }
}

async function download(target) {
  const dest = join(OUT_DIR, `${target.slug}.jpg`)
  if (!FORCE && (await exists(dest))) {
    return { ...target, status: 'skip' }
  }
  const maxAttempts = 5
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await downloadOnce(target)
    if (r.ok) {
      await writeFile(dest, r.buf)
      return { ...target, status: 'ok', bytes: r.buf.length }
    }
    if (!r.retryable || attempt === maxAttempts) {
      return { ...target, status: 'error', error: r.error }
    }
    const wait = Math.max((r.retryAfter || 0) * 1000, 1000 * Math.pow(2, attempt))
    await sleep(wait)
  }
  return { ...target, status: 'error', error: 'unreachable' }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  console.log(`다운로드 대상: ${targets.length}장 → ${OUT_DIR}`)

  // 단일 동시성 + 호출 사이 슬립 — Wikimedia 429 회피
  const concurrency = 1
  const results = []
  let i = 0
  async function worker() {
    while (i < targets.length) {
      const idx = i++
      const t = targets[idx]
      try {
        const r = await download(t)
        results.push(r)
        const tag = r.status === 'ok' ? `✓ ${(r.bytes / 1024).toFixed(0)}KB` : r.status
        console.log(`[${idx + 1}/${targets.length}] ${t.slug.padEnd(14)} ${tag}${r.error ? ' — ' + r.error : ''}`)
      } catch (e) {
        results.push({ ...t, status: 'error', error: e.message })
        console.log(`[${idx + 1}/${targets.length}] ${t.slug.padEnd(14)} ERROR — ${e.message}`)
      }
      if (i < targets.length) await sleep(400)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))

  const ok = results.filter((r) => r.status === 'ok').length
  const skip = results.filter((r) => r.status === 'skip').length
  const err = results.filter((r) => r.status === 'error')
  console.log(`\n완료: ${ok} 다운로드, ${skip} 스킵, ${err.length} 실패`)
  if (err.length) {
    console.log('실패 목록:')
    err.forEach((r) => console.log(`  - ${r.slug} (${r.file}): ${r.error}`))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
