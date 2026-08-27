'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ReleaseAssignmentButtonProps = {
  assignmentId: number
  canRelease: boolean
  reviewDbReady: boolean
}

type ReleaseRouteResponse = {
  affectedRows?: number
  alreadyReleased?: boolean
  message?: string
}

export function ReleaseAssignmentButton({
  assignmentId,
  canRelease,
  reviewDbReady,
}: ReleaseAssignmentButtonProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canRelease || !reviewDbReady || submitting

  if (!canRelease) {
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const safeAssignmentId = encodeURIComponent(String(assignmentId))
      const response = await fetch(`/api/sales/work-orders/assignments/${safeAssignmentId}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const payload = (await response.json().catch(() => null)) as ReleaseRouteResponse | null

      if (response.status === 401) {
        setFeedback({
          tone: 'error',
          message: 'Anda tidak terautentikasi atau sesi login sudah berakhir.',
        })
        return
      }

      if (response.status === 404) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            'Assignment tidak ditemukan, tidak aktif, atau Anda tidak berhak melepaskan tugas ini.',
        })
        return
      }

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: 'Terjadi kesalahan saat melepaskan tugas. Silakan coba kembali nanti.',
        })
        return
      }

      if (payload?.alreadyReleased) {
        setFeedback({
          tone: 'success',
          message: 'Tugas sudah dilepaskan sebelumnya.',
        })
      } else {
        setFeedback({
          tone: 'success',
          message: payload?.message || 'Tugas berhasil dilepaskan.',
        })
      }

      router.refresh()
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Terjadi kesalahan saat melepaskan tugas. Silakan coba kembali nanti.',
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
          className="inline-flex items-center justify-center rounded-full bg-amber-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Memproses...' : 'Lepas Tugas'}
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
