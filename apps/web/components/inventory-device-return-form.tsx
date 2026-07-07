'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryDeviceReturnFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  assignmentSuggestions: string[]
}

const returnStatusOptions = ['RETURNED', 'DAMAGED', 'LOST'] as const

function extractAssignmentId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function InventoryDeviceReturnForm({
  canCreate,
  reviewDbReady,
  assignmentSuggestions,
}: InventoryDeviceReturnFormProps) {
  const router = useRouter()
  const [assignmentValue, setAssignmentValue] = useState(assignmentSuggestions[0] ?? '')
  const [nextStatus, setNextStatus] = useState<(typeof returnStatusOptions)[number]>('RETURNED')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const assignmentId = extractAssignmentId(assignmentValue)
    if (!assignmentId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih assignment yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/device-assignments/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId,
          nextStatus,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Update status assignment gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Status assignment berhasil diperbarui.',
      })
      setNextStatus('RETURNED')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Inventory</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Return perangkat
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action return perangkat dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menutup assignment perangkat. Jika status RETURNED, stok akan otomatis bertambah dan movement IN dicatat.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Assignment</span>
          <input
            list="inventory-assignment-suggestions"
            value={assignmentValue}
            onChange={(event) => setAssignmentValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="55 | INV-202607-0001 | Customer"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-assignment-suggestions">
            {assignmentSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Baru</span>
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as (typeof returnStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {returnStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kondisi perangkat / alasan"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">RETURNED akan menambah stok. DAMAGED/LOST hanya mengubah status assignment.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Return...' : 'Simpan Return'}
          </button>
        </div>
      </form>

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

