'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TechnicianOption } from './reassign-assignment-modal'

export type CreateTTAssignmentModalProps = {
  ticketCode: string
  technicians: TechnicianOption[]
  canCreateAssignment: boolean
  reviewDbReady: boolean
  defaultPrimary?: boolean
  endpointBase?: string
  triggerLabel?: string
  onSuccess?: () => void
}

type CreateTTAssignResponse = {
  success?: boolean
  assignmentId?: number
  message?: string
  errorCode?: string
}

const ASSIGNMENT_ROLE_CANONICAL = 'FIELD_TECHNICIAN'

export function CreateTTAssignmentModal({
  ticketCode,
  technicians,
  canCreateAssignment,
  reviewDbReady,
  defaultPrimary = true,
  endpointBase,
  triggerLabel = 'Assign Teknisi',
  onSuccess,
}: CreateTTAssignmentModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [targetTechUserId, setTargetTechUserId] = useState<number | ''>('')
  const [isPrimary, setIsPrimary] = useState<boolean>(defaultPrimary)
  const [notes, setNotes] = useState<string>('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string; hint?: string } | null>(null)

  const sanitizedTicketCode = String(ticketCode ?? '').trim()
  const safeEndpointBase = (endpointBase ?? '/api/support/trouble-tickets').replace(/\/+$/, '')

  const isSubmitDisabled =
    !canCreateAssignment ||
    !reviewDbReady ||
    submitting ||
    !sanitizedTicketCode ||
    targetTechUserId === '' ||
    Number(targetTechUserId) <= 0 ||
    technicians.length === 0

  function closeModal() {
    if (submitting) return
    setOpen(false)
    setTargetTechUserId('')
    setIsPrimary(defaultPrimary)
    setNotes('')
    setFeedback(null)
  }

  function openModal() {
    if (!canCreateAssignment || !reviewDbReady || submitting || !technicians.length) return
    setOpen(true)
    setTargetTechUserId('')
    setIsPrimary(defaultPrimary)
    setNotes('')
    setFeedback(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitDisabled) return

    const safeTargetId = Number(targetTechUserId)
    if (safeTargetId <= 0) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const endpoint = `${safeEndpointBase}/${encodeURIComponent(sanitizedTicketCode)}/assignments`
      const body = {
        targetTechUserId: safeTargetId,
        isPrimary: Boolean(isPrimary),
        notes: notes.trim() ? notes.trim() : undefined,
        assignmentRole: ASSIGNMENT_ROLE_CANONICAL,
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const payload = (await response.json().catch(() => null)) as CreateTTAssignResponse | null

      if (response.status === 401) {
        setFeedback({
          tone: 'error',
          message: 'Anda tidak terautentikasi atau sesi login sudah berakhir.',
        })
        return
      }

      if (response.status === 403) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Anda tidak memiliki izin untuk menugaskan teknisi pada ticket ini.',
        })
        return
      }

      if (response.status === 404) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Ticket atau teknisi tidak ditemukan.',
        })
        return
      }

      if (response.status === 400) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Input tidak valid. Periksa pilihan teknisi dan coba kembali.',
        })
        return
      }

      if (response.status === 409) {
        const code = String(payload?.errorCode ?? '').toUpperCase()
        const mapped =
          code === 'TT_ASSIGNMENT_DUPLICATE_TECH'
            ? 'Teknisi ini sudah memiliki assignment pada ticket yang sama.'
            : code === 'TT_ASSIGNMENT_DUPLICATE_PRIMARY'
              ? 'Sudah ada assignment primary aktif. Gunakan secondary assignment atau release primary terlebih dahulu.'
              : code === 'TT_ALREADY_CLOSED' || code === 'TT_STATUS_INVALID'
                ? 'Ticket sudah ditutup atau tidak valid untuk assignment baru.'
                : payload?.message || 'Terjadi konflik saat membuat assignment.'
        setFeedback({
          tone: 'error',
          message: mapped,
        })
        return
      }

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Assignment gagal dibuat. Silakan coba kembali nanti.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Assignment berhasil dibuat. Menunggu teknisi menerima tugas.',
      })

      if (typeof onSuccess === 'function') {
        try {
          onSuccess()
        } catch {
          /* swallow */
        }
      }

      router.refresh()

      setTimeout(() => {
        if (!submitting) {
          closeModal()
        }
      }, 1100)
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Terjadi kesalahan jaringan saat membuat assignment. Silakan coba kembali nanti.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!canCreateAssignment) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openModal}
          disabled={!canCreateAssignment || !reviewDbReady || submitting || technicians.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <span className="text-lg leading-none font-semibold">+</span>
          {submitting ? 'Assigning...' : triggerLabel}
        </button>
        {technicians.length === 0 && canCreateAssignment ? (
          <span className="text-xs text-amber-700">
            Loading technician list...
          </span>
        ) : null}
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
            {feedback.tone === 'success' ? 'Sukses' : 'Gagal'}
          </p>
          <p className="mt-1">{feedback.message}</p>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Assign Teknisi Ticket</h2>
              <p className="mt-1 text-sm text-slate-600">
                Ticket: <span className="font-semibold text-slate-800">{sanitizedTicketCode || '-'}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="tt-assign-tech-select" className="block text-sm font-semibold text-slate-700">
                  Pilih Teknisi
                </label>
                <select
                  id="tt-assign-tech-select"
                  value={targetTechUserId}
                  onChange={(e) => {
                    const v = e.target.value
                    setTargetTechUserId(v === '' ? '' : Number(v))
                    setFeedback(null)
                  }}
                  disabled={submitting || technicians.length === 0}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {technicians.length === 0 ? 'Loading technician list...' : '— Pilih teknisi yang akan ditugaskan —'}
                  </option>
                  {technicians.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {targetTechUserId !== '' ? (
                  <p className="text-xs text-slate-500">
                    Assignment role otomatis:{' '}
                    <span className="font-semibold">{ASSIGNMENT_ROLE_CANONICAL}</span>.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Hanya teknisi aktif dengan peran TEKNISI / TEKNISI_PSB / FIELD_TECHNICIAN.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-semibold text-slate-700">Assignment Role</span>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                    {ASSIGNMENT_ROLE_CANONICAL}
                  </span>
                  <span className="ml-3 text-xs text-slate-500">(diatur otomatis, tidak dapat diubah)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="tt-assign-primary" className="block text-sm font-semibold text-slate-700">
                  Primary Assignment
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    id="tt-assign-primary"
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => {
                      setIsPrimary(Boolean(e.target.checked))
                      setFeedback(null)
                    }}
                    disabled={submitting}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-700 focus:ring-indigo-400 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="tt-assign-primary" className="text-sm leading-6 text-slate-800">
                    Tandai sebagai primary assignment untuk PIC utama ticket ini.
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="tt-assign-notes" className="block text-sm font-semibold text-slate-700">
                  Catatan
                </label>
                <textarea
                  id="tt-assign-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="Opsional: catatan khusus untuk teknisi yang ditugaskan (misal lokasi, konteks customer)."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
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
                  onClick={closeModal}
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
                  {submitting ? 'Assigning...' : 'Assign Teknisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

CreateTTAssignmentModal.displayName = 'CreateTTAssignmentModal'
