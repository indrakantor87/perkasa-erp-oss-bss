'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import JsBarcode from 'jsbarcode'
import { Download } from 'lucide-react'

type InventoryRackLayoutPanelProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  embedded?: boolean
}

type InventoryRackItem = {
  itemCode: string
  itemName: string
  rackCode: string | null
  rackBarcode: string | null
  currentStock: number
  status: string
}

type RackLayoutRow = InventoryRackItem & {
  draftRackCode: string
  draftRackBarcode: string
  saving: boolean
}

type FeedbackTone = 'success' | 'error'

function getFeedbackToneClass(tone: FeedbackTone) {
  return tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700'
}

async function downloadCanvasAsPng(canvas: HTMLCanvasElement, fileName: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {
    throw new Error('Barcode tidak bisa dikonversi ke PNG.')
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

async function downloadCode128(fileRef: string, payload: string) {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, payload, {
    format: 'CODE128',
    displayValue: true,
    height: 88,
    width: 2,
    margin: 12,
    background: '#ffffff',
    lineColor: '#0f172a',
    fontOptions: 'bold',
    fontSize: 14,
  })
  await downloadCanvasAsPng(canvas, `${fileRef}-code128.png`)
}

function normalizeRackValue(value: string) {
  return value.trim().toUpperCase()
}

function buildInitialRows(items: InventoryRackItem[]): RackLayoutRow[] {
  return items.map((item) => ({
    ...item,
    draftRackCode: item.rackCode ?? '',
    draftRackBarcode: item.rackBarcode ?? '',
    saving: false,
  }))
}

export function InventoryRackLayoutPanel({ canUpdate, reviewDbReady, embedded = false }: InventoryRackLayoutPanelProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<RackLayoutRow[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || loading
  const activeCount = useMemo(() => rows.filter((row) => row.status.trim().toUpperCase() === 'ACTIVE').length, [rows])

  async function loadItems(nextQuery: string) {
    if (!canUpdate) return

    setLoading(true)
    setFeedback(null)

    try {
      const params = new URLSearchParams()
      if (nextQuery.trim()) {
        params.set('query', nextQuery.trim())
      }
      params.set('limit', '60')

      const response = await fetch(`/api/inventory/items?${params.toString()}`, { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; items?: InventoryRackItem[] }
        | null

      if (!response.ok) {
        setRows([])
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Daftar item inventory gagal dimuat.',
        })
        return
      }

      const items = Array.isArray(payload?.items) ? payload?.items : []
      setRows(buildInitialRows(items))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(itemCode: string) {
    if (isDisabled) return

    setRows((prev) =>
      prev.map((row) => (row.itemCode === itemCode ? { ...row, saving: true } : row)),
    )
    setFeedback(null)

    const row = rows.find((item) => item.itemCode === itemCode)
    const draftRackCode = normalizeRackValue(row?.draftRackCode ?? '')
    const draftRackBarcode = normalizeRackValue(row?.draftRackBarcode ?? '')

    try {
      const response = await fetch('/api/inventory/items/rack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode,
          rackCode: draftRackCode,
          rackBarcode: draftRackBarcode,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string; rackCode?: string | null; rackBarcode?: string | null } | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Perubahan rak gagal disimpan.',
        })
        return
      }

      setRows((prev) =>
        prev.map((item) => {
          if (item.itemCode !== itemCode) return item
          const nextRackCode = payload?.rackCode ?? (draftRackCode || null)
          const nextRackBarcode = payload?.rackBarcode ?? (draftRackBarcode || draftRackCode || null)
          return {
            ...item,
            rackCode: nextRackCode,
            rackBarcode: nextRackBarcode,
            draftRackCode: nextRackCode ?? '',
            draftRackBarcode: nextRackBarcode ?? '',
          }
        }),
      )
      setFeedback({
        tone: 'success',
        message: payload?.message || `Rak untuk ${itemCode} berhasil diperbarui.`,
      })
      router.refresh()
    } finally {
      setRows((prev) =>
        prev.map((item) => (item.itemCode === itemCode ? { ...item, saving: false } : item)),
      )
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Penataan Rak</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Kelola lokasi rak & barcode rak
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini dipakai tim gudang/GA untuk memastikan setiap item memiliki kode rak dan barcode rak agar alur scan
            outbound (request selesai, pinjaman, stock movement OUT) bisa divalidasi server-side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">{rows.length} item</span>
          <span className="badge border-emerald-100 bg-emerald-50 text-emerald-700">{activeCount} aktif</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari item (kode, nama, atau rak)..."
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            disabled={!canUpdate || !reviewDbReady}
          />
          <p className="mt-2 text-xs text-mute">
            Kosongkan untuk memuat item terbaru. Simpan perubahan per item supaya update cepat dan tidak mengganggu stok.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadItems(query)}
            disabled={!canUpdate || !reviewDbReady || loading}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {loading ? 'Memuat...' : 'Muat'}
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              void loadItems('')
            }}
            disabled={!canUpdate || !reviewDbReady || loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Reset
          </button>
        </div>
      </div>

      {!canUpdate ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Role aktif belum memiliki izin update pada domain Inventory.
        </div>
      ) : !reviewDbReady ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Mode review database belum aktif, sehingga penataan rak dinonaktifkan.
        </div>
      ) : rows.length ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
          <div className="grid grid-cols-[160px_1fr_160px_180px_120px_240px] gap-0 border-b border-line bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <div>Kode</div>
            <div>Nama item</div>
            <div>Stok</div>
            <div>Rak</div>
            <div>Status</div>
            <div className="text-right">Aksi</div>
          </div>
          <div className="divide-y divide-line">
            {rows.map((row) => {
              const effectiveRackBarcode = normalizeRackValue(row.draftRackBarcode) || normalizeRackValue(row.draftRackCode)
              const isRowDisabled = isDisabled || row.saving
              const dirty =
                normalizeRackValue(row.draftRackCode) !== normalizeRackValue(row.rackCode ?? '') ||
                normalizeRackValue(row.draftRackBarcode) !== normalizeRackValue(row.rackBarcode ?? '')

              return (
                <div
                  key={row.itemCode}
                  className="grid grid-cols-[160px_1fr_160px_180px_120px_240px] gap-0 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="font-semibold text-slate-950">{row.itemCode}</div>
                  <div className="pr-3 text-mute">{row.itemName}</div>
                  <div>{row.currentStock}</div>
                  <div className="flex flex-col gap-2 pr-2">
                    <input
                      value={row.draftRackCode}
                      onChange={(event) => {
                        const value = event.target.value.toUpperCase()
                        setRows((prev) =>
                          prev.map((item) => (item.itemCode === row.itemCode ? { ...item, draftRackCode: value } : item)),
                        )
                      }}
                      placeholder="RAK-A1-ONU-01"
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      disabled={isRowDisabled}
                    />
                    <input
                      value={row.draftRackBarcode}
                      onChange={(event) => {
                        const value = event.target.value.toUpperCase()
                        setRows((prev) =>
                          prev.map((item) =>
                            item.itemCode === row.itemCode ? { ...item, draftRackBarcode: value } : item,
                          ),
                        )
                      }}
                      placeholder="Kosongkan jika mengikuti kode rak"
                      className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      disabled={isRowDisabled}
                    />
                    <p className="text-xs text-mute">
                      Barcode: {effectiveRackBarcode ? <span className="font-semibold text-slate-700">{effectiveRackBarcode}</span> : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="badge border-slate-200 bg-white text-slate-600">{row.status}</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={!effectiveRackBarcode || isRowDisabled}
                      onClick={() => {
                        const payload = effectiveRackBarcode
                        void downloadCode128(`${row.itemCode}-rack`, payload)
                          .then(() =>
                            setFeedback({
                              tone: 'success',
                              message: `Barcode rak untuk ${row.itemCode} berhasil diunduh.`,
                            }),
                          )
                          .catch((error: unknown) =>
                            setFeedback({
                              tone: 'error',
                              message: error instanceof Error ? error.message : 'Barcode rak gagal dibuat.',
                            }),
                          )
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <Download className="h-4 w-4" />
                      Barcode Rak
                    </button>
                    <button
                      type="button"
                      disabled={!dirty || isRowDisabled}
                      onClick={() => void handleSave(row.itemCode)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {row.saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Tekan <span className="font-semibold">Muat</span> untuk melihat daftar item inventory.
        </div>
      )}

      {feedback ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${getFeedbackToneClass(feedback.tone)}`}>
          {feedback.message}
        </div>
      ) : null}
    </section>
  )
}
