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

const ALAT_TEKNISI_CATEGORY_CODES = new Set([
  'ALAT_TEKNISI', 'ALAT_UKUR', 'SPLICER', 'OTDR', 'OPM', 'TESTER',
  'alat_teknisi', 'alat_ukur', 'splicer', 'otdr', 'opm', 'tester',
])

function isKategoriAlatTeknisi(categoryCode: string | null | undefined): boolean {
  if (!categoryCode) return false
  const raw = String(categoryCode).trim().toUpperCase()
  if (ALAT_TEKNISI_CATEGORY_CODES.has(raw)) return true
  return raw.includes('SPLICER') || raw.includes('OTDR') || raw.includes('OPM') || raw.includes('TESTER') || raw.includes('ALAT')
}

type ItemMovementRawRow = {
  movementId: number
  movementType: string
  referenceNo: string | null
  referenceType: string | null
  qty: number
  unitPrice: number
  movementAt: string
  itemId: number
  itemCode: string
  itemName: string
  unitCode: string | null
  notes: string | null
  workOrderId: number | null
  troubleTicketId: number | null
  requestId: number | null
}

type KartuStokDisplayRow = {
  no: number
  tanggal: string
  bukti: string
  keterangan: string
  masuk: number
  keluar: number
  sisa: number
  _rawMovementId?: number
}

type MutasiDisplayRow = {
  tanggal: string
  tipe: string
  bukti: string
  qty: number
  hargaSatuan: number
  total: number
  keterangan: string
}

const MONTH_LABELS_IDN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function normalizeTanggalDisplay(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = String(raw).trim()
  if (!trimmed) return ''

  // Case 1: ISO 'YYYY-MM-DD' atau 'YYYY-MM-DD HH:MM:SS'
  let match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/)
  if (match) {
    const y = match[1] ?? ''
    const m = (match[2] ?? '').padStart(2, '0')
    const d = (match[3] ?? '').padStart(2, '0')
    return `${d}/${m}/${y}`
  }

  // Case 2: sudah format 'DD/MM/YYYY' OK
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const d = (match[1] ?? '').padStart(2, '0')
    const m = (match[2] ?? '').padStart(2, '0')
    const y = match[3] ?? ''
    return `${d}/${m}/${y}`
  }

  // Case 3: BUG B3 separator hilang '01/092026' atau '01092026'
  const compact = trimmed.replace(/[\s-.,]/g, '')
  match = compact.match(/^(\d{1,2})\/?(\d{1,2})(\d{4})$/)
  if (match) {
    const d = (match[1] ?? '').padStart(2, '0')
    const m = (match[2] ?? '').padStart(2, '0')
    const y = match[3] ?? ''
    return `${d}/${m}/${y}`
  }

  // Case 4: YYYYMMDD compact
  match = compact.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (match) {
    const y = match[1] ?? ''
    const m = match[2] ?? ''
    const d = match[3] ?? ''
    return `${d}/${m}/${y}`
  }

  // Case last: parse via Date generic
  const dObj = new Date(trimmed)
  if (Number.isFinite(dObj.getTime())) {
    const d = String(dObj.getDate()).padStart(2, '0')
    const m = String(dObj.getMonth() + 1).padStart(2, '0')
    const y = String(dObj.getFullYear())
    return `${d}/${m}/${y}`
  }

  return trimmed || ''
}

function normalizeKodeDisplay(raw: string | null | undefined): string {
  if (!raw) return ''
  let kode = String(raw).trim()
  if (!kode) return ''
  // BUG B5: awalan titik tanpa digit sebelum (contoh: '.0011' → '0011')
  while (kode.startsWith('.') && kode.length > 1) {
    kode = kode.slice(1)
  }
  return kode
}

function resolveKeteranganFromNotes(movement: ItemMovementRawRow): string {
  const raw = String(movement.notes ?? '').trim()
  if (!raw) {
    const typeLabel = movement.movementType === 'IN' ? 'Barang Masuk' : movement.movementType === 'OUT' ? 'Barang Keluar' : movement.movementType || 'Mutasi Manual'
    const refType = movement.referenceType ? ` [${movement.referenceType}]` : ''
    return `${typeLabel}${refType}`
  }
  const cleaned = raw
    .replace(/^\[Review Movement\]\s*[^\-]*\s*\-\s*/, '')
    .replace(/^\[BARANG MASUK\]\s*[^\-]*\s*\-\s*/, '')
    .replace(/^\[RETURN\]\s*[^\-]*\s*\-\s*/, '')
    .trim()
  return cleaned || '-'
}

function buildMovementTypeLabel(typeRaw: string | null | undefined): { label: string; tone: 'in' | 'out' | 'adj' } {
  const upper = String(typeRaw ?? '').trim().toUpperCase()
  if (upper === 'IN') return { label: 'MASUK', tone: 'in' }
  if (upper === 'OUT') return { label: 'KELUAR', tone: 'out' }
  if (upper === 'ADJUSTMENT') return { label: 'ADJUST', tone: 'adj' }
  if (upper === 'RETURN') return { label: 'RETUR', tone: 'in' }
  if (upper === 'DAMAGE' || upper === 'DAMAGED') return { label: 'RUSAK', tone: 'out' }
  return { label: upper || 'MANUAL', tone: 'adj' }
}

export function buildKartuStokRows(
  rawRowsIn: ItemMovementRawRow[],
  initialStock: number = 0,
): { rows: KartuStokDisplayRow[]; totalMasuk: number; totalKeluar: number; sisaAkhir: number } {
  // Copy dulu ke local, NEVER mutate original props
  const rawRows = [...rawRowsIn]

  // B4: sort ASCENDING tanggal + movementId (tgl terlama di atas)
  rawRows.sort((a, b) => {
    const ta = a.movementAt ? String(a.movementAt) : ''
    const tb = b.movementAt ? String(b.movementAt) : ''
    if (ta !== tb) return ta < tb ? -1 : ta > tb ? 1 : 0
    return (a.movementId ?? 0) - (b.movementId ?? 0)
  })

  const rows: KartuStokDisplayRow[] = []
  let totalMasuk = 0
  let totalKeluar = 0
  let rollingSisa = initialStock
  let counter = 0

  for (const mv of rawRows) {
    const typeInfo = buildMovementTypeLabel(mv.movementType)
    let masuk = 0
    let keluar = 0
    if (typeInfo.tone === 'in') {
      masuk = Math.max(0, Number(mv.qty ?? 0))
    } else if (typeInfo.tone === 'out') {
      keluar = Math.max(0, Number(mv.qty ?? 0))
    } else if (typeInfo.tone === 'adj') {
      // ADJUSTMENT: anggap positif sebagai tambah stok (in), negatif buang (out)
      const q = Number(mv.qty ?? 0)
      if (q >= 0) masuk = Math.max(0, q)
      else keluar = Math.max(0, -q)
    }

    rollingSisa = rollingSisa + masuk - keluar

    // B1: counter unique (no duplikat)
    counter += 1

    // B2+B3: tanggal display normalized
    const tanggal = normalizeTanggalDisplay(mv.movementAt)

    // B5: kode reference
    const bukti = normalizeKodeDisplay(mv.referenceNo) || `#${mv.movementId ?? '-'}`

    const keterangan = resolveKeteranganFromNotes(mv)

    rows.push({
      no: counter,
      tanggal,
      bukti,
      keterangan,
      masuk,
      keluar,
      sisa: rollingSisa,
      _rawMovementId: mv.movementId,
    })

    totalMasuk += masuk
    totalKeluar += keluar
  }

  return { rows, totalMasuk, totalKeluar, sisaAkhir: rollingSisa }
}

export function buildMutasiRows(rawRowsIn: ItemMovementRawRow[]): { rows: MutasiDisplayRow[] } {
  const rawRows = [...rawRowsIn]
  // Urut tanggal DESCENDING (baru di atas) untuk Riwayat
  rawRows.sort((a, b) => {
    const ta = a.movementAt ? String(a.movementAt) : ''
    const tb = b.movementAt ? String(b.movementAt) : ''
    if (ta !== tb) return ta > tb ? -1 : ta < tb ? 1 : 0
    return (b.movementId ?? 0) - (a.movementId ?? 0)
  })

  const rows: MutasiDisplayRow[] = rawRows.map((mv) => {
    const typeInfo = buildMovementTypeLabel(mv.movementType)
    const qty = Math.abs(Number(mv.qty ?? 0))
    const hargaSatuan = Number(mv.unitPrice ?? 0)
    return {
      tanggal: normalizeTanggalDisplay(mv.movementAt),
      tipe: typeInfo.label,
      bukti: normalizeKodeDisplay(mv.referenceNo) || `#${mv.movementId ?? '-'}`,
      qty,
      hargaSatuan,
      total: qty * hargaSatuan,
      keterangan: resolveKeteranganFromNotes(mv),
    }
  })

  return { rows }
}

type MaintChecklistItem = {
  key: string
  label: string
}

type MaintChecklistSave = {
  weekNo: number
  month: number
  year: number
  tanggal: string
  teknisi: string
  items: Record<string, { ok: boolean; catatan: string }>
  savedAt: string
}

const MAINT_SPLICER_BUTIR: MaintChecklistItem[] = [
  { key: 'sp1', label: 'Periksa belitan spul dan ketegangan benang fusion' },
  { key: 'sp2', label: 'Periksa suhu knalpot / kipas pendingin' },
  { key: 'sp3', label: 'Cek kapasitas battery dan indikator charging' },
  { key: 'sp4', label: 'Bersihkan elektroda dan kalibrasi jarak tip' },
  { key: 'sp5', label: 'Test sample splicing: loss < 0.03 dB' },
  { key: 'sp6', label: 'Bersihkan body, monitor LCD, dan kabel ACC' },
]

const MAINT_OTDR_BUTIR: MaintChecklistItem[] = [
  { key: 'ot1', label: 'Cek battery level dan indikator pengecasan' },
  { key: 'ot2', label: 'Periksa port OTDR (FC/APC/SC) dan dust cap' },
  { key: 'ot3', label: 'Test adaptor SC/PC dan LC/PC hybrid' },
  { key: 'ot4', label: 'Kalibrasi waktu (internal clock + event marker akurasi 1m)' },
  { key: 'ot5', label: 'Cek layar touchscreen dan backlight' },
  { key: 'ot6', label: 'Periksa kerapatan kabel patch cord dan pelindung' },
]

const MAINT_OPM_BUTIR: MaintChecklistItem[] = [
  { key: 'pm1', label: 'Cek battery dan indikator low-bat' },
  { key: 'pm2', label: 'Bersihkan adaptor input FC/SC/LC dengan cotton swab' },
  { key: 'pm3', label: 'Kalibrasi 0 dBm terhadap sumber referensi' },
  { key: 'pm4', label: 'Verifikasi display semua mode (dBm / Watt / dB)' },
  { key: 'pm5', label: 'Periksa kerapatan kabel dan protective boot' },
]

const MAINT_DEFAULT_BUTIR: MaintChecklistItem[] = [
  { key: 'gn1', label: 'Pemeriksaan fisik body dan casing' },
  { key: 'gn2', label: 'Pemeriksaan battery / sumber daya' },
  { key: 'gn3', label: 'Pemeriksaan port, kabel, dan connector' },
  { key: 'gn4', label: 'Fungsi dasar switch-on dan menu' },
]

function resolveChecklistButir(categoryCode: string | null | undefined): MaintChecklistItem[] {
  const upper = String(categoryCode ?? '').trim().toUpperCase()
  if (upper.includes('SPLICER')) return MAINT_SPLICER_BUTIR
  if (upper.includes('OTDR')) return MAINT_OTDR_BUTIR
  if (upper.includes('OPM') || upper.includes('POWER METER')) return MAINT_OPM_BUTIR
  return MAINT_DEFAULT_BUTIR
}

function getWeekOfMonth(d: Date): number {
  const day = d.getDate()
  return Math.ceil(day / 7)
}

function getLocalDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function maintStorageKey(itemCode: string, weekNo: number, month: number, year: number): string {
  const mm = String(month).padStart(2, '0')
  return `maint-checklist-${normalizeKodeDisplay(itemCode)}-W${weekNo}-${year}-${mm}`
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
  const [detailTab, setDetailTab] = useState<'info' | 'kartu' | 'mutasi' | 'ceklis'>('info')

  // TAB 2 KARTU STOK state
  const today = new Date()
  const [kartuBulan, setKartuBulan] = useState<number>(today.getMonth() + 1)
  const [kartuTahun, setKartuTahun] = useState<number>(today.getFullYear())
  const [kartuLoading, setKartuLoading] = useState<boolean>(false)
  const [kartuRawRows, setKartuRawRows] = useState<ItemMovementRawRow[]>([])
  const [kartuExporting, setKartuExporting] = useState<boolean>(false)

  // TAB 3 RIWAYAT MUTASI state
  const [mutasiLoading, setMutasiLoading] = useState<boolean>(false)
  const [mutasiRawRows, setMutasiRawRows] = useState<ItemMovementRawRow[]>([])
  const [mutasiExporting, setMutasiExporting] = useState<boolean>(false)

  async function loadMovementRows(
    itemCode: string,
    periode?: { month?: number; year?: number; order?: 'ASC' | 'DESC'; from?: string; to?: string; limit?: number },
  ): Promise<ItemMovementRawRow[]> {
    try {
      const params = new URLSearchParams()
      if (periode?.limit) params.set('limit', String(periode.limit))
      if (periode?.order) params.set('order', periode.order)
      if (periode?.from) params.set('from', periode.from)
      if (periode?.to) params.set('to', periode.to)
      const response = await fetch(`/api/inventory/items/${encodeURIComponent(itemCode)}/movements?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; items?: ItemMovementRawRow[]; total?: number }
        | null
      if (!response.ok) return []
      return Array.isArray(payload?.items) ? payload.items : []
    } catch {
      return []
    }
  }

  useEffect(() => {
    if (!selectedItemCode) {
      setKartuRawRows([])
      setMutasiRawRows([])
      return
    }
    if (detailTab === 'kartu') {
      void (async () => {
        setKartuLoading(true)
        const mm = String(kartuBulan).padStart(2, '0')
        const fromDate = `${kartuTahun}-${mm}-01`
        const lastDay = new Date(kartuTahun, kartuBulan, 0).getDate()
        const toDate = `${kartuTahun}-${mm}-${String(lastDay).padStart(2, '0')}`
        const rows = await loadMovementRows(selectedItemCode, { order: 'ASC', limit: 1000, from: fromDate, to: toDate })
        setKartuRawRows(rows)
        setKartuLoading(false)
      })()
    } else if (detailTab === 'mutasi') {
      void (async () => {
        setMutasiLoading(true)
        const rows = await loadMovementRows(selectedItemCode, { order: 'DESC', limit: 200 })
        setMutasiRawRows(rows)
        setMutasiLoading(false)
      })()
    }
  }, [selectedItemCode, detailTab, kartuBulan, kartuTahun])

  const kartuData = useMemo(() => {
    return buildKartuStokRows(kartuRawRows, 0)
  }, [kartuRawRows])

  const mutasiData = useMemo(() => buildMutasiRows(mutasiRawRows), [mutasiRawRows])

  async function handleExportKartuStok() {
    if (!selectedItem) return
    setKartuExporting(true)
    setFeedback(null)
    try {
      const XLSX = await import('xlsx')
      const monthLabel = `${MONTH_LABELS_IDN[kartuBulan - 1] ?? 'Bulan'} ${kartuTahun}`

      const headerTitle = `KARTU STOK — ${selectedItem.itemName || selectedItem.itemCode} — ${monthLabel.toUpperCase()}`
      const subHeader = `Kode Barang: ${normalizeKodeDisplay(selectedItem.itemCode)} | Satuan: ${selectedItem.unitCode ?? '-'} | Periode: ${String(kartuBulan).padStart(2, '0')}/${kartuTahun}`

      const rowsToExport = kartuData.rows.map((r) => ({
        'No.': r.no,
        'Tanggal': r.tanggal,
        'Bukti / No. Referensi': r.bukti,
        'Keterangan': r.keterangan,
        'Masuk (Qty)': r.masuk,
        'Keluar (Qty)': r.keluar,
        'Sisa (Qty)': r.sisa,
      }))

      const footerRow = {
        'No.': '',
        'Tanggal': 'TOTAL',
        'Bukti / No. Referensi': '',
        'Keterangan': '',
        'Masuk (Qty)': kartuData.totalMasuk,
        'Keluar (Qty)': kartuData.totalKeluar,
        'Sisa (Qty)': kartuData.sisaAkhir,
      }

      const aoaData: unknown[][] = [
        [headerTitle, '', '', '', '', '', ''],
        [subHeader, '', '', '', '', '', ''],
        [],
        ['No.', 'Tanggal', 'Bukti / No. Referensi', 'Keterangan', 'Masuk (Qty)', 'Keluar (Qty)', 'Sisa (Qty)'],
        ...kartuData.rows.map((r) => [r.no, r.tanggal, r.bukti, r.keterangan, r.masuk, r.keluar, r.sisa]),
        ['', 'TOTAL', '', '', kartuData.totalMasuk, kartuData.totalKeluar, kartuData.sisaAkhir],
      ]
      void rowsToExport
      void footerRow

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData)
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      ]
      worksheet['!cols'] = [
        { wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 50 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Kartu Stok')
      const fileName = `kartu-stok-${selectedItem.itemCode}-${kartuTahun}${String(kartuBulan).padStart(2, '0')}.xlsx`
      XLSX.writeFile(workbook, fileName)
      setFeedback({ tone: 'success', message: `Berhasil export kartu stok ${kartuData.rows.length} baris ke ${fileName}.` })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? `Export kartu stok gagal: ${error.message}` : 'Export kartu stok gagal.',
      })
    } finally {
      setKartuExporting(false)
    }
  }

  async function handleExportRiwayatMutasi() {
    if (!selectedItem) return
    setMutasiExporting(true)
    setFeedback(null)
    try {
      const XLSX = await import('xlsx')
      const stamp = new Date()
      const stampLabel = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}`

      const rowsToExport = mutasiData.rows.map((r) => ({
        'Tanggal': r.tanggal,
        'Tipe Mutasi': r.tipe,
        'Bukti / Referensi': r.bukti,
        'Qty': r.qty,
        'Harga Satuan (Rp)': r.hargaSatuan,
        'Total Nilai (Rp)': r.total,
        'Keterangan': r.keterangan,
      }))

      const worksheet = XLSX.utils.json_to_sheet(rowsToExport)
      worksheet['!cols'] = [
        { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 50 },
      ]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Mutasi')
      const fileName = `riwayat-mutasi-${selectedItem.itemCode}-${stampLabel}.xlsx`
      XLSX.writeFile(workbook, fileName)
      setFeedback({ tone: 'success', message: `Berhasil export riwayat mutasi ${mutasiData.rows.length} baris ke ${fileName}.` })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? `Export riwayat mutasi gagal: ${error.message}` : 'Export riwayat mutasi gagal.',
      })
    } finally {
      setMutasiExporting(false)
    }
  }

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

  // TAB 4 CEKLIS MAINTENANCE state
  const [maintWeek, setMaintWeek] = useState<number>(getWeekOfMonth(today))
  const [maintMonth, setMaintMonth] = useState<number>(today.getMonth() + 1)
  const [maintYear, setMaintYear] = useState<number>(today.getFullYear())
  const [maintTanggal, setMaintTanggal] = useState<string>(getLocalDateInputValue(today))
  const [maintTeknisi, setMaintTeknisi] = useState<string>('')
  const [maintSaving, setMaintSaving] = useState<boolean>(false)
  const [maintExporting, setMaintExporting] = useState<boolean>(false)
  const [maintItems, setMaintItems] = useState<Record<string, { ok: boolean; catatan: string }>>({})
  const [maintLastSaved, setMaintLastSaved] = useState<string>('')

  const maintButir = useMemo<MaintChecklistItem[]>(
    () => resolveChecklistButir(selectedItem?.categoryCode),
    [selectedItem?.categoryCode],
  )

  useEffect(() => {
    if (!selectedItemCode) {
      setMaintItems({})
      setMaintLastSaved('')
      return
    }
    if (detailTab !== 'ceklis') return
    try {
      const key = maintStorageKey(selectedItemCode, maintWeek, maintMonth, maintYear)
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      if (raw) {
        const parsed = JSON.parse(raw) as MaintChecklistSave
        setMaintItems(parsed.items ?? {})
        setMaintTanggal(parsed.tanggal || maintTanggal)
        setMaintTeknisi(parsed.teknisi || '')
        setMaintLastSaved(parsed.savedAt || '')
      } else {
        const empty: Record<string, { ok: boolean; catatan: string }> = {}
        for (const b of resolveChecklistButir(selectedItem?.categoryCode)) {
          empty[b.key] = { ok: false, catatan: '' }
        }
        setMaintItems(empty)
        setMaintLastSaved('')
      }
    } catch {
      const empty: Record<string, { ok: boolean; catatan: string }> = {}
      for (const b of resolveChecklistButir(selectedItem?.categoryCode)) {
        empty[b.key] = { ok: false, catatan: '' }
      }
      setMaintItems(empty)
      setMaintLastSaved('')
    }
  }, [selectedItemCode, detailTab, maintWeek, maintMonth, maintYear, selectedItem?.categoryCode])

  function handleMaintItemChange(key: string, patch: Partial<{ ok: boolean; catatan: string }>) {
    setMaintItems((prev) => {
      const existing = prev[key] ?? { ok: false, catatan: '' }
      return { ...prev, [key]: { ...existing, ...patch } }
    })
  }

  async function handleMaintSaveLocal() {
    if (!selectedItemCode) return
    setMaintSaving(true)
    setFeedback(null)
    try {
      const payload: MaintChecklistSave = {
        weekNo: maintWeek,
        month: maintMonth,
        year: maintYear,
        tanggal: maintTanggal,
        teknisi: maintTeknisi.trim(),
        items: maintItems,
        savedAt: new Date().toISOString(),
      }
      if (typeof window !== 'undefined') {
        const key = maintStorageKey(selectedItemCode, maintWeek, maintMonth, maintYear)
        window.localStorage.setItem(key, JSON.stringify(payload))
      }
      setMaintLastSaved(payload.savedAt)
      setFeedback({ tone: 'success', message: `Ceklis maintenance Minggu ${maintWeek} berhasil disimpan ke lokal.` })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? `Simpan ceklis gagal: ${error.message}` : 'Simpan ceklis gagal.',
      })
    } finally {
      setMaintSaving(false)
    }
  }

  async function handleMaintExportBulanan() {
    if (!selectedItem) return
    setMaintExporting(true)
    setFeedback(null)
    try {
      const XLSX = await import('xlsx')
      const butir = maintButir
      const rowsAoa: unknown[][] = []
      rowsAoa.push([`REKAP CEKLIS MAINTENANCE MINGGUAN — ${selectedItem.itemName || selectedItem.itemCode}`])
      rowsAoa.push([`Kode: ${normalizeKodeDisplay(selectedItem.itemCode)} · Kategori: ${selectedItem.categoryCode ?? '-'} · Periode: ${MONTH_LABELS_IDN[maintMonth - 1]} ${maintYear}`])
      rowsAoa.push([])
      rowsAoa.push(['Minggu ke', 'Tanggal', 'Teknisi (PIC)', ...butir.map((b) => b.label), 'Catatan Tambahan'])

      let allLolos = 0
      let allTidakLolos = 0

      for (let w = 1; w <= 4; w++) {
        let tanggal = ''
        let teknisi = ''
        const itemsSnapshot: Record<string, { ok: boolean; catatan: string }> = {}
        try {
          const key = maintStorageKey(selectedItem.itemCode, w, maintMonth, maintYear)
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
          if (raw) {
            const parsed = JSON.parse(raw) as MaintChecklistSave
            tanggal = normalizeTanggalDisplay(parsed.tanggal)
            teknisi = parsed.teknisi || '-'
            Object.assign(itemsSnapshot, parsed.items ?? {})
          }
        } catch {
          // ignore
        }
        const butirCols: unknown[] = butir.map((b) => {
          const snap = itemsSnapshot[b.key]
          if (!snap) return ''
          if (snap.ok) {
            allLolos += 1
            return 'OK'
          }
          allTidakLolos += 1
          return snap.catatan ? `TIDAK OK: ${snap.catatan}` : 'TIDAK OK'
        })
        const gabunganCatatan = butir
          .map((b) => {
            const snap = itemsSnapshot[b.key]
            if (!snap || !snap.catatan) return ''
            return `[${b.key}] ${snap.catatan}`
          })
          .filter(Boolean)
          .join(' · ')

        rowsAoa.push([`Minggu ${w}`, tanggal, teknisi, ...butirCols, gabunganCatatan || '-'])
      }
      rowsAoa.push([])
      rowsAoa.push(['Rekap Bulanan', '', '', `Total OK: ${allLolos}`, `Total TIDAK OK: ${allTidakLolos}`, '', '', ''])

      const worksheet = XLSX.utils.aoa_to_sheet(rowsAoa)
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(3, 3 + butir.length) } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(3, 3 + butir.length) } },
      ]
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 14 }, { wch: 22 }, ...butir.map(() => ({ wch: 20 })), { wch: 50 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, `Ceklis ${maintMonth}-${maintYear}`)
      const fileName = `ceklis-maintenance-${selectedItem.itemCode}-${maintYear}${String(maintMonth).padStart(2, '0')}.xlsx`
      XLSX.writeFile(workbook, fileName)
      setFeedback({ tone: 'success', message: `Berhasil export rekap ceklis bulanan (4 minggu) ke ${fileName}.` })
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? `Export ceklis gagal: ${error.message}` : 'Export ceklis gagal.',
      })
    } finally {
      setMaintExporting(false)
    }
  }

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
          {selectedItem ? (
            <>
              <div
                role="tablist"
                aria-label="Panel detail barang"
                className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'info'}
                  onClick={() => setDetailTab('info')}
                  className={`rounded-xl px-3 py-1.5 text-sm transition ${
                    detailTab === 'info'
                      ? 'bg-white shadow-sm font-semibold text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ① Info Dasar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'kartu'}
                  onClick={() => setDetailTab('kartu')}
                  className={`rounded-xl px-3 py-1.5 text-sm transition ${
                    detailTab === 'kartu'
                      ? 'bg-white shadow-sm font-semibold text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ② Kartu Stok
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'mutasi'}
                  onClick={() => setDetailTab('mutasi')}
                  className={`rounded-xl px-3 py-1.5 text-sm transition ${
                    detailTab === 'mutasi'
                      ? 'bg-white shadow-sm font-semibold text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ③ Riwayat Mutasi
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'ceklis'}
                  onClick={() => setDetailTab('ceklis')}
                  disabled={!isKategoriAlatTeknisi(selectedItem.categoryCode)}
                  title={
                    isKategoriAlatTeknisi(selectedItem.categoryCode)
                      ? undefined
                      : 'Ceklis maintenance hanya tersedia untuk kategori Alat Teknis / Alat Ukur (Splicer, OTDR, OPM, Tester).'
                  }
                  className={`rounded-xl px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:text-slate-400 ${
                    detailTab === 'ceklis'
                      ? 'bg-white shadow-sm font-semibold text-slate-900 disabled:bg-slate-50'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ④ Ceklis Maintenance
                </button>
              </div>

              {/* TAB 1 INFO DASAR: EditForm TETAP DI DOM (pakai hidden, bukan conditional) agar state input TIDAK RESET */}
              <div className={detailTab === 'info' ? '' : 'hidden'} aria-hidden={detailTab !== 'info'}>
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

              {detailTab === 'kartu' && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">② Kartu Stok — {selectedItem.itemName}</p>
                      <p className="mt-0.5 text-xs text-mute">Kode: {normalizeKodeDisplay(selectedItem.itemCode)} · Satuan: {selectedItem.unitCode ?? '-'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleExportKartuStok()}
                      disabled={kartuExporting || kartuLoading || kartuData.rows.length === 0}
                      className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {kartuExporting ? 'Mengekspor...' : '⤓ Export Excel'}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-mute">Bulan:</span>
                      <select
                        value={kartuBulan}
                        onChange={(e) => setKartuBulan(Number(e.target.value))}
                        className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {MONTH_LABELS_IDN.map((name, idx) => (
                          <option key={idx + 1} value={idx + 1}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-mute">Tahun:</span>
                      <select
                        value={kartuTahun}
                        onChange={(e) => setKartuTahun(Number(e.target.value))}
                        className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </label>
                    </div>
                    <div className="text-right text-xs text-mute">
                      Total: <span className="font-semibold text-slate-700">{formatNumber(kartuData.rows.length)}</span> transaksi
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                          <th className="px-3 py-3 font-semibold">No.</th>
                          <th className="px-3 py-3 font-semibold">Tanggal</th>
                          <th className="px-3 py-3 font-semibold">Bukti / No. Ref</th>
                          <th className="px-3 py-3 font-semibold">Keterangan</th>
                          <th className="px-3 py-3 text-right font-semibold">Masuk</th>
                          <th className="px-3 py-3 text-right font-semibold">Keluar</th>
                          <th className="px-3 py-3 text-right font-semibold">Sisa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {kartuLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-mute">Memuat kartu stok...</td>
                        </tr>
                      ) : kartuData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-mute">
                            Belum ada transaksi pada periode {MONTH_LABELS_IDN[kartuBulan - 1]} {kartuTahun}.
                          </td>
                        </tr>
                      ) : (
                        kartuData.rows.map((row, idx) => (
                          <tr key={row._rawMovementId ?? idx}>
                            <td className="px-3 py-2 align-top text-slate-600">{row.no}</td>
                            <td className="px-3 py-2 align-top text-slate-700">{row.tanggal || '-'}</td>
                            <td className="px-3 py-2 align-top font-mono text-xs text-slate-700">{row.bukti || '-'}</td>
                            <td className="px-3 py-2 align-top text-slate-700 max-w-md truncate" title={row.keterangan}>{row.keterangan}</td>
                            <td className="px-3 py-2 align-top text-right font-semibold text-emerald-700">
                              {row.masuk > 0 ? formatNumber(row.masuk) : '-'}
                            </td>
                            <td className="px-3 py-2 align-top text-right font-semibold text-rose-700">
                              {row.keluar > 0 ? formatNumber(row.keluar) : '-'}
                            </td>
                            <td className="px-3 py-2 align-top text-right font-semibold text-slate-900">{formatNumber(row.sisa)}</td>
                          </tr>
                        ))
                      )}
                      </tbody>
                      {!kartuLoading && kartuData.rows.length > 0 && (
                        <tfoot className="bg-emerald-50">
                          <tr className="text-sm font-semibold text-emerald-900">
                            <td className="px-3 py-3" colSpan={4}>TOTAL periode {MONTH_LABELS_IDN[kartuBulan - 1]} {kartuTahun}</td>
                            <td className="px-3 py-3 text-right">{formatNumber(kartuData.totalMasuk)}</td>
                            <td className="px-3 py-3 text-right">{formatNumber(kartuData.totalKeluar)}</td>
                            <td className="px-3 py-3 text-right">Sisa Akhir: {formatNumber(kartuData.sisaAkhir)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {detailTab === 'mutasi' && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">③ Riwayat Mutasi — {selectedItem.itemName}</p>
                      <p className="mt-0.5 text-xs text-mute">Semua tipe mutasi urut tanggal terbaru di atas</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleExportRiwayatMutasi()}
                      disabled={mutasiExporting || mutasiLoading || mutasiData.rows.length === 0}
                      className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {mutasiExporting ? 'Mengekspor...' : '⤓ Export Excel'}
                    </button>
                  </div>
                  <div className="text-right text-xs text-mute">
                    Total: <span className="font-semibold text-slate-700">{formatNumber(mutasiData.rows.length)}</span> catatan
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                          <th className="px-3 py-3 font-semibold">Tanggal</th>
                          <th className="px-3 py-3 font-semibold">Tipe</th>
                          <th className="px-3 py-3 font-semibold">Bukti / Ref</th>
                          <th className="px-3 py-3 text-right font-semibold">Qty</th>
                          <th className="px-3 py-3 text-right font-semibold">Harga Satuan</th>
                          <th className="px-3 py-3 text-right font-semibold">Total Nilai</th>
                          <th className="px-3 py-3 font-semibold">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mutasiLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-mute">Memuat riwayat mutasi...</td>
                        </tr>
                      ) : mutasiData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-sm text-mute">Belum ada catatan mutasi.</td>
                        </tr>
                      ) : (
                        mutasiData.rows.map((row, idx) => {
                          const badge = (() => {
                            const upper = row.tipe
                            if (upper === 'MASUK' || upper === 'RETUR')
                              return <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">{row.tipe}</span>
                            if (upper === 'KELUAR' || upper === 'RUSAK')
                              return <span className="badge border-rose-200 bg-rose-50 text-rose-700">{row.tipe}</span>
                            return <span className="badge border-slate-200 bg-white text-slate-600">{row.tipe}</span>
                          })()
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-2 align-top text-slate-700">{row.tanggal || '-'}</td>
                              <td className="px-3 py-2 align-top">{badge}</td>
                              <td className="px-3 py-2 align-top font-mono text-xs text-slate-700">{row.bukti || '-'}</td>
                              <td className="px-3 py-2 align-top text-right font-semibold text-slate-900">{formatNumber(row.qty)}</td>
                              <td className="px-3 py-2 align-top text-right text-slate-700">{formatCurrency(row.hargaSatuan)}</td>
                              <td className="px-3 py-2 align-top text-right font-semibold text-slate-900">{formatCurrency(row.total)}</td>
                              <td className="px-3 py-2 align-top text-slate-700 max-w-md truncate" title={row.keterangan}>{row.keterangan}</td>
                            </tr>
                          )
                        })
                      )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailTab === 'ceklis' && isKategoriAlatTeknisi(selectedItem.categoryCode) && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">④ Ceklis Maintenance — {selectedItem.itemName}</p>
                      <p className="mt-0.5 text-xs text-mute">
                        Kategori: {selectedItem.categoryCode ?? '-'} · {maintButir.length} butir · Simpan otomatis ke browser lokal
                      </p>
                      {maintLastSaved && (
                        <p className="mt-1 text-[11px] text-emerald-600">
                          Terakhir disimpan: {normalizeTanggalDisplay(maintLastSaved.split('T')[0] ?? '')}{' '}
                          {maintLastSaved.split('T')[1]?.slice(0, 5) ?? ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleMaintSaveLocal()}
                        disabled={maintSaving}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {maintSaving ? 'Menyimpan...' : '💾 Simpan ke Lokal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMaintExportBulanan()}
                        disabled={maintExporting}
                        className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {maintExporting ? 'Mengekspor...' : '⤓ Export Rekap Bulanan'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-4">
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-mute">Minggu ke</span>
                      <select
                        value={maintWeek}
                        onChange={(e) => setMaintWeek(Number(e.target.value))}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {[1, 2, 3, 4, 5].map((w) => (
                          <option key={w} value={w}>Minggu {w}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-mute">Bulan</span>
                      <select
                        value={maintMonth}
                        onChange={(e) => setMaintMonth(Number(e.target.value))}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {MONTH_LABELS_IDN.map((name, idx) => (
                          <option key={idx + 1} value={idx + 1}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-mute">Tahun</span>
                      <select
                        value={maintYear}
                        onChange={(e) => setMaintYear(Number(e.target.value))}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {Array.from({ length: 6 }, (_, i) => today.getFullYear() - 2 + i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-semibold text-mute">Tanggal Cek</span>
                      <input
                        type="date"
                        value={maintTanggal}
                        onChange={(e) => setMaintTanggal(e.target.value)}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="space-y-1 text-xs md:col-span-4">
                      <span className="font-semibold text-mute">Nama Teknisi (PIC Pemeriksa)</span>
                      <input
                        type="text"
                        value={maintTeknisi}
                        onChange={(e) => setMaintTeknisi(e.target.value)}
                        placeholder="Contoh: Budi Santoso (Teknisi Area Pati)"
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                          <th className="px-4 py-3 font-semibold w-12">No.</th>
                          <th className="px-4 py-3 font-semibold">Butir Pemeriksaan</th>
                          <th className="px-4 py-3 text-center font-semibold w-20">OK</th>
                          <th className="px-4 py-3 font-semibold">Catatan (jika tidak OK / perlu perbaikan)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {maintButir.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-sm text-mute">Belum ada butir pemeriksaan untuk kategori ini.</td>
                          </tr>
                        ) : (
                          maintButir.map((b, idx) => {
                            const snap = maintItems[b.key] ?? { ok: false, catatan: '' }
                            return (
                              <tr key={b.key}>
                                <td className="px-4 py-3 align-top text-slate-600">{idx + 1}</td>
                                <td className="px-4 py-3 align-top font-medium text-slate-800">{b.label}</td>
                                <td className="px-4 py-3 align-top text-center">
                                  <label className="inline-flex cursor-pointer items-center">
                                    <input
                                      type="checkbox"
                                      checked={snap.ok}
                                      onChange={(e) => handleMaintItemChange(b.key, { ok: e.target.checked })}
                                      className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                  </label>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    type="text"
                                    value={snap.catatan}
                                    onChange={(e) => handleMaintItemChange(b.key, { catatan: e.target.value })}
                                    placeholder="Catatan (opsional jika OK, wajib jika tidak OK)"
                                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                                  />
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailTab === 'ceklis' && !isKategoriAlatTeknisi(selectedItem.categoryCode) && (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-amber-700">④ Ceklis Maintenance — Tidak Tersedia</p>
                  <p className="mt-2 text-sm text-mute">
                    Menu ini hanya untuk kategori Alat Teknis (Splicer, OTDR, OPM, Tester, Alat Ukur). Kategori item saat ini:{' '}
                    <span className="font-semibold text-slate-700">{selectedItem.categoryCode ?? '-'}</span>
                  </p>
                </div>
              )}
            </>
          ) : (
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
          )}
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
