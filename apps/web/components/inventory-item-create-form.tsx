'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryItemCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  embedded?: boolean
}

const categorySuggestionOptions = ['ROUTER', 'ONU', 'KABEL', 'AKSESORIS'] as const
const unitSuggestionOptions = ['PCS', 'UNIT', 'METER', 'ROLL'] as const
const statusOptions = ['ACTIVE', 'INACTIVE'] as const

export function InventoryItemCreateForm({ canCreate, reviewDbReady, embedded = false }: InventoryItemCreateFormProps) {
  const router = useRouter()
  const [categoryCode, setCategoryCode] = useState<string>(categorySuggestionOptions[0])
  const [unitCode, setUnitCode] = useState<string>(unitSuggestionOptions[0])
  const [itemName, setItemName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [rackCode, setRackCode] = useState('')
  const [rackBarcode, setRackBarcode] = useState('')
  const [defaultPrice, setDefaultPrice] = useState('')
  const [minimumStock, setMinimumStock] = useState('0')
  const [currentStock, setCurrentStock] = useState('0')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryCode: categoryCode.trim(),
          unitCode: unitCode.trim(),
          itemName,
          barcode,
          rackCode,
          rackBarcode,
          defaultPrice,
          minimumStock,
          currentStock,
          status,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Item inventory gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Item inventory berhasil disimpan.',
      })
      setCategoryCode(categorySuggestionOptions[0])
      setUnitCode(unitSuggestionOptions[0])
      setItemName('')
      setBarcode('')
      setRackCode('')
      setRackBarcode('')
      setDefaultPrice('')
      setMinimumStock('0')
      setCurrentStock('0')
      setStatus('ACTIVE')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Write Action Inventory</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        Tambah item inventory
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action inventory dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat item master inventory awal agar stok, pergerakan barang, assignment perangkat, dan generate barcode operasional mulai bisa diuji dari web.'}
      </p>

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'mt-6'} grid gap-4 lg:grid-cols-2`}>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kategori</span>
          <input
            list="inventory-category-suggestions"
            value={categoryCode}
            onChange={(event) => setCategoryCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="ROUTER"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-category-suggestions">
            {categorySuggestionOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Satuan</span>
          <input
            list="inventory-unit-suggestions"
            value={unitCode}
            onChange={(event) => setUnitCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="PCS"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-unit-suggestions">
            {unitSuggestionOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Nama Item</span>
          <input
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="ONU ZTE F660 / Router MikroTik / Kabel Dropcore"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Barcode Vendor / Serial</span>
          <input
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Barcode pabrik / serial asli perangkat"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode Rak</span>
          <input
            value={rackCode}
            onChange={(event) => setRackCode(event.target.value.toUpperCase())}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="RAK-A1-ONU-01"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Barcode Rak</span>
          <input
            value={rackBarcode}
            onChange={(event) => setRackBarcode(event.target.value.toUpperCase())}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kosongkan jika barcode rak mengikuti kode rak"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Harga Default</span>
          <input
            value={defaultPrice}
            onChange={(event) => setDefaultPrice(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="150000"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Minimum Stock</span>
          <input
            type="number"
            value={minimumStock}
            onChange={(event) => setMinimumStock(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            min="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Current Stock</span>
          <input
            type="number"
            value={currentStock}
            onChange={(event) => setCurrentStock(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            min="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof statusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Kategori dan satuan mengikuti master seed review DB. Setelah item tersimpan, QR dan Code128 operasional bisa diunduh dari panel barcode inventory.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Item...' : 'Simpan Item Inventory'}
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
