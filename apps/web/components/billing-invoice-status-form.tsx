'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type BillingInvoiceStatusFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  invoiceSuggestions: string[]
}

export function BillingInvoiceStatusForm({
  canUpdate,
  reviewDbReady,
  invoiceSuggestions,
}: BillingInvoiceStatusFormProps) {
  const router = useRouter()
  const [invoiceNo, setInvoiceNo] = useState(invoiceSuggestions[0] ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/billing/invoices/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNo,
          nextStatus: 'CANCELLED',
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Pembatalan invoice gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Invoice berhasil dibatalkan.',
      })
      setInvoiceNo(invoiceSuggestions[0] ?? '')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Status Invoice</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Batalkan invoice yang belum terbayar
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Billing.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi update status invoice dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini hanya mengizinkan pembatalan invoice yang belum memiliki pembayaran agar histori billing tetap aman dan tidak destruktif.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nomor Invoice</span>
          <input
            list="billing-status-invoice-suggestions"
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0008"
            required
            disabled={isDisabled}
          />
          <datalist id="billing-status-invoice-suggestions">
            {invoiceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan Pembatalan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alasan cancel, koreksi periode, duplikasi invoice, atau kebutuhan operator."
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran invoice diambil dari daftar invoice billing yang sedang tampil pada halaman ini.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Membatalkan Invoice...' : 'Batalkan Invoice'}
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

