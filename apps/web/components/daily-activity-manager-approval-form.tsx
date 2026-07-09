'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { dailyActivityPlanningLevelLabels } from '@/lib/daily-activity-org'
import type { DailyActivityItem } from '@/lib/services/daily-activity-service'

type DailyActivityManagerApprovalFormProps = {
  canApprove: boolean
  reviewDbReady: boolean
  approvalSuggestions: string[]
  pendingApprovals: DailyActivityItem[]
}

const decisionOptions = [
  { value: 'APPROVED', label: 'Approve' },
  { value: 'REJECTED', label: 'Reject' },
] as const

function extractActivityId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function DailyActivityManagerApprovalForm({
  canApprove,
  reviewDbReady,
  approvalSuggestions,
  pendingApprovals,
}: DailyActivityManagerApprovalFormProps) {
  const router = useRouter()
  const [activityValue, setActivityValue] = useState(approvalSuggestions[0] ?? '')
  const [decision, setDecision] = useState<(typeof decisionOptions)[number]['value']>('APPROVED')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittingBulk, setSubmittingBulk] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [bulkNotes, setBulkNotes] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const hasApprovalQueue = approvalSuggestions.length > 0
  const isDisabled = !canApprove || !reviewDbReady || !hasApprovalQueue || submitting || submittingBulk
  const helperText = useMemo(() => {
    if (!canApprove) return 'Role aktif belum diizinkan melakukan approval daily activity.'
    if (!reviewDbReady) return 'Mode review database belum aktif, jadi approval dinonaktifkan.'
    if (!hasApprovalQueue) return 'Belum ada aktivitas yang menunggu approval di scope Anda.'
    return 'Approve atau reject closing sore agar performa harian, mingguan, dan bulanan dihitung dari status yang tervalidasi.'
  }, [canApprove, hasApprovalQueue, reviewDbReady])

  const pendingById = useMemo(() => new Set(pendingApprovals.map((item) => item.id)), [pendingApprovals])
  const selectedPendingIds = useMemo(
    () => selectedIds.filter((id) => pendingById.has(id)),
    [pendingById, selectedIds],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const activityId = extractActivityId(activityValue)
    if (!activityId) {
      setFeedback({ tone: 'error', message: 'Pilih aktivitas yang valid dari daftar approval.' })
      return
    }
    if (decision === 'REJECTED' && !approvalNotes.trim()) {
      setFeedback({ tone: 'error', message: 'Catatan reject wajib diisi.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/daily-activities/approval', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, decision, approvalNotes }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Approval daily activity gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Approval daily activity berhasil disimpan.',
      })
      setActivityValue('')
      setDecision('APPROVED')
      setApprovalNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBulkApproval(decision: 'APPROVED' | 'REJECTED') {
    if (!selectedPendingIds.length) return

    if (decision === 'REJECTED' && !bulkNotes.trim()) {
      setFeedback({ tone: 'error', message: 'Catatan reject wajib diisi.' })
      return
    }

    setSubmittingBulk(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/daily-activities/approval/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityIds: selectedPendingIds,
          decision,
          approvalNotes: bulkNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Bulk approval daily activity gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Bulk approval daily activity berhasil diproses.',
      })
      setSelectedIds([])
      setBulkNotes('')
      router.refresh()
    } finally {
      setSubmittingBulk(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Approval Manager</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Approve closing sore per aktivitas
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Aktivitas menunggu approval</span>
          <input
            list="daily-activity-approval-suggestions"
            value={activityValue}
            onChange={(event) => setActivityValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | DA-202607-0012 | Leader | Teknisi / Teknisi PSB | DONE | Follow up..."
            required
            disabled={isDisabled}
          />
          <datalist id="daily-activity-approval-suggestions">
            {approvalSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Keputusan</span>
          <select
            value={decision}
            onChange={(event) => setDecision(event.target.value as (typeof decisionOptions)[number]['value'])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {decisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan approval</span>
          <input
            value={approvalNotes}
            onChange={(event) => setApprovalNotes(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder={decision === 'REJECTED' ? 'Wajib isi saat reject' : 'Opsional'}
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Approval dihitung per divisi/sub-divisi. Status `DONE` dan `PENDING` baru masuk performa setelah di-approve.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Approval...' : 'Simpan Approval'}
          </button>
        </div>
      </form>

      {pendingApprovals.length ? (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-line bg-slate-50 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Bulk approval</p>
                <p className="mt-1 text-sm text-mute">
                  Pilih beberapa aktivitas pending approval lalu approve sekaligus. Reject massal memakai catatan yang sama.
                </p>
              </div>
              <span className="badge border-amber-200 bg-amber-50 text-amber-700">
                Dipilih: {selectedPendingIds.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
                <span className="font-semibold text-slate-950">Catatan untuk bulk reject</span>
                <input
                  value={bulkNotes}
                  onChange={(event) => setBulkNotes(event.target.value)}
                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  placeholder="Wajib diisi jika bulk reject"
                  disabled={isDisabled}
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:self-end">
                <button
                  type="button"
                  onClick={() => handleBulkApproval('APPROVED')}
                  disabled={!selectedPendingIds.length || isDisabled}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submittingBulk ? 'Memproses...' : 'Approve Selected'}
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkApproval('REJECTED')}
                  disabled={!selectedPendingIds.length || isDisabled}
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Reject Selected
                </button>
              </div>
            </div>
          </div>

          {pendingApprovals.slice(0, 12).map((item) => (
            <article key={item.id} className="rounded-2xl border border-line bg-slate-50 p-5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.taskTitle}</p>
                  <p className="mt-1 text-sm text-mute">
                    {item.activityCode} • {dailyActivityPlanningLevelLabels[item.planningLevel]} • {item.plannedBy}
                  </p>
                </div>
                <span className="badge border-amber-200 bg-amber-50 text-amber-700">PENDING APPROVAL</span>
              </div>
              <div className="mt-4 space-y-1 text-sm leading-6 text-mute">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSelectedIds((prev) =>
                        checked ? Array.from(new Set([...prev, item.id])) : prev.filter((id) => id !== item.id),
                      )
                    }}
                    className="h-5 w-5 rounded border-line text-slate-950"
                    disabled={isDisabled}
                  />
                  <span className="font-semibold text-slate-950">Pilih</span>
                </label>
                <p>
                  <span className="font-semibold text-slate-700">Divisi:</span> {item.divisionName || '-'} /{' '}
                  {item.subdivisionName || '-'}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Status closing:</span> {item.executionStatus}
                </p>
                <p>
                  <span className="font-semibold text-slate-700">Ditutup:</span> {formatDateTime(item.closedAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </section>
  )
}
