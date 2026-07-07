'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type BillingInvoiceGenerateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  subscriptionSuggestions: string[]
}

const invoiceTypeOptions = ['RECURRING', 'INSTALLATION', 'ADJUSTMENT', 'TERMINATION'] as const

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

export function BillingInvoiceGenerateForm({
  canCreate,
  reviewDbReady,
  subscriptionSuggestions,
}: BillingInvoiceGenerateFormProps) {
  const router = useRouter()
  const now = useMemo(() => new Date(), [])
  const [serviceNo, setServiceNo] = useState(subscriptionSuggestions[0] ?? '')
  const [invoiceType, setInvoiceType] = useState<(typeof invoiceTypeOptions)[number]>('RECURRING')
  const [billingMonth, setBillingMonth] = useState(String(now.getMonth() + 1))
  const [billingYear, setBillingYear] = useState(String(now.getFullYear()))
  const [issueDate, setIssueDate] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const helperText = useMemo(() => {
    if (!canCreate) {
      return 'Role aktif belum memiliki izin create pada domain Billing.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi generate invoice dinonaktifkan agar tidak menulis ke mock.'
    }
    return 'Form ini membuat invoice recurring dari subscription ACTIVE (anti-duplikasi periode) dan menambahkan item SUBSCRIPTION otomatis.'
  }, [canCreate, reviewDbReady])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/billing/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceNo,
          invoiceType,
          billingMonth: billingMonth ? Number(billingMonth) : null,
          billingYear: billingYear ? Number(billingYear) : null,
          issueDate: issueDate || null,
          dueDate: dueDate || null,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string; invoiceNo?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Generate invoice gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || `Invoice berhasil dibuat (${payload?.invoiceNo ?? '-'})`,
      })
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Generate Invoice</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat invoice dari subscription aktif
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Service Number</span>
          <input
            list="billing-subscription-suggestions"
            value={serviceNo}
            onChange={(event) => setServiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="MS-202607-0001"
            required
            disabled={isDisabled}
          />
          <datalist id="billing-subscription-suggestions">
            {subscriptionSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Invoice Type</span>
          <select
            value={invoiceType}
            onChange={(event) => setInvoiceType(event.target.value as (typeof invoiceTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {invoiceTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Billing Month</span>
          <input
            type="number"
            value={billingMonth}
            onChange={(event) => setBillingMonth(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            min={1}
            max={12}
            disabled={isDisabled || invoiceType !== 'RECURRING'}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Billing Year</span>
          <input
            type="number"
            value={billingYear}
            onChange={(event) => setBillingYear(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            min={2020}
            max={2100}
            disabled={isDisabled || invoiceType !== 'RECURRING'}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Issue Date</span>
          <input
            type="date"
            value={issueDate}
            onChange={(event) => setIssueDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Due Date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
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
            placeholder="Opsional: konteks generate invoice (batch, operator, dll)."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            {subscriptionSuggestions.length > 0
              ? 'Saran service number diambil dari daftar subscription billing-ready pada halaman ini.'
              : 'Belum ada saran subscription billing-ready; Anda tetap bisa mengisi manual.'}
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Membuat Invoice...' : 'Generate Invoice'}
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

