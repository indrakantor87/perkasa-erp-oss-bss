'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type ContractCreateProps = {
  canSign: boolean
  reviewDbReady: boolean
}

type QuotationSummary = {
  id: number
  quotationNo: string
  status: string
  customerName: string
}

function extractQuotationId(value: string) {
  const matched = String(value ?? '').trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesCorporateContractCreateForm({ canSign, reviewDbReady }: ContractCreateProps) {
  const router = useRouter()
  const [quotationValue, setQuotationValue] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [quotations, setQuotations] = useState<QuotationSummary[]>([])
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canSign || !reviewDbReady || submitting

  useEffect(() => {
    if (!reviewDbReady) return
    void (async () => {
      const response = await fetch('/api/sales/quotations')
      const payload = (await response.json().catch(() => null)) as { quotations?: QuotationSummary[] } | null
      setQuotations(payload?.quotations ?? [])
    })()
  }, [reviewDbReady])

  const readyQuotations = useMemo(
    () => quotations.filter((item) => String(item.status ?? '').trim().toUpperCase() === 'QUOTED'),
    [quotations],
  )
  const suggestions = useMemo(
    () =>
      readyQuotations.map((item) => `${item.id} | ${item.quotationNo} | ${item.customerName} | ${item.status}`),
    [readyQuotations],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const quotationId = extractQuotationId(quotationValue)
    if (!quotationId) {
      setFeedback({ tone: 'error', message: 'Pilih quotation QUOTED yang valid dari daftar saran.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/sales/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId,
          notes,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Kontrak corporate gagal disimpan.' })
        return
      }

      setFeedback({ tone: 'success', message: payload?.message || 'Kontrak corporate berhasil disimpan.' })
      setQuotationValue('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Corporate (Dedicated) Flow</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Kunci kontrak corporate
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canSign
          ? 'Role aktif belum memiliki izin update pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi kontrak corporate dinonaktifkan.'
            : 'Kontrak akan mengubah lead corporate menjadi CONTRACT_SIGNED agar delivery boleh dimulai.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Quotation QUOTED</span>
          <input
            list="sales-corporate-contract-quotation-suggestions"
            value={quotationValue}
            onChange={(event) => setQuotationValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | QTN-202607-0001 | PT ABC | QUOTED"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-corporate-contract-quotation-suggestions">
            {suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan kontrak</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nomor dokumen, PIC legal, catatan SLA, termin billing, dll."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Guardrail corporate aktif setelah status CONTRACT_SIGNED.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Kontrak'}
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

