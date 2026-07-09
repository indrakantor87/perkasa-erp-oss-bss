'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryStockReceiptFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryStockReceiptForm({
  canCreate,
  reviewDbReady,
  itemSuggestions,
}: InventoryStockReceiptFormProps) {
  const router = useRouter()
  const [itemValue, setItemValue] = useState(itemSuggestions[0] ?? '')
  const [qty, setQty] = useState('1')
  const [referenceNo, setReferenceNo] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [notes, setNotes] = useState('')
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

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode,
          qty,
          referenceNo,
          supplierName,
          unitPrice,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Barang masuk gagal dicatat.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Barang masuk berhasil dicatat.',
      })
      setQty('1')
      setReferenceNo('')
      setSupplierName('')
      setUnitPrice('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Barang Masuk</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Catat penerimaan barang dengan alur sederhana
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi pencatatan barang masuk dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini dikhususkan untuk barang masuk agar gudang tidak perlu mengisi tipe movement secara manual. Saat disimpan, stok item langsung bertambah otomatis.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Item inventory</span>
          <input
            list="inventory-receipt-item-suggestions"
            value={itemValue}
            onChange={(event) => setItemValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0001 | ONU ZTE F660"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-receipt-item-suggestions">
            {itemSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Qty masuk</span>
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
          <span className="font-semibold text-slate-950">No referensi</span>
          <input
            value={referenceNo}
            onChange={(event) => setReferenceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="PO-202607-0004 / FAKTUR-0012"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Supplier / sumber barang</span>
          <input
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="PT Vendor Fiber / Transfer antar gudang"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Harga satuan</span>
          <input
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kosongkan jika tidak perlu"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan penerimaan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: barang diterima lengkap, barang masuk untuk restock toko, atau transfer stok dari pusat."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Alur ini otomatis mencatat movement `IN` dan menambah stok item tanpa perlu memilih tipe movement.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Barang Masuk...' : 'Simpan Barang Masuk'}
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
