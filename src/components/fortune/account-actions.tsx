'use client'

import { useState, useTransition } from 'react'
import { Download, Loader2, Trash2 } from 'lucide-react'
import { exportMyData, deleteMyData } from '@/app/actions/account'

export function AccountActions() {
  const [exportBusy, startExport] = useTransition()
  const [deleteBusy, startDelete] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onExport = () => {
    setError(null)
    startExport(async () => {
      const res = await exportMyData()
      if (!res.ok) { setError(res.error); return }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `momentum-export-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
  }

  const onDelete = () => {
    setError(null)
    if (!confirm('정말 모든 데이터를 삭제할까요?\n\n프로필 · 운세 기록 · 로또 · 꿈 일기 · 통계가 모두 사라지고 로그아웃돼요. 되돌릴 수 없어요.')) return
    if (!confirm('한 번 더 확인할게요.\n진짜 삭제할까요?')) return
    startDelete(async () => {
      const res = await deleteMyData()
      // 성공이면 redirect로 끝남 (이 코드는 도달 안 함)
      if (res && !res.ok) setError(res.error ?? '삭제 실패')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-fortune-ink-deep">계정 관리</h2>

      <button
        type="button"
        onClick={onExport}
        disabled={exportBusy || deleteBusy}
        className="rounded-2xl border border-fortune-hairline-soft bg-fortune-canvas p-4 flex items-center gap-3 text-left disabled:opacity-50"
      >
        <span className="size-10 rounded-full bg-fortune-surface-soft inline-flex items-center justify-center shrink-0">
          {exportBusy
            ? <Loader2 className="size-4 text-fortune-ink-deep animate-spin" />
            : <Download className="size-4 text-fortune-ink-deep" />
          }
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-fortune-ink-deep">데이터 내보내기</span>
          <span className="text-xs font-bold text-fortune-charcoal">
            프로필 · 운세 · 로또 · 꿈 일기 · 통계를 JSON으로 저장
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={exportBusy || deleteBusy}
        className="rounded-2xl border border-fortune-critical-strong bg-fortune-canvas p-4 flex items-center gap-3 text-left disabled:opacity-50"
      >
        <span className="size-10 rounded-full bg-fortune-critical inline-flex items-center justify-center shrink-0">
          {deleteBusy
            ? <Loader2 className="size-4 text-fortune-canvas animate-spin" />
            : <Trash2 className="size-4 text-fortune-canvas" />
          }
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-fortune-critical-strong">모든 데이터 삭제</span>
          <span className="text-xs font-bold text-fortune-charcoal">
            프로필 + 운세/꿈 기록 모두 삭제하고 로그아웃해요
          </span>
        </div>
      </button>

      {error && (
        <p className="text-xs font-bold text-fortune-critical-strong">{error}</p>
      )}

      <p className="text-xs text-fortune-stone leading-relaxed">
        ※ 로그인 계정 자체(이메일 등)는 보안상 자동 삭제되지 않아요. 같은 계정으로 다시 로그인하면 빈 상태로 시작해요.
      </p>
    </div>
  )
}
