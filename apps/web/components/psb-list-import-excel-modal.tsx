'use client'

import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type ParsedPsbRow = {
  customerName: string
  customerPhone: string
  packageLabel: string
  activityNotes: string
  salesOwnerName: string
  googleMapsLink: string
  areaLabel: string
  odpCode: string
  birthDate: string
  requestedInstallDate: string
}

type ImportSummary = {
  createdCount: number
  skippedCount: number
  errorCount: number
}

type ImportRowResult = {
  index: number
  customerName: string
  customerPhone: string
  status: 'CREATED' | 'SKIPPED' | 'FAILED'
  message: string
}

const MAX_IMPORT_ROWS = 500
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
let xlsxModulePsbPromise: Promise<typeof import('xlsx')> | null = null

async function loadXlsxModule() {
  if (!xlsxModulePsbPromise) {
    xlsxModulePsbPromise = import('xlsx')
  }

  const module = await xlsxModulePsbPromise
  return (module as { default?: typeof import('xlsx') }).default ?? module
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function pickRowValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value === null || value === undefined) continue
    const normalized = String(value).trim()
    if (normalized) return normalized
  }
  return ''
}

function parseDateFromCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const parts = raw.split('/')
    const d = parts[0].padStart(2, '0')
    const m = parts[1].padStart(2, '0')
    const y = parts[2]
    return `${y}-${m}-${d}`
  }
  if (/^\d{1,2}-\d{1,2}-\d{4}/.test(raw)) {
    const parts = raw.split('-')
    const d = parts[0].padStart(2, '0')
    const m = parts[1].padStart(2, '0')
    const y = parts[2]
    return `${y}-${m}-${d}`
  }
  return raw
}

async function parseSheetFromBuffer(
  buffer: ArrayBuffer,
  sheetName: string,
): Promise<ParsedPsbRow[]> {
  const XLSX = await loadXlsxModule()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const headerMap = new Map<string, string>()
  const sample = rawRows[0] ?? {}
  Object.keys(sample).forEach((rawKey) => {
    headerMap.set(normalizeHeader(rawKey), rawKey)
  })

  const nameKey =
    headerMap.get('nama customer') ??
    headerMap.get('nama pelanggan') ??
    headerMap.get('customer') ??
    headerMap.get('nama') ??
    headerMap.get('nama konsumen') ??
    headerMap.get('name') ??
    ''
  const phoneKey =
    headerMap.get('no hp') ??
    headerMap.get('no. hp') ??
    headerMap.get('no telp') ??
    headerMap.get('no. telp') ??
    headerMap.get('hp') ??
    headerMap.get('telepon') ??
    headerMap.get('wa') ??
    headerMap.get('whatsapp') ??
    headerMap.get('phone') ??
    ''
  const packageKey =
    headerMap.get('paket') ??
    headerMap.get('paket berlangganan') ??
    headerMap.get('paket layanan') ??
    headerMap.get('package') ??
    headerMap.get('layanan') ??
    ''
  const addressKey =
    headerMap.get('alamat') ??
    headerMap.get('alamat lengkap') ??
    headerMap.get('deskripsi') ??
    headerMap.get('keterangan') ??
    headerMap.get('address') ??
    ''
  const salesKey =
    headerMap.get('marketing') ??
    headerMap.get('sales') ??
    headerMap.get('pic sales') ??
    headerMap.get('marketing pic') ??
    headerMap.get('sales pic') ??
    headerMap.get('sales owner') ??
    headerMap.get('salesownername') ??
    ''
  const mapsKey =
    headerMap.get('google maps') ??
    headerMap.get('link maps') ??
    headerMap.get('maps') ??
    headerMap.get('map') ??
    headerMap.get('koordinat') ??
    headerMap.get('alamat maps') ??
    headerMap.get('googlemapslink') ??
    ''
  const areaKey =
    headerMap.get('area') ??
    headerMap.get('kelurahan') ??
    headerMap.get('wilayah') ??
    headerMap.get('kecamatan') ??
    headerMap.get('area label') ??
    headerMap.get('arealabel') ??
    ''
  const odpKey =
    headerMap.get('kode odp') ??
    headerMap.get('odp') ??
    headerMap.get('odpcode') ??
    headerMap.get('lokasi odp') ??
    ''
  const birthKey =
    headerMap.get('tgl lahir') ??
    headerMap.get('tanggal lahir') ??
    headerMap.get('ttl') ??
    headerMap.get('birthdate') ??
    headerMap.get('birth date') ??
    ''
  const installKey =
    headerMap.get('tgl pasang') ??
    headerMap.get('tanggal pasang') ??
    headerMap.get('target pasang') ??
    headerMap.get('jadwal pasang') ??
    headerMap.get('tanggal target pasang') ??
    headerMap.get('requestedinstalldate') ??
    ''

  return rawRows
    .map((row) => {
      const customerName = pickRowValue(row, [
        nameKey,
        'Nama Customer',
        'Nama Pelanggan',
        'customerName',
        'Customer',
        'Nama Konsumen',
        'Name',
      ]).trim()
      const customerPhone = pickRowValue(row, [
        phoneKey,
        'No. HP Customer',
        'No HP',
        'customerPhone',
        'No. Telp',
        'Telepon',
        'WA',
        'WhatsApp',
        'Phone',
      ]).replace(/\D/g, '')
      const packageLabel = pickRowValue(row, [
        packageKey,
        'Paket Berlangganan',
        'Paket',
        'packageLabel',
        'Paket Layanan',
        'Layanan',
        'Package',
      ]).trim()
      const activityNotes = pickRowValue(row, [
        addressKey,
        'Alamat',
        'activityNotes',
        'Deskripsi',
        'Alamat Lengkap',
        'Address',
        'Keterangan',
      ]).trim()
      const salesOwnerName = pickRowValue(row, [
        salesKey,
        'Marketing / Sales PIC',
        'salesOwnerName',
        'Marketing',
        'Sales',
        'PIC Sales',
      ]).trim()
      const googleMapsLink = pickRowValue(row, [
        mapsKey,
        'Link Google Maps',
        'googleMapsLink',
        'Google Maps',
        'Maps',
        'Koordinat',
      ]).trim()
      const areaLabel = pickRowValue(row, [
        areaKey,
        'Area / Kelurahan',
        'areaLabel',
        'Area',
        'Kelurahan',
        'Wilayah',
      ]).trim()
      const odpCode = pickRowValue(row, [
        odpKey,
        'Kode ODP',
        'odpCode',
        'ODP',
        'Lokasi ODP',
      ]).trim()
      const birthDate = parseDateFromCell(pickRowValue(row, [
        birthKey,
        'Tanggal Lahir',
        'birthDate',
        'Tgl Lahir',
        'TTL',
      ]))
      const requestedInstallDate = parseDateFromCell(pickRowValue(row, [
        installKey,
        'Tanggal Target Pasang',
        'requestedInstallDate',
        'Tgl Pasang',
        'Target Pasang',
        'Jadwal Pasang',
      ]))

      return {
        customerName,
        customerPhone,
        packageLabel,
        activityNotes,
        salesOwnerName,
        googleMapsLink,
        areaLabel,
        odpCode,
        birthDate,
        requestedInstallDate,
      }
    })
    .filter((row) => row.customerName || row.customerPhone || row.packageLabel)
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('File tidak bisa dibaca di browser.'))
    reader.onload = () => {
      const data = reader.result
      if (!(data instanceof ArrayBuffer)) {
        reject(new Error('File tidak bisa dibaca sebagai buffer.'))
        return
      }
      resolve(data)
    }
    reader.readAsArrayBuffer(file)
  })
}

export function PsbListImportExcelModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [rows, setRows] = useState<ParsedPsbRow[]>([])
  const [rowResults, setRowResults] = useState<ImportRowResult[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'warning'; message: string } | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const previewRows = useMemo(() => rows.slice(0, 12), [rows])
  const visibleRowResults = useMemo(() => rowResults.slice(0, 40), [rowResults])

  if (!open) return null

  async function parseSheet(buffer: ArrayBuffer, sheetName: string) {
    const parsed = await parseSheetFromBuffer(buffer, sheetName)
    if (parsed.length > MAX_IMPORT_ROWS) {
      setRows(parsed.slice(0, MAX_IMPORT_ROWS))
      setFeedback({
        tone: 'warning',
        message: `Baris yang terbaca melebihi batas ${MAX_IMPORT_ROWS}. Demi keamanan, import dibatasi ke ${MAX_IMPORT_ROWS} baris pertama.`,
      })
      return
    }

    setRows(parsed)
    if (parsed.length === 0) {
      setFeedback({
        tone: 'warning',
        message:
          'Sheet berhasil dibaca, tetapi tidak ada baris yang terbaca. Pastikan ada kolom Nama Customer, No HP, dan Paket.',
      })
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setRows([])
    setRowResults([])
    setSummary(null)
    setFeedback(null)
    setSheetNames([])
    setActiveSheet('')
    setFileBuffer(null)
    if (!file) return

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFeedback({
        tone: 'error',
        message: `Ukuran file terlalu besar. Batas maksimum ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
      })
      return
    }

    setParsing(true)
    try {
      const buffer = await readFileAsArrayBuffer(file)
      const XLSX = await loadXlsxModule()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const availableSheets = workbook.SheetNames.filter(Boolean)
      const selectedSheet = availableSheets[0] ?? ''
      setSheetNames(availableSheets)
      setActiveSheet(selectedSheet)
      setFileBuffer(buffer)
      if (!selectedSheet) {
        setFeedback({ tone: 'warning', message: 'File berhasil dibaca, tetapi tidak ada sheet yang ditemukan.' })
        return
      }
      await parseSheet(buffer, selectedSheet)
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'File excel gagal diproses.',
      })
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!rows.length || importing) return
    setImporting(true)
    setFeedback(null)
    setSummary(null)
    setRowResults([])
    setProgress({ current: 0, total: rows.length })

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0
    const results: ImportRowResult[] = []

    try {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]
        setProgress({ current: index + 1, total: rows.length })

        if (!row.customerName) {
          skippedCount += 1
          results.push({
            index,
            customerName: '-',
            customerPhone: row.customerPhone || '-',
            status: 'SKIPPED',
            message: 'Nama Customer kosong (wajib diisi).',
          })
          continue
        }

        if (!row.packageLabel) {
          skippedCount += 1
          results.push({
            index,
            customerName: row.customerName,
            customerPhone: row.customerPhone || '-',
            status: 'SKIPPED',
            message: 'Paket Berlangganan kosong (wajib diisi).',
          })
          continue
        }

        if (row.customerPhone && row.customerPhone.length < 10) {
          skippedCount += 1
          results.push({
            index,
            customerName: row.customerName,
            customerPhone: row.customerPhone || '-',
            status: 'SKIPPED',
            message: 'No HP kurang dari 10 digit.',
          })
          continue
        }

        const response = await fetch('/api/sales/psb-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: row.customerName,
            customerPhone: row.customerPhone || null,
            packageLabel: row.packageLabel,
            activityNotes: [
              row.activityNotes,
              row.areaLabel ? `Area: ${row.areaLabel}` : null,
              row.odpCode ? `ODP: ${row.odpCode}` : null,
              row.requestedInstallDate ? `Tgl Pasang: ${row.requestedInstallDate}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
            birthDate: row.birthDate || null,
            salesOwnerName: row.salesOwnerName || null,
            googleMapsLink: row.googleMapsLink || null,
            housePhotoFileName: null,
          }),
        })

        if (response.ok) {
          createdCount += 1
          const payload = (await response.json().catch(() => null)) as { message?: string } | null
          results.push({
            index,
            customerName: row.customerName,
            customerPhone: row.customerPhone || '-',
            status: 'CREATED',
            message: payload?.message || 'Berhasil dibuat.',
          })
          continue
        }

        if (response.status === 409) {
          skippedCount += 1
          const payload = (await response.json().catch(() => null)) as { message?: string } | null
          results.push({
            index,
            customerName: row.customerName,
            customerPhone: row.customerPhone || '-',
            status: 'SKIPPED',
            message: payload?.message || 'No HP / NIK sudah terdaftar.',
          })
          continue
        }

        if (response.status === 403) {
          errorCount += 1
          const payload = (await response.json().catch(() => null)) as { message?: string } | null
          results.push({
            index,
            customerName: row.customerName,
            customerPhone: row.customerPhone || '-',
            status: 'FAILED',
            message: payload?.message || 'Role tidak memiliki izin (403). Import dihentikan.',
          })
          setRowResults(results)
          break
        }

        errorCount += 1
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        results.push({
          index,
          customerName: row.customerName,
          customerPhone: row.customerPhone || '-',
          status: 'FAILED',
          message: payload?.message || `Gagal (HTTP ${response.status}).`,
        })
      }

      setSummary({ createdCount, skippedCount, errorCount })
      setRowResults(results)
      if (errorCount > 0) {
        setFeedback({
          tone: 'warning',
          message: `Import selesai dengan catatan. Berhasil: ${createdCount}. Skip: ${skippedCount}. Gagal: ${errorCount}.`,
        })
      } else {
        setFeedback({
          tone: 'success',
          message: `Import selesai. Berhasil: ${createdCount}. Skip: ${skippedCount}.`,
        })
      }
      router.refresh()
    } finally {
      setImporting(false)
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Tutup popup import excel" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-6xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Import Excel Data PSB
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pilih sheet yang ingin diimpor. Kolom wajib: Nama Customer, Paket.
              Kolom yang dikenali: No HP, Alamat, Area/Kelurahan, Google Maps, Paket, ODP, Marketing, Tgl Lahir, Tgl Pasang.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Tutup
          </button>
        </div>

        <div className="grid gap-5 px-6 py-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Import Excel hanya untuk file internal operasional. Demi keamanan, jangan unggah file dari sumber tidak dikenal.
              Batas file 5MB dan maksimal 500 baris per import.
            </div>
            <label className="block space-y-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Pilih file Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => void handleFileChange(event)}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white disabled:cursor-not-allowed"
              />
            </label>

            {sheetNames.length ? (
              <label className="block space-y-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">Sheet</span>
                <select
                  value={activeSheet}
                  onChange={(event) => {
                    const nextSheet = event.target.value
                    setActiveSheet(nextSheet)
                    setRows([])
                    setRowResults([])
                    setSummary(null)
                    setFeedback(null)
                    if (!fileBuffer || !nextSheet) return
                    setParsing(true)
                    Promise.resolve(parseSheet(fileBuffer, nextSheet)).finally(() => setParsing(false))
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  disabled={!fileBuffer || parsing || importing}
                >
                  {sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Panduan Kolom</p>
              <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
                <li><span className="font-semibold text-rose-700">Wajib:</span> Nama Customer, Paket Berlangganan</li>
                <li><span className="font-semibold text-sky-700">Disarankan:</span> No HP (min 10 digit), Alamat</li>
                <li><span className="font-semibold text-emerald-700">Opsional:</span> Area/Kelurahan, Google Maps, ODP, Marketing, Tgl Lahir, Tgl Pasang</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 text-sm text-slate-600">
              <span>
                {selectedFile ? `File dipilih: ${selectedFile.name}` : 'Belum ada file dipilih.'}
                {parsing ? ' (memproses...)' : ''}
              </span>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={!rows.length || parsing || importing}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {importing ? 'Mengimpor...' : 'Mulai Import'}
              </button>
              {progress ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  Proses: {progress.current} / {progress.total}
                </div>
              ) : null}
            </div>

            {feedback ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  feedback.tone === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : feedback.tone === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            {summary ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Berhasil: <span className="font-semibold text-slate-950">{summary.createdCount}</span>. Skip:{' '}
                <span className="font-semibold text-slate-950">{summary.skippedCount}</span>. Gagal:{' '}
                <span className="font-semibold text-slate-950">{summary.errorCount}</span>.
              </div>
            ) : null}

            {rowResults.length ? (
              <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Detail per baris ({rowResults.length} baris)
                </summary>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="grid grid-cols-[70px_1fr_140px_100px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span>Baris</span>
                    <span>Nama Customer</span>
                    <span>No HP</span>
                    <span>Status</span>
                  </div>
                  <div className="max-h-[260px] overflow-auto bg-white">
                    {visibleRowResults.map((result) => (
                      <div
                        key={`${result.index}-${result.customerName}-${result.status}`}
                        className="grid grid-cols-[70px_1fr_140px_100px] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0"
                      >
                        <span className="text-xs text-slate-500">{result.index + 1}</span>
                        <span className="truncate">{result.customerName}</span>
                        <span className="font-mono text-xs">{result.customerPhone}</span>
                        <span className="text-xs font-semibold">
                          {result.status === 'CREATED'
                            ? 'Berhasil'
                            : result.status === 'SKIPPED'
                              ? 'Skip'
                              : 'Gagal'}
                        </span>
                        <div className="col-span-4 -mt-1 text-xs text-slate-500">{result.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {rowResults.length > visibleRowResults.length ? (
                  <div className="mt-3 text-xs text-slate-500">
                    Menampilkan {visibleRowResults.length} baris pertama. Sisanya tetap tercatat pada proses import.
                  </div>
                ) : null}
              </details>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Preview ({rows.length} baris terbaca)
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[1fr_130px_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>Nama Customer</span>
                  <span>No HP</span>
                  <span>Paket</span>
                </div>
                <div className="max-h-[420px] overflow-auto">
                  {previewRows.length ? (
                    previewRows.map((row, index) => (
                      <div
                        key={`${row.customerName}-${row.customerPhone}-${index}`}
                        className="grid grid-cols-[1fr_130px_1fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0"
                      >
                        <span className="truncate">{row.customerName || '-'}</span>
                        <span className="font-mono text-xs">{row.customerPhone || '-'}</span>
                        <span className="truncate">{row.packageLabel || '-'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-slate-600">
                      Belum ada preview. Pilih file excel terlebih dahulu.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 space-y-3">
              <p>Import akan memanggil API create Data PSB per baris. Data yang sama (duplicate No HP) akan otomatis di-skip.</p>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Contoh baris pertama (header):</p>
                <p className="font-mono">
                  Nama Customer | No HP | Paket | Alamat | Area | Google Maps | ODP | Marketing | Tgl Lahir | Tgl Pasang
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
