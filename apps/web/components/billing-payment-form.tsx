'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type BillingPaymentFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  invoiceSuggestions: string[]
  followUpSuggestions: string[]
  initialInvoiceNo?: string
}

const paymentMethodOptions = ['TRANSFER', 'CASH', 'EWALLET', 'VA', 'OTHER'] as const

function parseFollowUpSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    invoiceNo: parts[0] ?? '',
    customerName: parts[1] ?? '',
    invoiceStatus: parts[2] ?? '-',
    total: parts[3] ?? 'Rp0',
    paid: parts[4] ?? 'Rp0',
    remaining: parts[5] ?? 'Rp0',
    invoiceDue: parts[6] ?? '-',
    followUp: parts[7] ?? '-',
    followUpState: parts[8] ?? 'UNSET',
    actionType: parts[9] ?? '-',
    collectionStatus: parts[10] ?? '-',
    suspendCandidate: parts[11] ?? 'Tidak',
    actionNotes: parts.slice(12).join(' | ') || '-',
  }
}

function toPlainAmount(value: string) {
  return value.replace(/[^0-9.,-]/g, '').trim()
}

export function BillingPaymentForm({
  canCreate,
  reviewDbReady,
  invoiceSuggestions,
  followUpSuggestions,
  initialInvoiceNo,
}: BillingPaymentFormProps) {
  const router = useRouter()
  const [invoiceNo, setInvoiceNo] = useState(initialInvoiceNo?.trim() || invoiceSuggestions[0] || '')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethodOptions)[number]>('TRANSFER')
  const [paymentDate, setPaymentDate] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const currentSuggestion =
    followUpSuggestions
      .map((item) => parseFollowUpSuggestion(item))
      .find((item) => item.invoiceNo.trim().toUpperCase() === invoiceNo.trim().toUpperCase()) ?? null

  useEffect(() => {
    if (initialInvoiceNo?.trim()) {
      setInvoiceNo(initialInvoiceNo.trim())
    }
  }, [initialInvoiceNo])

  const helperText = useMemo(() => {
    if (!canCreate) {
      return 'Role aktif belum memiliki izin create pada domain Billing.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi payment entry dinonaktifkan agar tidak menulis ke mock.'
    }
    if (
      currentSuggestion &&
      ((currentSuggestion.collectionStatus || '').trim().toUpperCase() === 'SUSPEND' ||
        (currentSuggestion.suspendCandidate || '').trim().toUpperCase() === 'YA')
    ) {
      return 'Form ini menambah pembayaran ke review DB, menyelaraskan status invoice, dan otomatis menarik invoice keluar dari jalur suspend bila pembayaran sudah mulai masuk.'
    }
    return 'Form ini menambah pembayaran ke review DB dan menyelaraskan status invoice secara aman.'
  }, [canCreate, currentSuggestion, reviewDbReady])

  useEffect(() => {
    if (!currentSuggestion) {
      return
    }

    setAmount((current) => (current.trim() ? current : toPlainAmount(currentSuggestion.remaining)))
  }, [currentSuggestion])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/billing/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNo,
          amount,
          paymentMethod,
          paymentDate: paymentDate || null,
          referenceNo,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Pembayaran gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Pembayaran berhasil disimpan.',
      })
      setAmount('')
      setPaymentMethod('TRANSFER')
      setPaymentDate('')
      setReferenceNo('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Payment Entry</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah pembayaran invoice
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nomor Invoice</span>
          <input
            list="billing-payment-invoice-suggestions"
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Masukkan invoice_no"
            required
            disabled={isDisabled}
          />
          <datalist id="billing-payment-invoice-suggestions">
            {invoiceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nominal Pembayaran</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="350000 atau Rp 350.000"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Metode Pembayaran</span>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as (typeof paymentMethodOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {paymentMethodOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tanggal Bayar</span>
          <input
            type="datetime-local"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Referensi</span>
          <input
            value={referenceNo}
            onChange={(event) => setReferenceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nomor transfer, VA, atau referensi kasir"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan penerimaan pembayaran atau konteks verifikasi"
            disabled={isDisabled}
          />
        </label>

        {currentSuggestion ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
            <div className="font-semibold text-slate-950">
              {currentSuggestion.customerName || '-'} • {currentSuggestion.invoiceNo || '-'}
            </div>
            <div className="mt-1">
              Invoice: {currentSuggestion.invoiceStatus || '-'} • Collection: {currentSuggestion.collectionStatus || '-'}
            </div>
            <div className="mt-1">
              Total {currentSuggestion.total || 'Rp0'} • Paid {currentSuggestion.paid || 'Rp0'} • Remaining {currentSuggestion.remaining || 'Rp0'}
            </div>
            <div className="mt-1">
              Due {currentSuggestion.invoiceDue || '-'} • Follow Up {currentSuggestion.followUp || '-'} • {currentSuggestion.followUpState || 'UNSET'}
            </div>
            <div className="mt-1">
              Action terakhir: {currentSuggestion.actionType || '-'} • Suspend Candidate: {currentSuggestion.suspendCandidate || 'Tidak'}
            </div>
            <div className="mt-1">Catatan terakhir: {currentSuggestion.actionNotes || '-'}</div>
          </div>
        ) : null}

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            {invoiceSuggestions.length > 0
              ? 'Saran invoice diambil dari queue invoice tindak lanjut yang sedang tampil pada halaman ini.'
              : 'Belum ada saran invoice dari review queue saat ini; Anda tetap bisa mengisi manual.'}
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Pembayaran...' : 'Simpan Pembayaran'}
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
