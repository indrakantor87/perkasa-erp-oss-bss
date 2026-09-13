'use client'

import { DataSourceStatus } from '@/components/data-source-status'
import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import type { DataSourceSnapshot } from '@/lib/types'

type AssetRow = {
  id: number
  assetType: string
  assetName: string
  qty: number
  purchasePrice: number
  notes: string | null
}

type AssetRegisterMeta = {
  kodeBarang?: string
  satuan?: string
  tanggalBeli?: string
  tanggalKeluar?: string
  pic?: string
  lokasi?: string
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

function parseAssetNotes(notes: string | null): AssetRegisterMeta {
  if (!notes) return {}
  const trimmed = notes.trim()
  if (!trimmed.startsWith('{')) return {}
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed && typeof parsed === 'object') {
      return {
        kodeBarang: typeof (parsed as AssetRegisterMeta).kodeBarang === 'string' ? (parsed as AssetRegisterMeta).kodeBarang : undefined,
        satuan: typeof (parsed as AssetRegisterMeta).satuan === 'string' ? (parsed as AssetRegisterMeta).satuan : undefined,
        tanggalBeli: typeof (parsed as AssetRegisterMeta).tanggalBeli === 'string' ? (parsed as AssetRegisterMeta).tanggalBeli : undefined,
        tanggalKeluar: typeof (parsed as AssetRegisterMeta).tanggalKeluar === 'string' ? (parsed as AssetRegisterMeta).tanggalKeluar : undefined,
        pic: typeof (parsed as AssetRegisterMeta).pic === 'string' ? (parsed as AssetRegisterMeta).pic : undefined,
        lokasi: typeof (parsed as AssetRegisterMeta).lokasi === 'string' ? (parsed as AssetRegisterMeta).lokasi : undefined,
      }
    }
  } catch {
    // ignore invalid JSON
  }
  return {}
}

function normalizeDateToNotesDisplay(value: string | undefined) {
  if (!value) return '-'
  const raw = value.trim()
  if (!raw) return '-'
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`
  const id = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (id) return `${id[1].padStart(2, '0')}/${id[2].padStart(2, '0')}/${id[3]}`
  return raw
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function InventoryAssetsPage({ source, canCreate, reviewDbReady }: InventoryAssetsPageProps) {
  const today = new Date()
  const [items, setItems] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [assetTab, setAssetTab] = useState<'RINGKASAN' | 'REGISTER'>('RINGKASAN')
  const [filterTahun, setFilterTahun] = useState(today.getFullYear())

  const [assetType, setAssetType] = useState('ELEKTRONIK')
  const [assetName, setAssetName] = useState('')
  const [qty, setQty] = useState('1')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [notes, setNotes] = useState('')
  const [kodeBarang, setKodeBarang] = useState('')
  const [satuan, setSatuan] = useState('unit')
  const [tanggalBeli, setTanggalBeli] = useState('')
  const [tanggalKeluar, setTanggalKeluar] = useState('')
  const [pic, setPic] = useState('')
  const [lokasi, setLokasi] = useState('')

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

  const registerRows = useMemo(() => {
    return items
      .map((row) => ({ ...row, meta: parseAssetNotes(row.notes) }))
      .filter((row) => {
        if (!row.meta.tanggalBeli) return assetTab === 'REGISTER'
        const m = row.meta.tanggalBeli.match(/^(\d{4})/)
        if (!m) return true
        const year = Number(m[1])
        return year === filterTahun
      })
      .filter((row) => row.meta.kodeBarang || assetTab !== 'REGISTER' ? true : false)
  }, [items, filterTahun, assetTab])

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

  const registerTotalNilai = useMemo(() => {
    return registerRows.reduce((sum, row) => sum + Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0), 0)
  }, [registerRows])

  function resetForm() {
    setAssetType('ELEKTRONIK')
    setAssetName('')
    setQty('1')
    setPurchasePrice('')
    setNotes('')
    setKodeBarang('')
    setSatuan('unit')
    setTanggalBeli('')
    setTanggalKeluar('')
    setPic('')
    setLokasi('')
  }

  async function handleSubmit() {
    if (!canWrite) return
    setFeedback(null)

    if (assetTab === 'REGISTER' && !kodeBarang.trim()) {
      setFeedback({ tone: 'error', message: 'Kode Barang wajib diisi untuk Asset Register.' })
      return
    }
    if (!assetName.trim()) {
      setFeedback({ tone: 'error', message: 'Nama asset wajib diisi.' })
      return
    }

    try {
      const meta: AssetRegisterMeta = {}
      if (kodeBarang.trim()) meta.kodeBarang = kodeBarang.trim()
      if (satuan.trim()) meta.satuan = satuan.trim()
      if (tanggalBeli.trim()) meta.tanggalBeli = tanggalBeli.trim()
      if (tanggalKeluar.trim()) meta.tanggalKeluar = tanggalKeluar.trim()
      if (pic.trim()) meta.pic = pic.trim()
      if (lokasi.trim()) meta.lokasi = lokasi.trim()

      const notesPayload =
        Object.keys(meta).length > 0 ? JSON.stringify(meta) + (notes.trim() ? `\n${notes.trim()}` : '') : notes.trim()

      const response = await fetch('/api/inventory/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetType,
          assetName: assetName.trim(),
          qty: qty.trim() || '1',
          purchasePrice,
          notes: notesPayload || null,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Asset gagal disimpan.' })
        return
      }
      setFeedback({ tone: 'success', message: payload?.message || 'Asset berhasil disimpan.' })
      resetForm()
      await loadItems()
    } catch (error) {
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : 'Asset gagal disimpan.' })
    }
  }

  function exportRegisterExcel() {
    const rows = registerRows.map((row) => ({
      'Kode Barang': row.meta.kodeBarang ?? '',
      'Nama Asset': row.assetName,
      'Kategori': row.assetType,
      'Qty': row.qty,
      'Satuan': row.meta.satuan ?? 'unit',
      'Tanggal Beli': normalizeDateToNotesDisplay(row.meta.tanggalBeli),
      'Tanggal Keluar': normalizeDateToNotesDisplay(row.meta.tanggalKeluar),
      'Harga Satuan': Number(row.purchasePrice ?? 0),
      'Total Nilai': Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0),
      'PIC': row.meta.pic ?? '',
      'Lokasi': row.meta.lokasi ?? '',
    }))
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        'Kode Barang',
        'Nama Asset',
        'Kategori',
        'Qty',
        'Satuan',
        'Tanggal Beli',
        'Tanggal Keluar',
        'Harga Satuan',
        'Total Nilai',
        'PIC',
        'Lokasi',
      ],
    })
    const totalRowIndex = rows.length + 1
    sheet[`A${totalRowIndex + 2}`] = { t: 's', v: '' }
    sheet[`B${totalRowIndex + 2}`] = { t: 's', v: 'TOTAL NILAI AKUMULASI' }
    sheet[`I${totalRowIndex + 2}`] = { t: 'n', v: registerTotalNilai, z: '#,##0' }
    sheet['!cols'] = [
      { wch: 18 }, { wch: 36 }, { wch: 18 }, { wch: 8 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 24 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, `Asset Register ${filterTahun}`)
    const filename = `asset-register-${filterTahun}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}.xlsx`
    XLSX.writeFile(wb, filename, { compression: true })
  }

  function exportRingkasanExcel() {
    const rows = items.map((row, idx) => ({
      'No': idx + 1,
      'Jenis': row.assetType,
      'Nama Asset': row.assetName,
      'Qty': row.qty,
      'Harga Beli': Number(row.purchasePrice ?? 0),
      'Nilai': Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0),
      'Keterangan': row.notes ?? '',
    }))
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: ['No', 'Jenis', 'Nama Asset', 'Qty', 'Harga Beli', 'Nilai', 'Keterangan'],
    })
    sheet['!cols'] = [
      { wch: 8 }, { wch: 20 }, { wch: 36 }, { wch: 8 }, { wch: 18 }, { wch: 20 }, { wch: 40 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Ringkasan Asset')
    const stamp = new Date()
    const filename = `asset-ringkasan-${stamp.getFullYear()}-${pad2(stamp.getMonth() + 1)}-${pad2(stamp.getDate())}.xlsx`
    XLSX.writeFile(wb, filename, { compression: true })
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

      <div className="flex flex-col gap-3 rounded-3xl border border-line bg-white p-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
          <button
            type="button"
            onClick={() => setAssetTab('RINGKASAN')}
            className={
              assetTab === 'RINGKASAN'
                ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm'
                : 'rounded-xl px-4 py-2 text-sm font-medium text-mute transition hover:text-slate-700'
            }
          >
            ① Ringkasan
          </button>
          <button
            type="button"
            onClick={() => setAssetTab('REGISTER')}
            className={
              assetTab === 'REGISTER'
                ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm'
                : 'rounded-xl px-4 py-2 text-sm font-medium text-mute transition hover:text-slate-700'
            }
          >
            ② Daftar Asset Tetap (Register)
          </button>
        </div>
        {assetTab === 'REGISTER' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Tahun Perolehan</label>
              <select
                value={filterTahun}
                onChange={(event) => setFilterTahun(Number(event.target.value))}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                {[today.getFullYear() - 5, today.getFullYear() - 4, today.getFullYear() - 3, today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear()].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void loadItems()}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={exportRegisterExcel}
              className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Export Excel Register
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={exportRingkasanExcel}
            className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Export Excel Ringkasan
          </button>
        )}
      </div>

      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">Input</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {assetTab === 'REGISTER' ? 'Tambah Asset Tetap Register' : 'Tambah asset'}
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

        <div className="mt-4 grid gap-3 lg:grid-cols-6">
          {assetTab === 'REGISTER' ? (
            <input
              value={kodeBarang}
              onChange={(event) => setKodeBarang(event.target.value)}
              placeholder="Kode Barang * (wajib)"
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-2"
              disabled={!canWrite}
            />
          ) : null}
          <select
            value={assetType}
            onChange={(event) => setAssetType(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
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
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-3"
            disabled={!canWrite}
          />
          <input
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            placeholder="Jumlah"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
            disabled={!canWrite}
          />
          {assetTab === 'REGISTER' ? (
            <input
              value={satuan}
              onChange={(event) => setSatuan(event.target.value)}
              placeholder="Satuan (unit/pcs/set)"
              className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
              disabled={!canWrite}
            />
          ) : null}
          <input
            value={purchasePrice}
            onChange={(event) => setPurchasePrice(event.target.value)}
            placeholder="Harga beli"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-1"
            disabled={!canWrite}
          />
          {assetTab === 'REGISTER' ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mute">Tanggal Beli</label>
                <input
                  type="date"
                  value={tanggalBeli}
                  onChange={(event) => setTanggalBeli(event.target.value)}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  disabled={!canWrite}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mute">Tanggal Keluar</label>
                <input
                  type="date"
                  value={tanggalKeluar}
                  onChange={(event) => setTanggalKeluar(event.target.value)}
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  disabled={!canWrite}
                />
              </div>
              <input
                value={pic}
                onChange={(event) => setPic(event.target.value)}
                placeholder="PIC (penanggung jawab)"
                className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-2"
                disabled={!canWrite}
              />
              <input
                value={lokasi}
                onChange={(event) => setLokasi(event.target.value)}
                placeholder="Lokasi / Ruangan"
                className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-2"
                disabled={!canWrite}
              />
            </>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canWrite}
            className="rounded-2xl border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 lg:col-span-1"
          >
            Simpan
          </button>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Keterangan tambahan (catatan non-struktur)"
            className="min-h-[44px] rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 lg:col-span-6"
            disabled={!canWrite}
          />
        </div>
      </section>

      {assetTab === 'RINGKASAN' ? (
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
      ) : (
        <section className="panel p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-title">Tabel Register</p>
              <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
                Daftar Asset Tetap Register • Tahun {filterTahun}
              </h2>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{registerRows.length} baris</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                  <th className="px-4 py-3 font-semibold">Kode Barang</th>
                  <th className="px-4 py-3 font-semibold">Nama Asset</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Satuan</th>
                  <th className="px-4 py-3 font-semibold">Tanggal Beli</th>
                  <th className="px-4 py-3 font-semibold">Tanggal Keluar</th>
                  <th className="px-4 py-3 font-semibold">Harga Satuan</th>
                  <th className="px-4 py-3 font-semibold">Total Nilai</th>
                  <th className="px-4 py-3 font-semibold">PIC / Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-mute">
                      Memuat...
                    </td>
                  </tr>
                ) : registerRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-mute">
                      Belum ada data asset register untuk tahun ini.
                    </td>
                  </tr>
                ) : (
                  registerRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 align-top font-semibold text-slate-950">
                        {row.meta.kodeBarang || <span className="text-mute">-</span>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-900">{row.assetName}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">{row.assetType}</td>
                      <td className="px-4 py-3 align-top tabular-nums text-slate-700">{formatNumber(row.qty)}</td>
                      <td className="px-4 py-3 align-top text-slate-700">{row.meta.satuan ?? 'unit'}</td>
                      <td className="px-4 py-3 align-top text-slate-700 tabular-nums">
                        {normalizeDateToNotesDisplay(row.meta.tanggalBeli)}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700 tabular-nums">
                        {normalizeDateToNotesDisplay(row.meta.tanggalKeluar)}
                      </td>
                      <td className="px-4 py-3 align-top text-right tabular-nums text-slate-700">
                        {formatCurrency(row.purchasePrice)}
                      </td>
                      <td className="px-4 py-3 align-top text-right tabular-nums text-slate-800 font-semibold">
                        {formatCurrency(Number(row.purchasePrice ?? 0) * Number(row.qty ?? 0))}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {row.meta.pic || row.meta.lokasi ? (
                          <div className="flex flex-col gap-1">
                            {row.meta.pic ? <p className="text-sm">{row.meta.pic}</p> : null}
                            {row.meta.lokasi ? <p className="text-xs text-mute">{row.meta.lokasi}</p> : null}
                          </div>
                        ) : (
                          <span className="text-mute">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && registerRows.length > 0 ? (
                <tfoot>
                  <tr className="bg-emerald-50 border-t-2 border-emerald-200">
                    <td colSpan={8} className="px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                      Total Nilai Asset ({registerRows.length} item)
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-800">
                      {formatCurrency(registerTotalNilai)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
