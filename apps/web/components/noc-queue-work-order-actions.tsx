'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NocQueueStatus } from '@/lib/services/noc-queue-service'

type WorkOrderShortcutStatus = 'OPEN' | 'ON_PROGRESS' | 'TEMPORARY' | 'CLOSE'

type WorkOrderPreset = {
  key: WorkOrderShortcutStatus
  label: string
  notes: string
}

type NocQueueWorkOrderActionsProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  workOrderId: number
  queueStatus: NocQueueStatus
  supportLaneLabel?: string
  detailHref: string
}

const presets: WorkOrderPreset[] = [
  {
    key: 'OPEN',
    label: 'Open',
    notes: 'Work order kembali ke antrean open untuk dijadwalkan ulang.',
  },
  {
    key: 'ON_PROGRESS',
    label: 'On Progress',
    notes: 'Work order sedang diproses aktif oleh tim lapangan / NOC.',
  },
  {
    key: 'TEMPORARY',
    label: 'Temporary',
    notes: 'Work order dipindahkan ke pending / temporary karena menunggu tindak lanjut.',
  },
  {
    key: 'CLOSE',
    label: 'Close',
    notes: 'Work order diselesaikan dari queue NOC.',
  },
]

function filterPresets(queueStatus: NocQueueStatus) {
  if (queueStatus === 'OPEN') {
    return presets.filter((item) => item.key !== 'OPEN')
  }
  if (queueStatus === 'ON_PROGRESS') {
    return presets.filter((item) => item.key !== 'ON_PROGRESS')
  }
  if (queueStatus === 'TEMPORARY') {
    return presets.filter((item) => item.key !== 'TEMPORARY')
  }
  if (queueStatus === 'CLOSE') {
    return presets.filter((item) => item.key !== 'CLOSE')
  }

  return presets
}

export function NocQueueWorkOrderActions({
  canUpdate,
  reviewDbReady,
  workOrderId,
  queueStatus,
  supportLaneLabel = 'Lane WO',
  detailHref,
}: NocQueueWorkOrderActionsProps) {
  const router = useRouter()
  const [submittingKey, setSubmittingKey] = useState<WorkOrderShortcutStatus | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const availablePresets = useMemo(() => filterPresets(queueStatus), [queueStatus])
  const isDisabled = !canUpdate || !reviewDbReady || Boolean(submittingKey)

  async function handleQuickUpdate(preset: WorkOrderPreset) {
    if (isDisabled) return

    setSubmittingKey(preset.key)
    setFeedback(null)

    try {
      if (preset.key === 'CLOSE') {
        const response = await fetch(`/api/sales/work-orders/${workOrderId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reasonNotes: `${preset.notes} ${supportLaneLabel}`.trim(),
          }),
        })

        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; idempotent?: boolean; message?: string; workOrderNo?: string; movementIds?: number[] }
          | null
        if (!response.ok) {
          setFeedback({
            tone: 'error',
            message: payload?.message || 'Work order gagal diselesaikan (formal completion).',
          })
          return
        }
        const detail =
          payload?.idempotent ?
            ' (sudah pernah diselesaikan sebelumnya — idempotent success)'
            : payload?.movementIds && payload.movementIds.length > 0 ?
              ` (material ter-debit ${payload.movementIds.length} movement record)`
              : ''
        setFeedback({
          tone: 'success',
          message: `Work order ${payload?.workOrderNo ?? ''} berhasil diselesaikan secara formal${detail}.`,
        })
        router.refresh()
        return
      }

      const response = await fetch(`/api/sales/work-orders/${workOrderId}/queue-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueStatus: preset.key,
          notes: `${preset.notes} ${supportLaneLabel}`.trim(),
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Status work order gagal diperbarui.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || `Status work order berhasil diubah ke ${preset.label}.`,
      })
      router.refresh()
    } finally {
      setSubmittingKey(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {availablePresets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => handleQuickUpdate(preset)}
            disabled={isDisabled}
            className="rounded-full border border-line bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submittingKey === preset.key ? 'Menyimpan...' : preset.label}
          </button>
        ))}
      </div>

      <a
        href={detailHref}
        className="surface-soft inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-xs font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
      >
        WO via Detail
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
