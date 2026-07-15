'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type QuotationApprovalProps = {
  canApprove: boolean
  reviewDbReady: boolean
}

type QuotationSummary = {
  id: number
  quotationNo: string
  status: string
  customerName: string
}

const decisionOptions = [
  { value: 'APPROVED', label: 'Approve' },
  { value: 'REJECTED', label: 'Reject' },
] as const

function extractQuotationId(value: string) {
  const matched = String(value ?? '').trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesCorporateQuotationApprovalForm({ canApprove, reviewDbReady }: QuotationApprovalProps) {
  const router = useRouter()
  const [quotationValue, setQuotationValue] = useState('')
  const [decision, setDecision] = useState<(typeof decisionOptions)[number]['value']>('APPROVED')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [quotations, setQuotations] = useState<QuotationSummary[]>([])
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canApprove || !reviewDbReady || submitting

  useEffect(() => {
    if (!reviewDbReady) return
    void (async () => {
      const response = await fetch('/api/sales/quotations')
      const payload = (await response.json().catch(() => null)) as { quotations?: QuotationSummary[] } | null
      setQuotations(payload?.quotations ?? [])
    })()
  }, [reviewDbReady])

  const suggestions = useMemo(
    () =>
      quotations.map((item) => `${item.id} | ${item.quotationNo} | ${item.customerName} | ${item.status}`),
    [quotations],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const quotationId = extractQuotationId(quotationValue)
    if (!quotationId) {
      setFeedback({ tone: 'error', message: 'Pilih quotation yang valid dari daftar saran.' })
      return
    }
    if (decision === 'REJECTED' && !approvalNotes.trim()) {
      setFeedback({ tone: 'error', message: 'Catatan reject wajib diisi.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/sales/quotations/${quotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          approvalNotes,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Approval quotation gagal diproses.' })
        return
      }

      setFeedback({ tone: 'success', message: payload?.message || 'Approval quotation berhasil diproses.' })
      setQuotationValue('')
      setDecision('APPROVED')
      setApprovalNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Corporate (Dedicated) Flow</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Approval quotation corporate
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canApprove
          ? 'Role aktif belum memiliki izin update pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi approval quotation dinonaktifkan.'
            : 'Approve untuk mengubah quotation menjadi QUOTED. Reject untuk mengembalikan lead ke tahap revisi.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Quotation menunggu keputusan</span>
          <input
            list="sales-corporate-quotation-suggestions"
            value={quotationValue}
            onChange={(event) => setQuotationValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | QTN-202607-0001 | PT ABC | INTERNAL_APPROVAL"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-corporate-quotation-suggestions">
            {suggestions.map((item) => (
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
          <div className="text-sm text-mute">Corporate guardrail: no contract/no delivery.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses...' : 'Simpan Keputusan'}
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

