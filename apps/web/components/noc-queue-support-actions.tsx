'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportQuickStatus = 'OPEN' | 'ON_PROGRESS' | 'FOLLOW_UP'

type SupportPreset = {
  key: SupportQuickStatus
  label: string
  notes: string
}

type NocQueueSupportActionsProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  ticketCode: string
  rawStatus?: string | null
  supportLaneLabel?: string
  detailHref: string
}

const presets: SupportPreset[] = [
  {
    key: 'OPEN',
    label: 'Open',
    notes: 'Ticket dibuka / dikembalikan ke antrean NOC untuk ditangani.',
  },
  {
    key: 'ON_PROGRESS',
    label: 'On Progress',
    notes: 'Ticket sedang ditangani aktif oleh NOC / support.',
  },
  {
    key: 'FOLLOW_UP',
    label: 'Temporary',
    notes: 'Ticket memerlukan follow-up lanjutan dan dipindahkan ke status temporary.',
  },
]

function normalizeQueueSupportStatus(value: string | null | undefined): SupportQuickStatus {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'FOLLOW_UP' || normalized === 'TEMPORARY') {
    return 'FOLLOW_UP'
  }
  if (normalized === 'ON_PROGRESS' || normalized === 'PROCESS' || normalized === 'CHECK') {
    return 'ON_PROGRESS'
  }
  return 'OPEN'
}

export function NocQueueSupportActions({
  canUpdate,
  reviewDbReady,
  ticketCode,
  rawStatus,
  supportLaneLabel = 'Lane TT',
  detailHref,
}: NocQueueSupportActionsProps) {
  const router = useRouter()
  const [submittingKey, setSubmittingKey] = useState<SupportQuickStatus | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const activeStatus = useMemo(() => normalizeQueueSupportStatus(rawStatus), [rawStatus])
  const isDisabled = !canUpdate || !reviewDbReady || Boolean(submittingKey)

  async function handleQuickUpdate(preset: SupportPreset) {
    if (isDisabled) return

    setSubmittingKey(preset.key)
    setFeedback(null)

    try {
      const response = await fetch(`/api/support/trouble-tickets/${encodeURIComponent(ticketCode)}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progressStatus: preset.key,
          ownerName: supportLaneLabel,
          progressNotes: preset.notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Status support gagal diperbarui.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || `Status support berhasil diubah ke ${preset.label}.`,
      })
      router.refresh()
    } finally {
      setSubmittingKey(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handleQuickUpdate(preset)}
            disabled={isDisabled}
            className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
              activeStatus === preset.key
                ? 'bg-slate-950 text-white'
                : 'border border-line bg-white text-slate-700 hover:border-slate-400'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {submittingKey === preset.key ? 'Menyimpan...' : preset.label}
          </button>
        ))}
      </div>

      <a
        href={detailHref}
        className="surface-soft inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-xs font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
      >
        Close via Detail
      </a>

      {feedback ? (
        <div
          className={`rounded-2xl border px-3 py-2 text-xs ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  )
}
