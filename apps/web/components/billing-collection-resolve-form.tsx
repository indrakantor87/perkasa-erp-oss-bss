'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type BillingCollectionResolveFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  followUpSuggestions: string[]
  initialInvoiceNo?: string
}

const resolutionStatusOptions = ['DONE', 'CANCELLED'] as const

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

export function BillingCollectionResolveForm({
  canUpdate,
  reviewDbReady,
  followUpSuggestions,
  initialInvoiceNo,
}: BillingCollectionResolveFormProps) {
  const router = useRouter()
  const [invoiceNo, setInvoiceNo] = useState(initialInvoiceNo?.trim() || parseFollowUpSuggestion(followUpSuggestions[0] ?? '').invoiceNo)
  const [resolutionStatus, setResolutionStatus] = useState<(typeof resolutionStatusOptions)[number]>('DONE')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting
  const currentSuggestion = useMemo(
    () =>
      followUpSuggestions
        .map((item) => parseFollowUpSuggestion(item))
        .find((item) => item.invoiceNo.trim().toUpperCase() === invoiceNo.trim().toUpperCase()) ?? null,
    [followUpSuggestions, invoiceNo],
  )

  useEffect(() => {
    if (initialInvoiceNo?.trim()) {
      setInvoiceNo(initialInvoiceNo.trim())
    }
  }, [initialInvoiceNo])
  const helperText = useMemo(() => {
    if (!canUpdate) {
      return 'Role aktif belum memiliki izin update pada domain Billing.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi resolve collection dinonaktifkan agar tidak menulis ke mock.'
    }

    const actionType = (currentSuggestion?.actionType || '').trim().toUpperCase()
    if (actionType === 'PROMISE_TO_PAY') {
      return 'Resolve janji bayar akan menutup action aktif dan mengembalikan invoice ke jalur follow-up normal agar operator tidak meninggalkan status janji bayar yang sudah selesai atau batal.'
    }
    if (actionType === 'SUSPEND') {
      return resolutionStatus === 'CANCELLED'
        ? 'Membatalkan resolve suspend juga akan mencabut sinyal suspend agar invoice kembali ke jalur follow-up normal.'
        : 'Resolve suspend mempertahankan sinyal suspend yang sudah aktif sampai operator billing benar-benar mengubah status invoice.'
    }
    if (actionType === 'RECONNECT') {
      return 'Resolve reconnect hanya menutup action follow-up aktif; invoice tetap berada di jalur reconnect sampai status invoice benar-benar diaktifkan lagi.'
    }
    return 'Form ini menutup follow-up collection OPEN terbaru per invoice secara aman saat reminder, call, atau visit sudah selesai atau dibatalkan.'
  }, [canUpdate, currentSuggestion?.actionType, resolutionStatus, reviewDbReady])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/billing/collection-actions/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNo,
          resolutionStatus,
          resolutionNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Resolve collection follow-up gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Resolve collection follow-up berhasil disimpan.',
      })
      setResolutionStatus('DONE')
      setResolutionNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Resolve Collection</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Selesaikan follow-up collection
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nomor Invoice</span>
          <input
            list="billing-follow-up-invoice-suggestions"
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Masukkan invoice_no"
            required
            disabled={isDisabled}
          />
          <datalist id="billing-follow-up-invoice-suggestions">
            {followUpSuggestions.map((item) => {
              const suggestion = parseFollowUpSuggestion(item)
              return <option key={item} value={suggestion.invoiceNo} label={`${suggestion.invoiceNo} - ${suggestion.customerName}`} />
            })}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Resolve</span>
          <select
            value={resolutionStatus}
            onChange={(event) => setResolutionStatus(event.target.value as (typeof resolutionStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {resolutionStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Resolve</span>
          <textarea
            value={resolutionNotes}
            onChange={(event) => setResolutionNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: customer sudah membayar, janji bayar dibatalkan, atau reminder selesai ditindaklanjuti."
            required
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
              Action aktif: {currentSuggestion.actionType || '-'} • Suspend Candidate: {currentSuggestion.suspendCandidate || 'Tidak'}
            </div>
            <div className="mt-1">Catatan aktif: {currentSuggestion.actionNotes || '-'}</div>
          </div>
        ) : null}

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Resolve memakai queue follow-up collection OPEN yang sedang tampil agar operator menutup action berdasarkan konteks invoice aktif.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Resolve...' : 'Simpan Resolve Collection'}
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
