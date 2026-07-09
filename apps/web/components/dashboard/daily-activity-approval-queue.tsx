'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DashboardDailyActivityApprovalQueue } from '@/lib/types'

type DailyActivityApprovalQueueProps = {
  queue: DashboardDailyActivityApprovalQueue
}

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

function formatActivityDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function DailyActivityApprovalQueue({ queue }: DailyActivityApprovalQueueProps) {
  const router = useRouter()
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [submittingBulk, setSubmittingBulk] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({})
  const [bulkNotes, setBulkNotes] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const hasPendingItems = queue.pendingItems.length > 0
  const pendingById = useMemo(() => new Set(queue.pendingItems.map((item) => item.activityId)), [queue.pendingItems])

  const selectedPendingIds = useMemo(
    () => selectedIds.filter((id) => pendingById.has(id)),
    [pendingById, selectedIds],
  )

  async function submitApproval(activityId: number, decision: 'APPROVED' | 'REJECTED') {
    if (!pendingById.has(activityId)) return

    const approvalNotes = rejectNotes[activityId] ?? ''
    if (decision === 'REJECTED' && !approvalNotes.trim()) {
      setFeedback({ tone: 'error', message: 'Catatan reject wajib diisi.' })
      return
    }

    setSubmittingId(activityId)
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
      setRejectNotes((prev) => {
        const next = { ...prev }
        delete next[activityId]
        return next
      })
      router.refresh()
    } finally {
      setSubmittingId(null)
    }
  }

  async function submitBulkApproval(decision: 'APPROVED' | 'REJECTED') {
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Approval Queue</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Daily activity menunggu approval
          </h3>
          <p className="mt-3 text-sm leading-6 text-mute">
            Ringkasan ini membantu manager memproses closing sore yang masih pending agar performa harian tetap valid.
          </p>
        </div>
        <a href={queue.href} className="badge border-slate-200 bg-white text-slate-600">
          Lihat detail ({formatNumber(queue.totalPending)})
        </a>
      </div>

      {hasPendingItems ? (
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
                Dipilih: {formatNumber(selectedPendingIds.length)}
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
                  disabled={submittingBulk || submittingId !== null}
                />
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:self-end">
                <button
                  type="button"
                  onClick={() => submitBulkApproval('APPROVED')}
                  disabled={!selectedPendingIds.length || submittingBulk || submittingId !== null}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submittingBulk ? 'Memproses...' : 'Approve Selected'}
                </button>
                <button
                  type="button"
                  onClick={() => submitBulkApproval('REJECTED')}
                  disabled={!selectedPendingIds.length || submittingBulk || submittingId !== null}
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  Reject Selected
                </button>
              </div>
            </div>
          </div>

          {queue.pendingItems.map((item) => (
            <article key={item.activityId} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.taskTitle}</p>
                  <p className="mt-1 text-sm text-mute">
                    {item.activityCode} • {formatActivityDate(item.activityDate)} • {item.plannedBy}
                  </p>
                  <p className="mt-2 text-sm text-mute">
                    {item.divisionName || 'Tanpa divisi'}
                    {item.subdivisionName ? ` / ${item.subdivisionName}` : ''} • {item.executionStatus}
                  </p>
                </div>
                <span className="badge border-amber-200 bg-amber-50 text-amber-700">PENDING APPROVAL</span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.activityId)}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSelectedIds((prev) =>
                        checked ? Array.from(new Set([...prev, item.activityId])) : prev.filter((id) => id !== item.activityId),
                      )
                    }}
                    className="h-5 w-5 rounded border-line text-slate-950"
                    disabled={submittingBulk || submittingId !== null}
                  />
                  <span className="font-semibold text-slate-950">Pilih</span>
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
                  <span className="font-semibold text-slate-950">Catatan reject (opsional saat approve)</span>
                  <input
                    value={rejectNotes[item.activityId] ?? ''}
                    onChange={(event) =>
                      setRejectNotes((prev) => ({
                        ...prev,
                        [item.activityId]: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    placeholder="Wajib diisi jika reject"
                    disabled={submittingBulk || submittingId === item.activityId}
                  />
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:col-span-3 lg:self-end">
                  <button
                    type="button"
                    onClick={() => submitApproval(item.activityId, 'APPROVED')}
                    disabled={submittingBulk || submittingId !== null}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submittingId === item.activityId ? 'Memproses...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => submitApproval(item.activityId, 'REJECTED')}
                    disabled={submittingBulk || submittingId !== null}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {queue.totalPending > 0 ? (
          queue.items.map((item) => (
            <article key={`${item.divisionName}-${item.subdivisionName}`} className="rounded-2xl border border-line bg-slate-50 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {item.divisionName || 'Tanpa divisi'}
                    {item.subdivisionName ? ` / ${item.subdivisionName}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-mute">Pending approval daily activity</p>
                </div>
                <span className="badge border-amber-200 bg-amber-50 text-amber-700">
                  {formatNumber(item.pendingCount)} item
                </span>
              </div>
            </article>
          ))
        ) : (
          <article className="rounded-2xl border border-dashed border-line bg-slate-50 p-6 text-sm leading-6 text-mute">
            Tidak ada daily activity yang menunggu approval pada scope ini.
          </article>
        )}
      </div>

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
