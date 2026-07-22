'use client'

import { DataSourceStatus } from '@/components/data-source-status'
import { useEffect, useMemo, useState } from 'react'
import type { DataSourceSnapshot } from '@/lib/types'

type AssetRow = {
  id: number
  assetType: string
  assetName: string
  qty: number
  purchasePrice: number
  notes: string | null
}

type InventoryAssetsPageProps = {
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

function normalizeAssetType(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_')
  if (normalized === 'ELEKTRONIK' || normalized === 'ELECTRONIC') return 'ELEKTRONIK'
  if (normalized === 'OPERASIONAL' || normalized === 'OPERATIONAL') return 'OPERASIONAL'
  if (['PERLENGKAPAN_TEKNISI', 'TECHNICIAN_GEAR', 'PERLENGKAPAN', 'TEKNISI'].includes(normalized)) return 'PERLENGKAPAN_TEKNISI'
  return normalized
}

export function InventoryAssetsPage({ source, canCreate, reviewDbReady }: InventoryAssetsPageProps) {
  const [items, setItems] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const [assetType, setAssetType] = useState('ELEKTRONIK')
  const [assetName, setAssetName] = useState('')
  const [qty, setQty] = useState('1')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [notes, setNotes] = useState('')

  const canWrite = canCreate && reviewDbReady

  async function loadItems() {
    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/inventory/assets?limit=280', { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as { message?: string; items?: AssetRow[] } | null
      if (!response.ok) {
        setItems([])
        setFeedback({ tone: 'error', message: payload?.message || 'Data asset gagal dimuat.' })
        return
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch (error) {
      setItems([])
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Data asset gagal dimuat.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const totals = useMemo(() => {
    const total = items.reduce((sum, row) => sum + Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0), 0)
    const elektronik = items
      .filter((row) => normalizeAssetType(row.assetType) === 'ELEKTRONIK')
      .reduce((sum, row) => sum + Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0), 0)
    const operasional = items
      .filter((row) => normalizeAssetType(row.assetType) === 'OPERASIONAL')
      .reduce((sum, row) => sum + Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0), 0)
    const teknisi = items
      .filter((row) => normalizeAssetType(row.assetType) === 'PERLENGKAPAN_TEKNISI')
      .reduce((sum, row) => sum + Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0), 0)
    return { total, elektronik, operasional, teknisi }
  }, [items])

  async function handleSubmit() {
    if (!canWrite) return
    setFeedback(null)

    if (!assetName.trim()) {
      setFeedback({ tone: 'error', message: 'Nama asset wajib diisi.' })
      return
    }

    try {
      const response = await fetch('/api/inventory/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetType,
          assetName: assetName.trim(),
          qty: qty.trim() || '1',
          purchasePrice,
          notes,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Asset gagal disimpan.' })
        return
      }
      setFeedback({ tone: 'success', message: payload?.message || 'Asset berhasil disimpan.' })
      setAssetType('ELEKTRONIK')
      setAssetName('')
      setQty('1')
      setPurchasePrice('')
      setNotes('')
      await loadItems()
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Asset gagal disimpan.' })
    }
  }

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Inventory</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Total Asset
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-mute">
              Akumulasi nilai asset (Elektronik, Operasional, dan Perlengkapan Teknisi yang tidak habis pakai).
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
            <article className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total</p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(totals.total)}
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Elektronik</p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(totals.elektronik)}
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Operasional</p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(totals.operasional)}
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Perlengkapan teknisi</p>
              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                {formatCurrency(totals.teknisi)}
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
              Tambah asset
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
          <select
            value={assetType}
            onChange={(event) => setAssetType(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-2"
            disabled={!canWrite}
          >
            <option value="ELEKTRONIK">Elektronik</option>
            <option value="OPERASIONAL">Operasional</option>
            <option value="PERLENGKAPAN_TEKNISI">Perlengkapan teknisi</option>
          </select>
          <input
            value={assetName}
            onChange={(event) => setAssetName(event.target.value)}
            placeholder="Nama asset"
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
              Daftar asset
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
                <th className="px-4 py-3 font-semibold">Jenis</th>
                <th className="px-4 py-3 font-semibold">Nama Asset</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Harga beli</th>
                <th className="px-4 py-3 font-semibold">Nilai</th>
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
                    Belum ada data asset.
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4 align-top text-slate-700">{index + 1}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{row.assetType}</td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-950">{row.assetName}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatNumber(row.qty)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatCurrency(row.purchasePrice)}</td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      {formatCurrency(Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0))}
                    </td>
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

