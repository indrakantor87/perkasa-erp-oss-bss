'use client'

import { DataSourceStatus } from '@/components/data-source-status'
import { useEffect, useMemo, useState } from 'react'
import type { DataSourceSnapshot } from '@/lib/types'

type DamagedItemRow = {
  id: number
  damagedDate: string
  itemName: string
  qty: number
  purchasePrice: number
  sellingPrice: number
  notes: string | null
}

type InventoryDamagedPageProps = {
  source: DataSourceSnapshot
  canCreate: boolean
  reviewDbReady: boolean
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('id-ID')
}

function formatCurrency(value: number | null | undefined) {
  if (!Number.isFinite(Number(value ?? 0))) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value ?? 0))
}

function normalizeDateInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function InventoryDamagedPage({ source, canCreate, reviewDbReady }: InventoryDamagedPageProps) {
  const [items, setItems] = useState<DamagedItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const [damagedDate, setDamagedDate] = useState('')
  const [itemName, setItemName] = useState('')
  const [qty, setQty] = useState('1')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [notes, setNotes] = useState('')

  async function loadItems() {
    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/inventory/damaged?limit=180', { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as { message?: string; items?: DamagedItemRow[] } | null
      if (!response.ok) {
        setItems([])
        setFeedback({ tone: 'error', message: payload?.message || 'Data barang rusak gagal dimuat.' })
        return
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch (error) {
      setItems([])
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Data barang rusak gagal dimuat.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const canWrite = canCreate && reviewDbReady

  const totals = useMemo(() => {
    const totalQty = items.reduce((sum, row) => sum + Number(row.qty ?? 0), 0)
    const totalPurchase = items.reduce((sum, row) => sum + Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0), 0)
    const totalSelling = items.reduce((sum, row) => sum + Number(row.sellingPrice ?? 0) * Number(row.qty ?? 0), 0)
    return { totalQty, totalPurchase, totalSelling }
  }, [items])

  async function handleSubmit() {
    if (!canWrite) return
    setFeedback(null)

    const normalizedDate = normalizeDateInput(damagedDate)
    if (!normalizedDate) {
      setFeedback({ tone: 'error', message: 'Tanggal wajib diisi.' })
      return
    }
    if (!itemName.trim()) {
      setFeedback({ tone: 'error', message: 'Item barang wajib diisi.' })
      return
    }

    try {
      const response = await fetch('/api/inventory/damaged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          damagedDate: normalizedDate,
          itemName: itemName.trim(),
          qty: qty.trim() || '1',
          purchasePrice,
          sellingPrice,
          notes,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Barang rusak gagal disimpan.' })
        return
      }
      setFeedback({ tone: 'success', message: payload?.message || 'Barang rusak berhasil disimpan.' })
      setDamagedDate('')
      setItemName('')
      setQty('1')
      setPurchasePrice('')
      setSellingPrice('')
      setNotes('')
      await loadItems()
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Barang rusak gagal disimpan.' })
    }
  }

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Inventory</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Barang Rusak
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-mute">
              Catat barang rusak untuk kebutuhan audit stok dan perhitungan nilai barang.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
            <article className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total qty</p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {formatNumber(totals.totalQty)}
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Nilai beli</p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(totals.totalPurchase)}
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Nilai jual</p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(totals.totalSelling)}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">Input</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Tambah data barang rusak
            </h2>
          </div>
          {!canWrite ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">Read-only</span>
          ) : (
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Siap input</span>
          )}
        </div>

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

        <div className="mt-4 grid gap-3 lg:grid-cols-7">
          <input
            value={damagedDate}
            onChange={(event) => setDamagedDate(event.target.value)}
            placeholder="Tanggal (YYYY-MM-DD)"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
            disabled={!canWrite}
          />
          <input
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            placeholder="Item barang"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-2"
            disabled={!canWrite}
          />
          <input
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            placeholder="Jumlah"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
            disabled={!canWrite}
          />
          <input
            value={purchasePrice}
            onChange={(event) => setPurchasePrice(event.target.value)}
            placeholder="Harga beli"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
            disabled={!canWrite}
          />
          <input
            value={sellingPrice}
            onChange={(event) => setSellingPrice(event.target.value)}
            placeholder="Harga jual"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
            disabled={!canWrite}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canWrite}
            className="rounded-2xl border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200"
          >
            Simpan
          </button>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Keterangan"
            className="min-h-[44px] rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-7"
            disabled={!canWrite}
          />
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Tabel</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Daftar barang rusak
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void loadItems()}
            className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Item Barang</th>
                <th className="px-4 py-3 font-semibold">Jumlah</th>
                <th className="px-4 py-3 font-semibold">Harga beli</th>
                <th className="px-4 py-3 font-semibold">Harga Jual</th>
                <th className="px-4 py-3 font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-mute">
                    Memuat...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-mute">
                    Belum ada data barang rusak.
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4 align-top text-slate-700">{index + 1}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{row.damagedDate}</td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-950">{row.itemName}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatNumber(row.qty)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatCurrency(row.purchasePrice)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatCurrency(row.sellingPrice)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{row.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

