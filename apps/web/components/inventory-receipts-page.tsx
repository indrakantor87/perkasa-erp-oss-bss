'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

type ReceiptRow = {
  id: number
  transactionId: string
  date: string
  itemCode: string
  itemName: string
  storeName: string
  unitCode: string
  qty: number
  notes: string
}

type InventoryItemOption = {
  itemCode: string
  itemName: string
  unitCode: string | null
}

type InventoryReceiptsPageProps = {
  canCreate: boolean
  canUpdate: boolean
  canExport: boolean
  reviewDbReady: boolean
}

function parseLooseDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const normalized = trimmed.replace(/\s+/g, '').replace(/\./g, '/').replace(/-/g, '/')
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return ''

  const day = match[1]?.padStart(2, '0') ?? ''
  const month = match[2]?.padStart(2, '0') ?? ''
  const year = match[3] ?? ''
  return `${year}-${month}-${day}`
}

function formatIndoInputDate(value: string) {
  const parsed = parseLooseDate(value)
  if (!parsed) return value
  const [year, month, day] = parsed.split('-')
  return `${day ?? ''} / ${month ?? ''} / ${year ?? ''}`.trim()
}

function extractItemCode(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  const dashIndex = raw.indexOf('-')
  if (dashIndex > 0) {
    const prefix = raw.slice(0, dashIndex).trim()
    if (prefix) return prefix
  }
  return raw.split('|')[0]?.trim() ?? ''
}

export function InventoryReceiptsPage({ canCreate, canUpdate, canExport, reviewDbReady }: InventoryReceiptsPageProps) {
  const [items, setItems] = useState<ReceiptRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const [limit, setLimit] = useState(10)
  const [offset, setOffset] = useState(0)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<ReceiptRow | null>(null)
  const [formItem, setFormItem] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formQty, setFormQty] = useState('0')
  const [formStore, setFormStore] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const [itemOptions, setItemOptions] = useState<InventoryItemOption[]>([])
  const [itemLoading, setItemLoading] = useState(false)

  const canWriteCreate = canCreate && reviewDbReady
  const canWriteUpdate = canUpdate && reviewDbReady

  const pageInfo = useMemo(() => {
    const start = total === 0 ? 0 : offset + 1
    const end = Math.min(offset + items.length, total)
    return { start, end }
  }, [items.length, offset, total])

  async function loadRows(params?: { nextOffset?: number }) {
    setLoading(true)
    setFeedback(null)
    try {
      const nextOffset = params?.nextOffset ?? offset
      const query = new URLSearchParams()
      query.set('limit', String(limit))
      query.set('offset', String(nextOffset))
      if (parseLooseDate(fromDate)) query.set('from', parseLooseDate(fromDate))
      if (parseLooseDate(toDate)) query.set('to', parseLooseDate(toDate))
      if (search.trim()) query.set('search', search.trim())
      const response = await fetch(`/api/inventory/receipts?${query.toString()}`, { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as { message?: string; items?: ReceiptRow[]; total?: number } | null
      if (!response.ok) {
        setItems([])
        setTotal(0)
        setFeedback({ tone: 'error', message: payload?.message || 'Data barang masuk gagal dimuat.' })
        return
      }
      setItems(Array.isArray(payload?.items) ? payload.items : [])
      setTotal(Number(payload?.total ?? 0))
      setOffset(nextOffset)
    } catch (error) {
      setItems([])
      setTotal(0)
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Data barang masuk gagal dimuat.' })
    } finally {
      setLoading(false)
    }
  }

  async function loadItemOptions(query: string) {
    setItemLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('status', 'ACTIVE')
      params.set('limit', '120')
      if (query.trim()) params.set('query', query.trim())
      const response = await fetch(`/api/inventory/items?${params.toString()}`, { method: 'GET', cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as { items?: InventoryItemOption[] } | null
      if (!response.ok) {
        setItemOptions([])
        return
      }
      setItemOptions(Array.isArray(payload?.items) ? payload.items : [])
    } finally {
      setItemLoading(false)
    }
  }

  useEffect(() => {
    void loadRows({ nextOffset: 0 })
  }, [limit])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      void loadRows({ nextOffset: 0 })
    }, 250)
    return () => window.clearTimeout(handler)
  }, [fromDate, toDate, search])

  useEffect(() => {
    if (!modalMode) return
    void loadItemOptions('')
  }, [modalMode])

  function openCreateModal() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setEditingItem(null)
    setFormItem('')
    setFormDate(`${day} / ${month} / ${year}`)
    setFormQty('0')
    setFormStore('')
    setFormNotes('')
    setFeedback(null)
    setModalMode('create')
  }

  function openEditModal(row: ReceiptRow) {
    setEditingItem(row)
    setFormItem(`${row.itemCode} - ${row.itemName}`)
    setFormDate(formatIndoInputDate(row.date))
    setFormQty(String(row.qty ?? 0))
    setFormStore(row.storeName || '')
    setFormNotes(row.notes || '')
    setFeedback(null)
    setModalMode('edit')
  }

  function closeModal() {
    if (saving) return
    setModalMode(null)
    setEditingItem(null)
  }

  async function handleSave() {
    if (!modalMode) return
    if (modalMode === 'create' && !canWriteCreate) return
    if (modalMode === 'edit' && !canWriteUpdate) return

    const itemCode = extractItemCode(formItem)
    const receiptDate = parseLooseDate(formDate)
    const qty = Number.parseInt(String(formQty ?? '').trim() || '0', 10)

    if (!itemCode) {
      setFeedback({ tone: 'error', message: 'Barang wajib dipilih.' })
      return
    }
    if (!receiptDate) {
      setFeedback({ tone: 'error', message: 'Tanggal wajib diisi.' })
      return
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      setFeedback({ tone: 'error', message: 'Jumlah harus lebih dari 0.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/inventory/receipts', {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          modalMode === 'create'
            ? {
                itemCode,
                qty,
                receiptDate,
                storeName: formStore,
                notes: formNotes,
                unitPrice: 0,
              }
            : {
                id: editingItem?.id,
                itemCode,
                qty,
                receiptDate,
                storeName: formStore,
                notes: formNotes,
              },
        ),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Data barang masuk gagal disimpan.' })
        return
      }
      setFeedback({ tone: 'success', message: payload?.message || 'Data barang masuk berhasil disimpan.' })
      closeModal()
      await loadRows()
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Data barang masuk gagal disimpan.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: ReceiptRow) {
    if (!canWriteUpdate) return
    const confirmed = window.confirm(`Hapus transaksi ${row.transactionId}?`)
    if (!confirmed) return

    setFeedback(null)
    try {
      const response = await fetch(`/api/inventory/receipts?id=${encodeURIComponent(String(row.id))}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Transaksi gagal dihapus.' })
        return
      }
      setFeedback({ tone: 'success', message: payload?.message || 'Transaksi berhasil dihapus.' })
      await loadRows()
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Transaksi gagal dihapus.' })
    }
  }

  function buildExportHref() {
    const query = new URLSearchParams()
    if (parseLooseDate(fromDate)) query.set('from', parseLooseDate(fromDate))
    if (parseLooseDate(toDate)) query.set('to', parseLooseDate(toDate))
    if (search.trim()) query.set('search', search.trim())
    return `/api/inventory/receipts/export?${query.toString()}`
  }

  return (
    <div className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-950">Barang Masuk</h1>
          <p className="mt-1 text-sm text-mute">Data barang masuk</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canWriteCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Plus className="h-4 w-4" />
            Tambah Data
          </button>
          <a
            href={buildExportHref()}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
              canExport ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'pointer-events-none bg-slate-200 text-slate-500'
            }`}
          >
            Export Excel
          </a>
        </div>
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-700">
            <span>Show</span>
            <select
              value={String(limit)}
              onChange={(event) => setLimit(Number.parseInt(event.target.value, 10) || 10)}
              className="bg-transparent text-sm font-semibold text-slate-950 outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <input
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            placeholder="dd / mm / yyyy"
            className="w-44 rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
          <input
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            placeholder="dd / mm / yyyy"
            className="w-44 rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search..."
          className="w-full max-w-xs rounded-lg border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="min-w-full text-sm">
          <thead className="bg-white">
            <tr className="text-left text-xs font-semibold text-slate-500">
              <th className="px-4 py-3">ID Transaksi</th>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Nama Barang</th>
              <th className="px-4 py-3">Nama Toko</th>
              <th className="px-4 py-3">Satuan</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-mute">
                  Memuat...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-mute">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-700">{row.transactionId}</td>
                  <td className="px-4 py-3 text-slate-700">{row.date}</td>
                  <td className="px-4 py-3 text-slate-700">{row.itemCode}</td>
                  <td className="px-4 py-3 text-slate-700">{row.itemName}</td>
                  <td className="px-4 py-3 text-slate-700">{row.storeName || '.'}</td>
                  <td className="px-4 py-3 text-slate-700">{row.unitCode || ''}</td>
                  <td className="px-4 py-3 text-slate-700">{row.qty}</td>
                  <td className="px-4 py-3 text-slate-700">{row.notes || '.'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        aria-label="Edit barang masuk"
                        onClick={() => openEditModal(row)}
                        disabled={!canWriteUpdate}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Hapus barang masuk"
                        onClick={() => void handleDelete(row)}
                        disabled={!canWriteUpdate}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <div>
          {total === 0 ? 'Showing 0 to 0 of 0 entries' : `Showing ${pageInfo.start} to ${pageInfo.end} of ${total} entries`}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRows({ nextOffset: Math.max(0, offset - limit) })}
            disabled={loading || offset === 0}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => void loadRows({ nextOffset: offset + limit })}
            disabled={loading || offset + limit >= total}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            Next
          </button>
        </div>
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Tutup modal" className="absolute inset-0" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-semibold text-slate-950">
                {modalMode === 'create' ? 'Tambah Barang Masuk' : 'Edit Barang Masuk'}
              </h2>
              <button type="button" onClick={closeModal} className="text-sm font-semibold text-slate-700">
                Tutup
              </button>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <p className="text-sm font-semibold text-slate-900">Barang</p>
                <input
                  list="inventory-receipt-items"
                  value={formItem}
                  onChange={(event) => {
                    const next = event.target.value
                    setFormItem(next)
                    void loadItemOptions(extractItemCode(next))
                  }}
                  placeholder="Pilih barang..."
                  disabled={modalMode === 'create' ? !canWriteCreate : !canWriteUpdate}
                  className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-100"
                />
                <datalist id="inventory-receipt-items">
                  {itemOptions.map((option) => (
                    <option key={option.itemCode} value={`${option.itemCode} - ${option.itemName}`} />
                  ))}
                </datalist>
                {itemLoading ? <p className="mt-2 text-xs text-mute">Memuat daftar barang...</p> : null}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Tanggal</p>
                  <input
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                    placeholder="dd / mm / yyyy"
                    disabled={modalMode === 'create' ? !canWriteCreate : !canWriteUpdate}
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900">Jumlah</p>
                  <input
                    value={formQty}
                    onChange={(event) => setFormQty(event.target.value)}
                    placeholder="0"
                    disabled={modalMode === 'create' ? !canWriteCreate : !canWriteUpdate}
                    className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Nama Toko</p>
                <input
                  value={formStore}
                  onChange={(event) => setFormStore(event.target.value)}
                  placeholder=""
                  disabled={modalMode === 'create' ? !canWriteCreate : !canWriteUpdate}
                  className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-100"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">Keterangan</p>
                <textarea
                  value={formNotes}
                  onChange={(event) => setFormNotes(event.target.value)}
                  placeholder=""
                  disabled={modalMode === 'create' ? !canWriteCreate : !canWriteUpdate}
                  className="mt-2 min-h-28 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="mt-10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-line bg-white px-6 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || (modalMode === 'create' ? !canWriteCreate : !canWriteUpdate) || itemLoading}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

