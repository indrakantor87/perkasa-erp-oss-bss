'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getPsbListActionLabel,
  resolvePsbListAvailableActions,
  type PsbListStatus,
  type PsbListTransitionAction,
} from '@/lib/psb-list-shared'

type PsbListTransitionFormProps = {
  itemId: number
  itemCode: string
  currentStatus: PsbListStatus
  canUpdate: boolean
  canApprove: boolean
  reviewDbReady: boolean
}

export function PsbListTransitionForm({
  itemId,
  itemCode,
  currentStatus,
  canUpdate,
  canApprove,
  reviewDbReady,
}: PsbListTransitionFormProps) {
  const router = useRouter()
  const availableActions = useMemo(
    () => resolvePsbListAvailableActions({ status: currentStatus, canUpdate, canApprove }),
    [canApprove, canUpdate, currentStatus],
  )
  const [action, setAction] = useState<PsbListTransitionAction | ''>(availableActions[0] ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !availableActions.length || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled || !action) {
      return
    }

    if ((action === 'REQUEST_CORRECTION' || action === 'REJECT') && !notes.trim()) {
      setFeedback({
        tone: 'error',
        message: 'Catatan wajib diisi untuk aksi koreksi atau penolakan.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/sales/psb-lists/${itemId}/transition`, {
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
          message: payload?.message || 'Aksi Data PSB gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Aksi Data PSB berhasil diproses.',
      })
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate() {
    if (isDisabled || currentStatus !== 'DISETUJUI') {
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/sales/psb-lists/${itemId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = (await response.json().catch(() => null)) as
        | { success?: true; workOrderNo?: string; customerCode?: string; serviceNo?: string; idempotent?: boolean }
        | { success?: false; error?: string; message?: string }
        | null
      if (!response.ok) {
        const errPayload = payload as { success?: false; error?: string; message?: string } | null
        setFeedback({
          tone: 'error',
          message:
            (errPayload && errPayload.message) ||
            'Aktivasi komposit Data PSB gagal diproses.',
        })
        return
      }
      const ok = payload && payload.success
      const idempotent = ok && payload.idempotent ? ' (sudah diaktivasi sebelumnya)' : ''
      setFeedback({
        tone: 'success',
        message: ok
          ? `Aktivasi Flow A berhasil${idempotent}.${payload.workOrderNo ? ` WO: ${payload.workOrderNo}` : ''}${
              payload.customerCode ? ` Pelanggan: ${payload.customerCode}` : ''
            }${payload.serviceNo ? ` Langganan: ${payload.serviceNo}` : ''}`
          : 'Aktivasi Flow A berhasil.',
      })
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Aksi Review</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-950">Transisi Data PSB</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {!availableActions.length
          ? `Status ${currentStatus} belum punya aksi review lanjutan pada batch ini.`
          : !reviewDbReady
            ? 'Write-side hanya aktif saat review DB benar-benar tersedia, jadi form ini dinonaktifkan agar tidak menulis ke mock.'
            : `Aksi ini memperbarui status operasional ${itemCode}; untuk status disetujui, aksi transfer akan langsung membuat ticket operasional ke jalur NOC.`}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Aksi</span>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as PsbListTransitionAction)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {!availableActions.length ? <option value="">Tidak ada aksi tersedia</option> : null}
            {availableActions.map((item) => (
              <option key={item} value={item}>
                {getPsbListActionLabel(item)}
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
            placeholder="Tulis alasan review, koreksi, approval, atau penolakan..."
            disabled={isDisabled}
          />
        </label>
        {action === 'TRANSFER' ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Transfer akan membuat Trouble Ticket tipe PSB dan Work Order INSTALLATION untuk teknisi, serta menandai item ini sebagai
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

        {currentStatus === 'DISETUJUI' && canApprove ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Aktivasi Flow A = komposit end-to-end dalam 1 transaksi: <b>PSB → Pelanggan → Langganan → Work Order</b>.
              Membuat 3 record business linkage sekaligus dan menandai Data PSB <code>DITRANSFER_KE_TICKETING</code>.
            </div>
            <button
              type="button"
              onClick={handleActivate}
              disabled={isDisabled}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-800 bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {submitting ? 'Memproses Aktivasi...' : 'Aktivasi Pelanggan (Flow A)'}
            </button>
            <p className="px-1 text-xs text-slate-500">
              Aksi ini memerlukan izin <code>approve</code> pada modul sales / customers.
            </p>
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
