'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InventoryItemScanAssist } from '@/components/inventory-item-scan-assist'

type InventoryItemLoanFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  rackSuggestions: string[]
  requireScan: boolean
  initialItemValue?: string
  embedded?: boolean
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryItemLoanForm({
  canCreate,
  reviewDbReady,
  itemSuggestions,
  rackSuggestions,
  requireScan,
  initialItemValue,
  embedded = false,
}: InventoryItemLoanFormProps) {
  const router = useRouter()
  const [itemValue, setItemValue] = useState(initialItemValue || itemSuggestions[0] || '')
  const [scanValue, setScanValue] = useState('')
  const [qty, setQty] = useState('1')
  const [borrowerName, setBorrowerName] = useState('')
  const [borrowerDivision, setBorrowerDivision] = useState('Teknisi')
  const [borrowerSubdivision, setBorrowerSubdivision] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [loanNotes, setLoanNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const itemCode = extractItemCode(itemValue)
    if (!itemCode) {
      setFeedback({
        tone: 'error',
        message: 'Pilih item inventory yang valid dari daftar saran.',
      })
      return
    }
    const scannedRackBarcode = extractItemCode(scanValue)
    if (requireScan) {
      if (!scannedRackBarcode) {
        setFeedback({
          tone: 'error',
          message: 'Scan barcode rak wajib dilakukan sebelum pinjaman barang disimpan.',
        })
        return
      }
      const matchedRack = rackSuggestions.find((item) => item.split('|')[0]?.trim().toUpperCase() === scannedRackBarcode.toUpperCase())
      const matchedItemCode = matchedRack?.split('|')[1]?.trim() ?? ''
      if (matchedItemCode.toUpperCase() !== itemCode.toUpperCase()) {
        setFeedback({
          tone: 'error',
          message: `Barcode rak tidak cocok. Form memilih ${itemCode}, tetapi barcode rak terbaca untuk ${matchedItemCode || 'item lain'}.`,
        })
        return
      }
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode,
          qty,
          borrowerName,
          borrowerDivision,
          borrowerSubdivision,
          dueAt,
          loanNotes,
          scannedRackBarcode: requireScan ? scannedRackBarcode : '',
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Pinjaman inventory gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Pinjaman inventory berhasil disimpan.',
      })
      setQty('1')
      setBorrowerName('')
      setBorrowerDivision('Teknisi')
      setBorrowerSubdivision('')
      setDueAt('')
      setLoanNotes('')
      setScanValue('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Pinjaman Inventory</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        Pinjamkan barang yang wajib kembali
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi pinjaman inventory dinonaktifkan agar tidak menulis ke mock.'
            : 'Gunakan alur ini untuk barang yang sifatnya dipinjam: stok langsung berkurang saat barang diserahkan, lalu wajib dipulihkan kembali saat pengembalian diproses.'}
      </p>

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'mt-6'} grid gap-4 lg:grid-cols-2`}>
        <div className="lg:col-span-2">
          <InventoryItemScanAssist
            itemSuggestions={rackSuggestions}
            disabled={isDisabled}
            onResolved={(value) => {
              setScanValue(value)
            }}
          />
          {requireScan ? (
            <div className="mt-2 text-sm text-mute">
              Untuk role ini, scan barcode rak wajib sebelum barang dipinjamkan keluar dari GA.
            </div>
          ) : null}
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Item inventory</span>
          <input
            list="inventory-loan-item-suggestions"
            value={itemValue}
            onChange={(event) => setItemValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0001 | Tang Crimping"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-loan-item-suggestions">
            {itemSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Qty pinjam</span>
          <input
            type="number"
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            min="1"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama peminjam</span>
          <input
            value={borrowerName}
            onChange={(event) => setBorrowerName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Fadil / Tim Gudang / NOC Shift A"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi peminjam</span>
          <input
            value={borrowerDivision}
            onChange={(event) => setBorrowerDivision(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Teknisi / Operasional / NOC"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sub-divisi / tim</span>
          <input
            value={borrowerSubdivision}
            onChange={(event) => setBorrowerSubdivision(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Teknisi PSB / Jalur Expan / Kantor / Toko"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Target pengembalian</span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan pinjaman</span>
          <textarea
            value={loanNotes}
            onChange={(event) => setLoanNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: dipakai troubleshooting lapangan 2 hari, pinjam alat jointer, atau alat backup NOC."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saat pinjaman dibuat, sistem otomatis mencatat movement `OUT` dan mengurangi stok item.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Pinjaman...' : 'Simpan Pinjaman Barang'}
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
