'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryOdpPortStatusFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  odpSuggestions: string[]
}

const portStatusOptions = ['AVAILABLE', 'RESERVED', 'FAULTY', 'DISABLED'] as const

function extractOdpCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryOdpPortStatusForm({
  canCreate,
  reviewDbReady,
  odpSuggestions,
}: InventoryOdpPortStatusFormProps) {
  const router = useRouter()
  const [odpValue, setOdpValue] = useState(odpSuggestions[0] ?? '')
  const [portNo, setPortNo] = useState('1')
  const [portStatus, setPortStatus] = useState<(typeof portStatusOptions)[number]>('RESERVED')
  const [clearMapping, setClearMapping] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const odpCode = extractOdpCode(odpValue)
    if (!odpCode) {
      setFeedback({
        tone: 'error',
        message: 'Pilih ODP yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/odp-ports/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odpCode,
          portNo,
          portStatus,
          clearMapping,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Update status port gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Status port berhasil diperbarui.',
      })
      setPortNo('1')
      setPortStatus('RESERVED')
      setClearMapping(true)
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
        Update status port ODP
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action update port dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mengubah status port ODP (AVAILABLE/RESERVED/FAULTY/DISABLED). Jika port sebelumnya USED, Anda bisa mengosongkan mapping agar port bisa dipakai ulang.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">ODP</span>
          <input
            list="inventory-odp-status-suggestions"
            value={odpValue}
            onChange={(event) => setOdpValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="ODP-PTI-001 | ODP Pati Kidul Blok A"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-odp-status-suggestions">
            {odpSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Port No</span>
          <input
            type="number"
            min="1"
            max="512"
            value={portNo}
            onChange={(event) => setPortNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={portStatus}
            onChange={(event) => setPortStatus(event.target.value as (typeof portStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {portStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-700 lg:col-span-2">
          <input
            type="checkbox"
            checked={clearMapping}
            onChange={(event) => setClearMapping(event.target.checked)}
            disabled={isDisabled}
          />
          <span>Kosongkan mapping subscription/customer</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alasan reserved/faulty/disabled atau catatan kondisi port"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Status USED tidak di-set dari form ini. Untuk USED gunakan form assign port.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Status...' : 'Simpan Status Port'}
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

