'use client'

import { useState } from 'react'
import { Share2, Check, Loader2 } from 'lucide-react'

interface Props {
  imageUrl: string
  title: string
  text: string
}

type DoneKind = 'shared' | 'copied' | 'downloaded'

/**
 * 이미지 PNG를 공유한다. 우선순위:
 *  1) ClipboardItem(Promise<Blob>)으로 클립보드 복사 — fetch를 클립보드 호출 안에서
 *     실행하므로 user gesture 유지됨 (데스크톱/모바일 모두 작동)
 *  2) navigator.share with files — 모바일 시스템 share sheet
 *  3) 다운로드 — 최후 폴백
 */
export function ShareButton({ imageUrl, title, text }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<DoneKind | null>(null)

  const fetchBlob = async (): Promise<Blob> => {
    const res = await fetch(imageUrl, { credentials: 'include' })
    if (!res.ok) throw new Error(`fetch failed (${res.status})`)
    return await res.blob()
  }

  const finishedAs = (kind: DoneKind) => {
    setDone(kind)
    setTimeout(() => setDone(null), 2500)
  }

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)

      // 1) 모바일: navigator.share (시스템 공유 시트 — 카톡/메시지/AirDrop 등)
      if (isMobile && typeof navigator.share === 'function') {
        try {
          const blob = await fetchBlob()
          const file = new File([blob], 'momentum.png', { type: 'image/png' })
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title, text })
            finishedAs('shared')
            return
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          console.warn('[share] navigator.share failed, falling back to clipboard:', err)
        }
      }

      // 2) Promise-based ClipboardItem — gesture 유지 (데스크톱 / 모바일 폴백)
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write && window.isSecureContext) {
        try {
          const item = new ClipboardItem({ 'image/png': fetchBlob() })
          await navigator.clipboard.write([item])
          finishedAs('copied')
          return
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
          console.warn('[share] clipboard.write failed:', err)
        }
      }

      // 3) 다운로드 — 최후 폴백
      const blob = await fetchBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'momentum.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      finishedAs('downloaded')
    } catch (err) {
      console.error('[share] failed:', err)
    } finally {
      setBusy(false)
    }
  }

  const labelFor = (kind: DoneKind) =>
    kind === 'copied' ? '복사됨' : kind === 'shared' ? '공유됨' : '다운로드됨'

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label="공유하기"
        className="size-9 rounded-full inline-flex items-center justify-center bg-fortune-canvas border border-fortune-hairline-soft disabled:opacity-50"
      >
        {busy
          ? <Loader2 className="size-4 text-fortune-steel animate-spin" />
          : done
            ? <Check className="size-4 text-fortune-success" />
            : <Share2 className="size-4 text-fortune-ink" />
        }
      </button>
      {done && (
        <span
          aria-live="polite"
          className="absolute right-0 top-full mt-1 inline-flex items-center gap-1 rounded-full bg-fortune-ink-deep px-2.5 py-1 text-xs font-bold text-fortune-canvas whitespace-nowrap"
        >
          {labelFor(done)}
          {done === 'copied' && <span className="opacity-70">· Ctrl+V로 붙여넣기</span>}
        </span>
      )}
    </div>
  )
}
