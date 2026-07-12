'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryOdpPortAssignFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  odpSuggestions: string[]
}

function extractOdpCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryOdpPortAssignForm({
  canUpdate,
  reviewDbReady,
  odpSuggestions,
}: InventoryOdpPortAssignFormProps) {
  const router = useRouter()
  const [odpValue, setOdpValue] = useState(odpSuggestions[0] ?? '')
  const [portNo, setPortNo] = useState('1')
  const [serviceNo, setServiceNo] = useState('')
  const [customerCode, setCustomerCode] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

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
      const response = await fetch('/api/inventory/odp-ports/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odpCode,
          portNo,
          serviceNo,
          customerCode,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Assign port ODP gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Assign port ODP berhasil disimpan.',
      })
      setPortNo('1')
      setServiceNo('')
      setCustomerCode('')
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
        Assign port ODP
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action assign port dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menandai port ODP sebagai USED dan menautkan ke subscription/customer bila tersedia.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">ODP</span>
          <input
            list="inventory-odp-suggestions"
            value={odpValue}
            onChange={(event) => setOdpValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="ODP-PTI-001 | ODP Pati Kidul Blok A"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-odp-suggestions">
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
          <span className="font-semibold text-slate-950">Service No</span>
          <input
            value={serviceNo}
            onChange={(event) => setServiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="SVC-000501 (opsional)"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Customer Code</span>
          <input
            value={customerCode}
            onChange={(event) => setCustomerCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="CUST-00123 (opsional)"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Splitter slot, core label, atau catatan instalasi"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Port harus tersedia dan unik per ODP agar tidak bentrok.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Assign...' : 'Simpan Assign Port'}
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
