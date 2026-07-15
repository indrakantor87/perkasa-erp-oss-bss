'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryLoanReturnFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  loanSuggestions: string[]
  initialLoanValue?: string
  embedded?: boolean
}

function extractLoanId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryLoanReturnForm({
  canUpdate,
  reviewDbReady,
  loanSuggestions,
  initialLoanValue,
  embedded = false,
}: InventoryLoanReturnFormProps) {
  const router = useRouter()
  const [loanValue, setLoanValue] = useState(initialLoanValue?.trim() || loanSuggestions[0] || '')
  const [returnQty, setReturnQty] = useState('1')
  const [returnNotes, setReturnNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialLoanValue?.trim()) {
      setLoanValue(initialLoanValue.trim())
    }
  }, [initialLoanValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const loanId = extractLoanId(loanValue)
    if (!loanId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih pinjaman inventory yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/loans/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          returnQty,
          returnNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Pengembalian pinjaman inventory gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Pengembalian pinjaman inventory berhasil diproses.',
      })
      setReturnQty('1')
      setReturnNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Pengembalian Inventory</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        Kembalikan barang pinjaman
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi pengembalian inventory dinonaktifkan agar tidak menulis ke mock.'
            : 'Gunakan alur ini saat barang pinjaman kembali ke gudang. Sistem otomatis mencatat movement `IN`, menambah stok, dan menutup pinjaman jika qty sudah kembali penuh.'}
      </p>

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'mt-6'} grid gap-4 lg:grid-cols-2`}>
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Pinjaman inventory</span>
          <input
            list="inventory-loan-suggestions"
            value={loanValue}
            onChange={(event) => setLoanValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | ILOAN-202607-0001 | BORROWED | Sisa 2"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-loan-suggestions">
            {loanSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Qty kembali</span>
          <input
            type="number"
            value={returnQty}
            onChange={(event) => setReturnQty(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            min="1"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-1">
          <span className="font-semibold text-slate-950">Catatan pengembalian</span>
          <input
            value={returnNotes}
            onChange={(event) => setReturnNotes(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: alat kembali baik, return sebagian, atau butuh cek fisik."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Sistem mendukung `return sebagian` sampai seluruh qty pinjaman kembali penuh.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Pengembalian...' : 'Proses Pengembalian'}
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
