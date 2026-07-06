'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type BillingCollectionActionFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  invoiceSuggestions: string[]
}

const actionTypeOptions = ['REMINDER', 'CALL', 'VISIT', 'PROMISE_TO_PAY', 'SUSPEND', 'RECONNECT', 'WRITE_OFF'] as const
const actionStatusOptions = ['OPEN', 'DONE', 'CANCELLED'] as const

export function BillingCollectionActionForm({
  canCreate,
  reviewDbReady,
  invoiceSuggestions,
}: BillingCollectionActionFormProps) {
  const router = useRouter()
  const [invoiceNo, setInvoiceNo] = useState(invoiceSuggestions[0] ?? '')
  const [actionType, setActionType] = useState<(typeof actionTypeOptions)[number]>('REMINDER')
  const [actionStatus, setActionStatus] = useState<(typeof actionStatusOptions)[number]>('OPEN')
  const [dueFollowUpAt, setDueFollowUpAt] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const helperText = useMemo(() => {
    if (!canCreate) {
      return 'Role aktif belum memiliki izin create pada domain Billing.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi write action sengaja dinonaktifkan agar tidak menulis ke mock.'
    }
    return 'Form ini menambah histori collection action tanpa mengubah data inti invoice secara destruktif.'
  }, [canCreate, reviewDbReady])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/billing/collection-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNo,
          actionType,
          actionStatus,
          dueFollowUpAt: dueFollowUpAt || null,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Collection action gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Collection action berhasil disimpan.',
      })
      setActionType('REMINDER')
      setActionStatus('OPEN')
      setDueFollowUpAt('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Billing</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah collection action ke review DB
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nomor Invoice</span>
          <input
            list="billing-invoice-suggestions"
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Masukkan invoice_no"
            required
            disabled={isDisabled}
          />
          <datalist id="billing-invoice-suggestions">
            {invoiceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Action Type</span>
          <select
            value={actionType}
            onChange={(event) => setActionType(event.target.value as (typeof actionTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {actionTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Action Status</span>
          <select
            value={actionStatus}
            onChange={(event) => setActionStatus(event.target.value as (typeof actionStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {actionStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Follow Up</span>
          <input
            type="datetime-local"
            value={dueFollowUpAt}
            onChange={(event) => setDueFollowUpAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan reminder, janji bayar, atau konteks tindakan..."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            {invoiceSuggestions.length > 0
              ? `Saran invoice diambil dari queue invoice tindak lanjut yang sedang tampil pada halaman ini.`
              : 'Belum ada saran invoice dari review queue saat ini; Anda tetap bisa mengisi manual.'}
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Collection Action'}
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
