'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Loader2, Moon } from 'lucide-react'
import { ShareButton } from './share-button'
import { getDreamInterpretation, type DreamInterpretation } from '@/app/actions/dream'
import { DREAM_PERSONAS, type DreamPersonaKey, type DreamPersonaMeta } from '@/lib/fortune/dream-personas'

const MIN_LEN = 10
const MAX_LEN = 1000

interface ResultState {
  persona: DreamPersonaKey
  data: DreamInterpretation
}

export function DreamForm() {
  const [content, setContent] = useState('')
  const [result, setResult] = useState<ResultState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingPersona, setPendingPersona] = useState<DreamPersonaKey | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = (persona: DreamPersonaKey) => {
    setError(null)
    const trimmed = content.trim()
    if (trimmed.length < MIN_LEN) { setError(`${MIN_LEN}자 이상 적어주세요`); return }
    setPendingPersona(persona)
    startTransition(async () => {
      const res = await getDreamInterpretation({ content: trimmed, persona })
      setPendingPersona(null)
      if (!res.ok) { setError(res.error); return }
      setResult({ persona: res.persona, data: res.data })
    })
  }

  const onReset = () => {
    setResult(null)
    setError(null)
    setContent('')
  }

  if (result) {
    const meta = DREAM_PERSONAS.find(p => p.key === result.persona)!
    return <DreamResult data={result.data} meta={meta} onReset={onReset} />
  }

  const formDisabled = isPending
  const canSubmit = content.trim().length >= MIN_LEN && !isPending

  return (
    <div className="flex flex-col gap-5">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value.slice(0, MAX_LEN))}
        rows={7}
        placeholder="어젯밤 꿈을 자세히 적어주세요. 등장한 인물, 장면, 분위기 등..."
        className="rounded-xl border border-fortune-hairline bg-fortune-canvas p-4 text-base text-fortune-ink resize-none focus:outline-none focus:border-fortune-primary-deep"
        disabled={formDisabled}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-fortune-charcoal">
          {content.length}/{MAX_LEN}
        </span>
        {error && (
          <span className="text-xs font-bold text-fortune-critical-strong">{error}</span>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <span className="text-sm font-bold text-fortune-ink-deep text-center">
          어떤 분께 풀이를 부탁드릴까요?
        </span>
        <span className="text-xs font-bold text-fortune-charcoal text-center">
          캐릭터를 누르면 그 분이 풀어드려요
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {DREAM_PERSONAS.map(p => (
          <PersonaButton
            key={p.key}
            meta={p}
            disabled={!canSubmit}
            isLoading={pendingPersona === p.key}
            isOtherLoading={isPending && pendingPersona !== p.key}
            onClick={() => submit(p.key)}
          />
        ))}
      </div>

      <p className="text-xs text-fortune-stone leading-relaxed text-center">
        결과는 자동으로 꿈 일기에 보관돼요. 필요 없으면 일기에서 삭제할 수 있어요.
      </p>
    </div>
  )
}

function PersonaButton({
  meta, disabled, isLoading, isOtherLoading, onClick,
}: {
  meta: DreamPersonaMeta
  disabled: boolean
  isLoading: boolean
  isOtherLoading: boolean
  onClick: () => void
}) {
  const muted = isOtherLoading || disabled
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading || isOtherLoading}
      aria-label={`${meta.label}로 풀이하기`}
      className={
        'relative rounded-2xl flex flex-col items-center gap-1.5 p-2 text-center ' +
        'border-2 transition ' +
        (isLoading
          ? 'border-fortune-primary-deep bg-fortune-canvas'
          : muted
            ? 'border-fortune-hairline-soft bg-fortune-surface-soft opacity-60'
            : 'border-fortune-hairline bg-fortune-canvas')
      }
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-fortune-surface-soft">
        <Image
          src={meta.image}
          alt={meta.label}
          fill
          sizes="(max-width: 480px) 30vw, 120px"
          className="object-cover"
          priority
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-6 text-white animate-spin" />
          </div>
        )}
      </div>
      <span className="text-xs font-bold text-fortune-ink-deep leading-tight">{meta.label}</span>
      <span className="text-[10px] font-bold text-fortune-charcoal leading-tight">
        {isLoading ? '풀이 중...' : meta.caption}
      </span>
    </button>
  )
}

function DreamResult({
  data, meta, onReset,
}: { data: DreamInterpretation; meta: DreamPersonaMeta; onReset: () => void }) {
  const shareUrl = buildShareUrl(data, meta.label)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold text-fortune-stone leading-relaxed text-center">
        ✓ 꿈 일기에 자동 저장됐어요. 일기에서 다시 보거나 삭제할 수 있어요.
      </p>

      <div className="rounded-2xl bg-fortune-surface-soft p-4 flex items-center gap-3">
        <div className="relative size-14 rounded-full overflow-hidden shrink-0 bg-fortune-canvas">
          <Image src={meta.image} alt={meta.label} fill sizes="56px" className="object-cover" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-sm font-bold text-fortune-ink-deep">{meta.label} 풀이</span>
          <span className="text-xs font-bold text-fortune-charcoal">{meta.caption}</span>
        </div>
      </div>

      <div className="rounded-2xl bg-fortune-surface-soft p-5 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-xs font-bold text-fortune-steel">꿈 요약</span>
          <p className="text-lg font-medium text-fortune-ink-deep leading-snug">{data.summary}</p>
        </div>
        <ShareButton
          imageUrl={shareUrl}
          title={`${meta.label} 꿈 해몽`}
          text={`${meta.label} · ${data.summary}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-fortune-ink-deep">전체 풀이</span>
        <p className="text-base text-fortune-ink leading-relaxed">{data.interpretation}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-fortune-ink-deep">등장한 상징</span>
        <ul className="flex flex-col gap-2">
          {data.symbols.map((s, i) => (
            <li
              key={`${s.symbol}-${i}`}
              className="rounded-xl border border-fortune-hairline-soft bg-fortune-canvas p-3 flex flex-col gap-0.5"
            >
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-fortune-warning px-2 py-0.5 text-xs font-bold text-fortune-ink-deep">
                <Moon className="size-3" />
                {s.symbol}
              </span>
              <span className="text-sm text-fortune-charcoal leading-relaxed">{s.meaning}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-fortune-hairline-soft p-5 flex flex-col gap-1">
        <span className="text-xs font-bold text-fortune-steel">{meta.label} · 오늘의 조언</span>
        <p className="text-base text-fortune-ink-deep leading-relaxed">{data.advice}</p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-fortune-hairline-soft bg-fortune-canvas px-4 py-3 text-sm font-bold text-fortune-ink-deep mt-2"
      >
        다른 꿈 해몽하기
      </button>
    </div>
  )
}

function buildShareUrl(data: DreamInterpretation, persona: string): string {
  const sym = data.symbols.slice(0, 4).map(s => s.symbol).join(',')
  const params = new URLSearchParams({
    s: data.summary,
    a: data.advice,
    sym,
    p: persona,
  })
  return `/api/og/dream?${params.toString()}`
}
