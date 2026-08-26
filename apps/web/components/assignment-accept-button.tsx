'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AssignmentAcceptButtonProps = {
  assignmentId: number
  canAccept: boolean
  reviewDbReady: boolean
}

type AcceptRouteResponse = {
  accepted?: boolean
  alreadyAccepted?: boolean
  workOrderId?: number
  message?: string
}

export function AssignmentAcceptButton({
  assignmentId,
  canAccept,
  reviewDbReady,
}: AssignmentAcceptButtonProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canAccept || !reviewDbReady || submitting

  if (!canAccept) {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const safeAssignmentId = encodeURIComponent(String(assignmentId))
      const response = await fetch(`/api/sales/work-orders/assignments/${safeAssignmentId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const payload = (await response.json().catch(() => null)) as AcceptRouteResponse | null

      if (response.status === 401) {
        setFeedback({
          tone: 'error',
          message: 'Tidak terautentikasi / sesi login sudah berakhir.',
        })
        return
      }

      if (response.status === 404) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            'Assignment tidak ditemukan, tidak berstatus ASSIGNED aktif, atau bukan milik Anda.',
        })
        return
      }

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: 'Terjadi kesalahan saat menerima tugas. Silakan coba kembali nanti.',
        })
        return
      }

      if (payload?.alreadyAccepted) {
        setFeedback({
          tone: 'success',
          message: 'Tugas sudah diterima sebelumnya.',
        })
      } else {
        setFeedback({
          tone: 'success',
          message: payload?.message || 'Berhasil menerima tugas.',
        })
      }

      router.refresh()
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Terjadi kesalahan saat menerima tugas. Silakan coba kembali nanti.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Memproses...' : 'Terima Tugas'}
        </button>
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
    </form>
  )
}
