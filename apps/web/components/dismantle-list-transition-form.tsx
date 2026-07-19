'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getDismantleListActionLabel,
  resolveDismantleListAvailableActions,
  type DismantleListStatus,
  type DismantleListTransitionAction,
} from '@/lib/dismantle-list-shared'

type DismantleListTransitionFormProps = {
  itemId: number
  itemCode: string
  currentStatus: DismantleListStatus
  canUpdate: boolean
  canApprove: boolean
  reviewDbReady: boolean
}

export function DismantleListTransitionForm({
  itemId,
  itemCode,
  currentStatus,
  canUpdate,
  canApprove,
  reviewDbReady,
}: DismantleListTransitionFormProps) {
  const router = useRouter()
  const availableActions = useMemo(
    () => resolveDismantleListAvailableActions({ status: currentStatus, canUpdate, canApprove }),
    [canApprove, canUpdate, currentStatus],
  )
  const [action, setAction] = useState<DismantleListTransitionAction | ''>(availableActions[0] ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !availableActions.length || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled || !action) {
      return
    }

    if ((action === 'REQUEST_CORRECTION' || action === 'CANCEL') && !notes.trim()) {
      setFeedback({
        tone: 'error',
        message: 'Catatan wajib diisi untuk aksi koreksi atau pembatalan.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/support/dismantle-lists/${itemId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Aksi List Dismantle gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Aksi List Dismantle berhasil diproses.',
      })
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Aksi Review</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">Transisi List Dismantle</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {!availableActions.length
          ? `Status ${currentStatus} belum punya aksi review lanjutan pada batch ini.`
          : !reviewDbReady
            ? 'Write-side hanya aktif saat review DB benar-benar tersedia, jadi form ini dinonaktifkan agar tidak menulis ke mock.'
            : `Aksi ini memperbarui status operasional ${itemCode}; untuk transfer, sistem akan langsung membuat ticket/work order dismantle ke jalur operasional.`}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Aksi</span>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as DismantleListTransitionAction)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {!availableActions.length ? <option value="">Tidak ada aksi tersedia</option> : null}
            {availableActions.map((item) => (
              <option key={item} value={item}>
                {getDismantleListActionLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Tulis alasan review, koreksi, pembatalan, atau transfer..."
            disabled={isDisabled}
          />
        </label>
        {action === 'TRANSFER' ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Transfer akan membuat work order kategori `DISMANTLE` dan menandai item ini sebagai
            `DITRANSFER_KE_TICKETING`.
          </div>
        ) : null}

        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isDisabled}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-900 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {submitting ? 'Memproses...' : 'Simpan Aksi'}
        </button>
      </form>
    </section>
  )
}
