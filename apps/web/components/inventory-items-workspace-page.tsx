'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DataSourceStatus } from '@/components/data-source-status'
import { InventoryItemBarcodePanel } from '@/components/inventory-item-barcode-panel'
import { InventoryItemCreateForm } from '@/components/inventory-item-create-form'
import { InventoryItemEditForm, type InventoryEditableItem } from '@/components/inventory-item-edit-form'
import { buildInventoryBarcodeDetailPath } from '@/lib/inventory-barcode-utils'
import type { DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import type { DataSourceSnapshot, DomainReviewSection } from '@/lib/types'

type InventoryItemListRow = {
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
  updatedAt: string | null
}

type InventoryItemsWorkspacePageProps = {
  source: DataSourceSnapshot
  sections: DomainReviewSection[]
  lifecycleItems: DeviceLifecycleLogRow[]
  canCreate: boolean
  canUpdate: boolean
  reviewDbReady: boolean
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('id-ID')
}

function formatCurrency(value: number | null | undefined) {
  if (!Number.isFinite(Number(value ?? 0))) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

export function InventoryItemsWorkspacePage({
  source,
  sections,
  lifecycleItems,
  canCreate,
  canUpdate,
  reviewDbReady,
}: InventoryItemsWorkspacePageProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [items, setItems] = useState<InventoryItemListRow[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null)

  async function loadItems(nextQuery: string, nextStatus: 'ALL' | 'ACTIVE' | 'INACTIVE') {
    setLoading(true)
    setFeedback(null)

    try {
      const params = new URLSearchParams()
      if (nextQuery.trim()) {
        params.set('query', nextQuery.trim())
      }
      if (nextStatus !== 'ALL') {
        params.set('status', nextStatus)
      }
      params.set('limit', '120')

      const response = await fetch(`/api/inventory/items?${params.toString()}`, { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; items?: InventoryItemListRow[] }
        | null

      if (!response.ok) {
        setItems([])
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Data barang inventory gagal dimuat.',
        })
        return
      }

      setItems(Array.isArray(payload?.items) ? payload.items : [])
    } catch (error) {
      setItems([])
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Data barang inventory gagal dimuat.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems(query, status)
  }, [query, status])

  const selectedItem = useMemo<InventoryEditableItem | null>(() => {
    if (!selectedItemCode) {
      return null
    }
    return items.find((item) => item.itemCode === selectedItemCode) ?? null
  }, [items, selectedItemCode])

  const summaries = useMemo(() => {
    const total = items.length
    const active = items.filter((item) => String(item.status).trim().toUpperCase() === 'ACTIVE').length
    const lowStock = items.filter((item) => Number(item.currentStock) <= Number(item.minimumStock)).length
    const mappedRack = items.filter((item) => String(item.rackCode ?? '').trim()).length
    return { total, active, lowStock, mappedRack }
  }, [items])

  async function handleDeactivate(item: InventoryItemListRow) {
    if (!canUpdate || !reviewDbReady || item.status.toUpperCase() === 'INACTIVE') {
      return
    }

    const confirmed = window.confirm(`Nonaktifkan item ${item.itemCode} (${item.itemName})?`)
    if (!confirmed) {
      return
    }

    setFeedback(null)

    try {
      const response = await fetch(`/api/inventory/items/${encodeURIComponent(item.itemCode)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryCode: item.categoryCode,
          unitCode: item.unitCode,
          itemName: item.itemName,
          barcode: item.barcode,
          rackCode: item.rackCode,
          rackBarcode: item.rackBarcode,
          defaultPrice: item.defaultPrice,
          minimumStock: item.minimumStock,
          currentStock: item.currentStock,
          status: 'INACTIVE',
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string; item?: InventoryItemListRow | null } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Item inventory gagal dinonaktifkan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || `Item ${item.itemCode} berhasil dinonaktifkan.`,
      })
      setSelectedItemCode(payload?.item?.itemCode ?? item.itemCode)
      await loadItems(query, status)
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Item inventory gagal dinonaktifkan.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <div>
          <div>
            <p className="section-title">Data Barang Inventory</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Master item inventory untuk input data dan generate barcode
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-mute">
              Halaman ini difokuskan ke data master inventory: tambah item, edit item, deactivate item, dan buka detail barcode
              tanpa membawa panel menu lain ke dalam workspace ini.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total item</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(summaries.total)}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Item aktif</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(summaries.active)}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Stok menipis</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(summaries.lowStock)}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Sudah ke rak</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(summaries.mappedRack)}
          </p>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Daftar Item</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Cari item, cek stok, dan lompat ke detail barcode
            </h2>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kode item, nama item, barcode, atau rak"
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 md:w-80"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Satuan</th>
                <th className="px-4 py-3 font-semibold">Rak</th>
                <th className="px-4 py-3 font-semibold">Stok</th>
                <th className="px-4 py-3 font-semibold">Harga</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.itemCode}>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-slate-950">{item.itemCode}</p>
                      <p className="mt-1 text-sm text-mute">{item.itemName}</p>
                      <p className="mt-1 text-xs text-slate-500">Barcode: {item.barcode || '-'}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{item.categoryCode || '-'}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{item.unitCode || '-'}</td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      <p>{item.rackCode || '-'}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.rackBarcode || '-'}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">
                      <p>{formatNumber(item.currentStock)}</p>
                      <p className="mt-1 text-xs text-slate-500">Min: {formatNumber(item.minimumStock)}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{formatCurrency(item.defaultPrice)}</td>
                    <td className="px-4 py-4 align-top">
                      <span className="badge border-slate-200 bg-white text-slate-600">{item.status}</span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedItemCode(item.itemCode)}
                          className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeactivate(item)}
                          disabled={!canUpdate || !reviewDbReady || item.status.toUpperCase() === 'INACTIVE'}
                          className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          Deactivate
                        </button>
                        <Link
                          href={buildInventoryBarcodeDetailPath(item.itemCode)}
                          className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Buka detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-mute">
                    {loading ? 'Memuat data barang inventory...' : 'Belum ada item yang cocok dengan filter ini.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white p-5">
          <InventoryItemCreateForm canCreate={canCreate} reviewDbReady={reviewDbReady} embedded />
        </div>
        <div className="rounded-3xl border border-line bg-white p-5">
          <InventoryItemEditForm
            item={selectedItem}
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            onSaved={async (nextItem, message) => {
              setFeedback({ tone: 'success', message })
              setSelectedItemCode(nextItem?.itemCode ?? selectedItemCode)
              await loadItems(query, status)
            }}
            onCancel={() => setSelectedItemCode(null)}
          />
        </div>
      </section>

      <InventoryItemBarcodePanel
        sections={sections}
        canCreate={canCreate}
        canUpdate={canUpdate}
        reviewDbReady={reviewDbReady}
        lifecycleItems={lifecycleItems}
      />
    </div>
  )
}
