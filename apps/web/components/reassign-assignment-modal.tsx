'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type TechnicianOption = {
  id: number
  label: string
  username: string
  roleCode: string
}

type ReassignAssignmentModalProps = {
  assignmentId: number
  canReassign: boolean
  reviewDbReady: boolean
  currentTechnicianLabel: string
  technicianOptions: TechnicianOption[]
}

type ReassignRouteResponse = {
  alreadyDone?: boolean
  newAssignmentId?: number
  message?: string
}

export function ReassignAssignmentModal({
  assignmentId,
  canReassign,
  reviewDbReady,
  currentTechnicianLabel,
  technicianOptions,
}: ReassignAssignmentModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [targetTechBId, setTargetTechBId] = useState<number | ''>('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isSubmitDisabled =
    !canReassign ||
    !reviewDbReady ||
    submitting ||
    targetTechBId === '' ||
    Number(targetTechBId) <= 0

  const close = () => {
    if (submitting) return
    setOpen(false)
    setTargetTechBId('')
    setFeedback(null)
  }

  const openModal = () => {
    if (!canReassign || !reviewDbReady || submitting) return
    setOpen(true)
    setTargetTechBId('')
    setFeedback(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitDisabled) return

    const safeTargetId = Number(targetTechBId)
    if (safeTargetId <= 0) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const safeAssignmentId = encodeURIComponent(String(assignmentId))
      const response = await fetch(`/api/sales/work-orders/assignments/${safeAssignmentId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetTechBId: safeTargetId }),
      })

      const payload = (await response.json().catch(() => null)) as ReassignRouteResponse | null

      if (response.status === 401) {
        setFeedback({
          tone: 'error',
          message: 'Anda tidak terautentikasi atau sesi login sudah berakhir.',
        })
        return
      }

      if (response.status === 400) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            'Target teknisi tidak valid. Pilih teknisi lain yang masih aktif.',
        })
        return
      }

      if (response.status === 404) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            'Assignment tidak ditemukan, tidak aktif, atau Anda tidak berhak menugaskan ulang.',
        })
        return
      }

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: 'Terjadi kesalahan saat menugaskan ulang. Silakan coba kembali nanti.',
        })
        return
      }

      if (payload?.alreadyDone) {
        setFeedback({
          tone: 'success',
          message: payload?.message || 'Penugasan ulang sudah dilakukan sebelumnya.',
        })
      } else {
        setFeedback({
          tone: 'success',
          message: payload?.message || 'Berhasil menugaskan ulang ke teknisi baru.',
        })
      }

      router.refresh()

      setTimeout(() => {
        if (!submitting) {
          close()
        }
      }, 900)
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Terjadi kesalahan saat menugaskan ulang. Silakan coba kembali nanti.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!canReassign) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openModal}
          disabled={!canReassign || !reviewDbReady || submitting}
          className="inline-flex items-center justify-center rounded-full bg-indigo-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Memproses...' : 'Tugaskan Ulang'}
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
          <p className="font-semibold">{feedback.tone === 'success' ? 'Sukses' : 'Peringatan'}</p>
          <p className="mt-1">{feedback.message}</p>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Tugaskan Ulang Teknisi</h2>
              <p className="mt-1 text-sm text-slate-600">
                Pilih teknisi pengganti untuk assignment ini.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Teknisi Saat Ini
                </label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  {currentTechnicianLabel}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reassign-target-select" className="block text-sm font-semibold text-slate-700">
                  Teknisi Pengganti
                </label>
                <select
                  id="reassign-target-select"
                  value={targetTechBId}
                  onChange={(e) => {
                    const v = e.target.value
                    setTargetTechBId(v === '' ? '' : Number(v))
                    setFeedback(null)
                  }}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">— Pilih teknisi pengganti —</option>
                  {technicianOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {targetTechBId === '' ? (
                  <p className="text-xs text-slate-500">
                    Menampilkan hanya teknisi aktif dengan peran TEKNISI/TEKNISI_PSB.
                  </p>
                ) : null}
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
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? 'Memproses...' : 'Tugaskan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
