'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

export type InventoryEditableItem = {
  itemCode: string
  itemName: string
  categoryCode: string | null
  unitCode: string | null
  barcode: string | null
  rackCode: string | null
  rackBarcode: string | null
  defaultPrice: number | null
  currentStock: number
  minimumStock: number
  status: string
}

type InventoryItemEditFormProps = {
  item: InventoryEditableItem | null
  canUpdate: boolean
  reviewDbReady: boolean
  onSaved?: (item: InventoryEditableItem | null, message: string) => void
  onCancel?: () => void
}

const categorySuggestionOptions = ['ROUTER', 'ONU', 'KABEL', 'AKSESORIS'] as const
const unitSuggestionOptions = ['PCS', 'UNIT', 'METER', 'ROLL'] as const
const statusOptions = ['ACTIVE', 'INACTIVE'] as const

export function InventoryItemEditForm({ item, canUpdate, reviewDbReady, onSaved, onCancel }: InventoryItemEditFormProps) {
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

  useEffect(() => {
    if (!item) {
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
      setFeedback(null)
      return
    }

    setCategoryCode(item.categoryCode || categorySuggestionOptions[0])
    setUnitCode(item.unitCode || unitSuggestionOptions[0])
    setItemName(item.itemName || '')
    setBarcode(item.barcode || '')
    setRackCode(item.rackCode || '')
    setRackBarcode(item.rackBarcode || '')
    setDefaultPrice(item.defaultPrice == null ? '' : String(item.defaultPrice))
    setMinimumStock(String(item.minimumStock ?? 0))
    setCurrentStock(String(item.currentStock ?? 0))
    setStatus(item.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE')
    setFeedback(null)
  }, [item])

  const isDisabled = !item || !canUpdate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!item || isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/inventory/items/${encodeURIComponent(item.itemCode)}`, {
        method: 'PUT',
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

      const payload = (await response.json().catch(() => null)) as
        | {
            message?: string
            item?: InventoryEditableItem | null
          }
        | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Item inventory gagal diperbarui.',
        })
        return
      }

      const message = payload?.message || 'Item inventory berhasil diperbarui.'
      setFeedback({
        tone: 'success',
        message,
      })
      onSaved?.(payload?.item ?? null, message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <p className="section-title">Update Action Inventory</p>
      <h3 className="text-xl font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950">
        {item ? `Edit item ${item.itemCode}` : 'Pilih item untuk diedit'}
      </h3>
      <p className="text-sm leading-6 text-mute">
        {!item
          ? 'Klik tombol `Edit` pada tabel untuk membuka form update item. Status item juga bisa diubah dari form ini.'
          : !canUpdate
            ? 'Role aktif belum memiliki izin update pada domain Inventory.'
            : !reviewDbReady
              ? 'Mode review database belum aktif, jadi update item dinonaktifkan agar tidak menulis ke mock.'
              : 'Gunakan form ini untuk memperbarui master item dan menonaktifkan item yang tidak lagi dipakai.'}
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kategori</span>
          <input
            list="inventory-edit-category-suggestions"
            value={categoryCode}
            onChange={(event) => setCategoryCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="ROUTER"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-edit-category-suggestions">
            {categorySuggestionOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Satuan</span>
          <input
            list="inventory-edit-unit-suggestions"
            value={unitCode}
            onChange={(event) => setUnitCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="PCS"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-edit-unit-suggestions">
            {unitSuggestionOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Nama Item</span>
          <input
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama item inventory"
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
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Edit item dipakai untuk koreksi master data. Untuk menonaktifkan item, ubah `Status` menjadi `INACTIVE`.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDisabled}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </form>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
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
