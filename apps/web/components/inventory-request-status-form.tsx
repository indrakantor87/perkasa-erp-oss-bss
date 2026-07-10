'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryRequestStatusFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  requestSuggestions: string[]
  initialRequestValue?: string
}

const statusOptions = [
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Selesai' },
] as const

function extractRequestId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryRequestStatusForm({
  canCreate,
  reviewDbReady,
  requestSuggestions,
  initialRequestValue,
}: InventoryRequestStatusFormProps) {
  const router = useRouter()
  const [requestValue, setRequestValue] = useState(initialRequestValue?.trim() || requestSuggestions[0] || '')
  const [nextStatus, setNextStatus] = useState<(typeof statusOptions)[number]['value']>('ON_PROGRESS')
  const [pendingReason, setPendingReason] = useState('')
  const [processNotes, setProcessNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialRequestValue?.trim()) {
      setRequestValue(initialRequestValue.trim())
    }
  }, [initialRequestValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const requestId = extractRequestId(requestValue)
    if (!requestId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih request inventory yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/requests/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          nextStatus,
          pendingReason,
          processNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Status request inventory gagal diperbarui.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Status request inventory berhasil diperbarui.',
      })
      setNextStatus('ON_PROGRESS')
      setPendingReason('')
      setProcessNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Processing Inventory</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Ubah status request barang
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi proses request inventory dinonaktifkan agar tidak menulis ke mock.'
            : 'Saat status diubah ke `Selesai`, sistem otomatis membuat stock movement keluar dan mengurangi stok item inventory.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Request inventory</span>
          <input
            list="inventory-request-status-suggestions"
            value={requestValue}
            onChange={(event) => setRequestValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | IREQ-202607-0001 | Teknisi PSB | REQUEST"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-request-status-suggestions">
            {requestSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status berikutnya</span>
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as (typeof statusOptions)[number]['value'])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Alasan pending</span>
          <input
            value={pendingReason}
            onChange={(event) => setPendingReason(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Wajib saat status Pending"
            disabled={isDisabled || nextStatus !== 'PENDING'}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan proses</span>
          <textarea
            value={processNotes}
            onChange={(event) => setProcessNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: sedang disiapkan gudang, menunggu approval, atau barang sudah diserahkan ke teknisi."
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Status yang dipakai: `Request`, `On Progress`, `Pending`, dan `Selesai`, dengan konteks
            sub-divisi teknisi agar proses gudang lebih akurat.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Status...' : 'Simpan Status Request'}
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
