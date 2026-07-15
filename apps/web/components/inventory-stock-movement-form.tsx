'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InventoryItemScanAssist } from '@/components/inventory-item-scan-assist'

type InventoryStockMovementFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  rackSuggestions: string[]
  requireScan: boolean
  initialItemValue?: string
  embedded?: boolean
}

const movementTypeOptions = ['IN', 'OUT', 'ADJUSTMENT'] as const

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryStockMovementForm({
  canCreate,
  reviewDbReady,
  itemSuggestions,
  rackSuggestions,
  requireScan,
  initialItemValue,
  embedded = false,
}: InventoryStockMovementFormProps) {
  const router = useRouter()
  const [itemValue, setItemValue] = useState(initialItemValue || itemSuggestions[0] || '')
  const [scanValue, setScanValue] = useState('')
  const [movementType, setMovementType] = useState<(typeof movementTypeOptions)[number]>('IN')
  const [referenceNo, setReferenceNo] = useState('')
  const [qty, setQty] = useState('1')
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
    const scannedRackBarcode = extractItemCode(scanValue)
    if (requireScan && movementType === 'OUT') {
      if (!scannedRackBarcode) {
        setFeedback({
          tone: 'error',
          message: 'Scan barcode rak wajib dilakukan sebelum movement OUT disimpan.',
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
      const response = await fetch('/api/inventory/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemCode,
          movementType,
          referenceNo,
          qty,
          unitPrice,
          notes,
          scannedRackBarcode: requireScan && movementType === 'OUT' ? scannedRackBarcode : '',
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Stock movement gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Stock movement berhasil disimpan.',
      })
      setMovementType('IN')
      setReferenceNo('')
      setQty('1')
      setUnitPrice('')
      setNotes('')
      setScanValue('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Write Action Inventory</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        Catat stock movement
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action stock movement dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mencatat pergerakan stok masuk, keluar, atau adjustment agar item inventory yang sudah dibuat langsung punya histori operasional.'}
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
              Scan barcode rak diwajibkan saat movement `OUT`. Movement `IN` dan `ADJUSTMENT` tetap bisa tanpa scan.
            </div>
          ) : null}
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Item Inventory</span>
          <input
            list="inventory-item-suggestions"
            value={itemValue}
            onChange={(event) => setItemValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0001 | ONU ZTE F660"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-item-suggestions">
            {itemSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tipe Movement</span>
          <select
            value={movementType}
            onChange={(event) => setMovementType(event.target.value as (typeof movementTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {movementTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Reference No</span>
          <input
            value={referenceNo}
            onChange={(event) => setReferenceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="PO-202607-0004 / WO-202607-0021"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Qty</span>
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
          <span className="font-semibold text-slate-950">Harga Satuan</span>
          <input
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kosongkan jika tidak perlu"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan penerimaan barang, alokasi ke teknisi, atau adjustment stok"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran item diambil dari review item inventory terbaru yang tampil pada halaman Inventory.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Movement...' : 'Simpan Stock Movement'}
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
