'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TechnicianOption } from '@/components/reassign-assignment-modal'

type DispatchWorkOrderModalProps = {
  workOrderId: number
  workOrderLabel: string
  customerLabel?: string | null
  canDispatch: boolean
  reviewDbReady: boolean
  technicianOptions: TechnicianOption[]
}

type DispatchRouteResponse = {
  message?: string
}

export function DispatchWorkOrderModal({
  workOrderId,
  workOrderLabel,
  customerLabel,
  canDispatch,
  reviewDbReady,
  technicianOptions,
}: DispatchWorkOrderModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [assignedUserId, setAssignedUserId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  const isSubmitDisabled =
    !canDispatch ||
    !reviewDbReady ||
    submitting ||
    assignedUserId === '' ||
    Number(assignedUserId) <= 0

  const close = () => {
    if (submitting) return
    setOpen(false)
    setAssignedUserId('')
    setNotes('')
    setFeedback(null)
  }

  const openModal = () => {
    if (!canDispatch || !reviewDbReady || submitting) return
    setOpen(true)
    setAssignedUserId('')
    setNotes('')
    setFeedback(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitDisabled) return

    const safeAssignedId = Number(assignedUserId)
    if (safeAssignedId <= 0) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const safeWoId = encodeURIComponent(String(workOrderId))
      const endpoint = `/api/sales/work-orders/${safeWoId}/assignments`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedUserId: safeAssignedId,
          notes: notes.trim() || undefined,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | DispatchRouteResponse
        | null

      if (response.status === 401) {
        setFeedback({
          tone: 'error',
          message:
            'Anda tidak terautentikasi atau sesi login sudah berakhir.',
        })
        return
      }
      if (response.status === 403) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            'Anda tidak berhak melakukan dispatch work order ini.',
        })
        return
      }
      if (response.status === 400) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            'Data input tidak valid. Pastikan teknisi masih aktif.',
        })
        return
      }
      if (response.status === 503) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            'Dispatch belum bisa dijalankan: review DB belum tersedia pada environment ini.',
        })
        return
      }
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message:
            'Terjadi kesalahan saat menyimpan dispatch. Silakan coba kembali.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Technician assigned successfully.',
      })

      router.refresh()

      setTimeout(() => {
        if (!submitting) {
          close()
        }
      }, 900)
    } catch {
      setFeedback({
        tone: 'error',
        message:
          'Terjadi kesalahan saat menyimpan dispatch. Silakan coba kembali.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!canDispatch) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openModal}
          disabled={!canDispatch || !reviewDbReady || submitting}
          className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 tap-44"
        >
          {submitting ? 'Memproses...' : 'Dispatch'}
        </button>
      </div>

      {feedback && !open ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <p className="font-semibold">
            {feedback.tone === 'success' ? 'Sukses' : 'Peringatan'}
          </p>
          <p className="mt-1">{feedback.message}</p>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Dispatch Work Order
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Pilih teknisi untuk menugaskan work order ini ke lapangan.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">
                    Work Order
                  </p>
                  <p className="mt-1 font-semibold text-inkStrong break-words">
                    {workOrderLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">
                    Pelanggan
                  </p>
                  <p className="mt-1 font-semibold text-inkStrong break-words">
                    {customerLabel || '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="dispatch-tech-select"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Pilih Teknisi
                </label>
                <select
                  id="dispatch-tech-select"
                  value={assignedUserId}
                  onChange={(e) => {
                    const v = e.target.value
                    setAssignedUserId(v === '' ? '' : Number(v))
                    setFeedback(null)
                  }}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    — Pilih teknisi yang akan ditugaskan —
                  </option>
                  {technicianOptions.length === 0 ? (
                    <option value="" disabled>
                      No technician available.
                    </option>
                  ) : (
                    technicianOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))
                  )}
                </select>
                {technicianOptions.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No technician available.
                  </p>
                ) : assignedUserId === '' ? (
                  <p className="text-xs text-slate-500">
                    Menampilkan hanya teknisi aktif dengan peran
                    TEKNISI/TEKNISI_PSB.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="dispatch-notes"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Catatan Dispatch (opsional)
                </label>
                <textarea
                  id="dispatch-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  placeholder="Tambahkan catatan untuk teknisi atau instruksi kerja..."
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">
                  Schedule
                </p>
                <p className="text-sm text-slate-500 italic">
                  NOT SUPPORTED BY EXISTING BACKEND
                </p>
              </div>

              {feedback ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    feedback.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  <p className="font-semibold">
                    {feedback.tone === 'success' ? 'Sukses' : 'Peringatan'}
                  </p>
                  <p className="mt-1">{feedback.message}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 tap-44"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 tap-44"
                >
                  {submitting ? 'Memproses...' : 'Assign / Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
