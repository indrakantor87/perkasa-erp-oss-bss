'use client'

import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type ParsedOdpRow = {
  code: string
  name: string
  locationText: string
  latitude: string
  longitude: string
  totalPorts: string
  generatePorts: boolean
}

type ImportSummary = {
  createdCount: number
  skippedCount: number
  errorCount: number
}

type ImportRowResult = {
  index: number
  code: string
  name: string
  status: 'CREATED' | 'SKIPPED' | 'FAILED'
  message: string
}

const MAX_IMPORT_ROWS = 500
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
let xlsxModulePromise: Promise<typeof import('xlsx')> | null = null

async function loadXlsxModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx')
  }

  const module = await xlsxModulePromise
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

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return fallback
  if (raw === '1' || raw === 'true' || raw === 'ya' || raw === 'yes') return true
  if (raw === '0' || raw === 'false' || raw === 'tidak' || raw === 'no') return false
  return fallback
}

async function parseSheetFromBuffer(
  buffer: ArrayBuffer,
  sheetName: string,
  defaults: { totalPorts: string; generatePorts: boolean }
): Promise<ParsedOdpRow[]> {
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

  const codeKey = headerMap.get('kode odp') ?? headerMap.get('code') ?? headerMap.get('kode') ?? ''
  const nameKey = headerMap.get('nama odp') ?? headerMap.get('name') ?? headerMap.get('nama') ?? ''
  const locationKey =
    headerMap.get('lokasi') ?? headerMap.get('location') ?? headerMap.get('location text') ?? headerMap.get('alamat') ?? ''
  const latKey = headerMap.get('latitude') ?? headerMap.get('lat') ?? ''
  const lngKey = headerMap.get('longitude') ?? headerMap.get('lng') ?? headerMap.get('long') ?? ''
  const totalPortsKey =
    headerMap.get('total port') ?? headerMap.get('total ports') ?? headerMap.get('port') ?? headerMap.get('kapasitas') ?? ''
  const generatePortsKey =
    headerMap.get('generate port') ?? headerMap.get('generate ports') ?? headerMap.get('generate') ?? headerMap.get('auto port') ?? ''

  return rawRows
    .map((row) => {
      const code = pickRowValue(row, [codeKey, 'Kode ODP', 'code', 'Code']).trim()
      const name = pickRowValue(row, [nameKey, 'Nama ODP', 'name', 'Name']).trim()
      const locationText = pickRowValue(row, [locationKey, 'Lokasi', 'locationText', 'location', 'Alamat']).trim()
      const latitude = pickRowValue(row, [latKey, 'Latitude', 'lat', 'Lat']).trim()
      const longitude = pickRowValue(row, [lngKey, 'Longitude', 'lng', 'Lng', 'Long']).trim()
      const totalPorts =
        pickRowValue(row, [totalPortsKey, 'Total Port', 'totalPorts', 'total ports', 'Port', 'Kapasitas']).trim() || defaults.totalPorts
      const generatePorts = toBoolean(
        pickRowValue(row, [generatePortsKey, 'Generate Port', 'generatePorts', 'generate ports', 'Auto Port']),
        defaults.generatePorts,
      )
      return {
        code,
        name,
        locationText,
        latitude,
        longitude,
        totalPorts,
        generatePorts,
      }
    })
    .filter((row) => row.code || row.name)
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

export function InventoryOdpImportExcelModal({
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
  const [defaultTotalPorts, setDefaultTotalPorts] = useState('8')
  const [defaultGeneratePorts, setDefaultGeneratePorts] = useState(true)
  const [rows, setRows] = useState<ParsedOdpRow[]>([])
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
    const parsed = await parseSheetFromBuffer(buffer, sheetName, {
      totalPorts: defaultTotalPorts,
      generatePorts: defaultGeneratePorts,
    })
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
        message: 'Sheet berhasil dibaca, tetapi tidak ada baris yang terbaca. Pastikan ada kolom Kode ODP dan Nama ODP.',
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

        if (!row.code || !row.name) {
          skippedCount += 1
          results.push({
            index,
            code: row.code || '-',
            name: row.name || '-',
            status: 'SKIPPED',
            message: 'Kode/Nama kosong.',
          })
          continue
        }

        const response = await fetch('/api/inventory/odps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })

        if (response.ok) {
          createdCount += 1
          const payload = (await response.json().catch(() => null)) as { message?: string } | null
          results.push({
            index,
            code: row.code,
            name: row.name,
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
            code: row.code,
            name: row.name,
            status: 'SKIPPED',
            message: payload?.message || 'Kode ODP sudah ada.',
          })
          continue
        }

        errorCount += 1
        const payload = (await response.json().catch(() => null)) as { message?: string } | null
        results.push({
          index,
          code: row.code,
          name: row.name,
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
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Import Excel PORT ODP
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pilih sheet yang ingin diimpor. Kolom yang dikenali: Kode ODP, Nama ODP, Lokasi, Latitude, Longitude, Total Port, Generate Port.
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
              Import Excel hanya untuk file internal operasional. Demi keamanan, jangan unggah file dari sumber tidak dikenal. Batas file 5MB dan maksimal 500 baris per import.
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

            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Default jika kolom kosong</p>
              <label className="flex flex-col gap-2">
                <span className="font-semibold text-slate-950">Total Port</span>
                <input
                  type="number"
                  min="1"
                  max="512"
                  value={defaultTotalPorts}
                  onChange={(event) => setDefaultTotalPorts(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 outline-none transition focus:border-slate-400"
                  disabled={parsing || importing}
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={defaultGeneratePorts}
                  onChange={(event) => setDefaultGeneratePorts(event.target.checked)}
                  disabled={parsing || importing}
                />
                <span>Generate port otomatis</span>
              </label>
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
                    <div className="grid grid-cols-[70px_120px_1fr_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <span>Baris</span>
                      <span>Kode</span>
                      <span>Nama</span>
                      <span>Status</span>
                    </div>
                    <div className="max-h-[260px] overflow-auto bg-white">
                      {visibleRowResults.map((result) => (
                        <div
                          key={`${result.index}-${result.code}-${result.status}`}
                          className="grid grid-cols-[70px_120px_1fr_120px] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0"
                        >
                          <span className="text-xs text-slate-500">{result.index + 1}</span>
                          <span className="font-mono text-xs text-slate-700">{result.code}</span>
                          <span className="truncate">{result.name}</span>
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
                <div className="grid grid-cols-[140px_1fr_110px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>Kode</span>
                  <span>Nama</span>
                  <span>Port</span>
                </div>
                <div className="max-h-[420px] overflow-auto">
                  {previewRows.length ? (
                    previewRows.map((row, index) => (
                      <div
                        key={`${row.code}-${index}`}
                        className="grid grid-cols-[140px_1fr_110px] gap-3 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-b-0"
                      >
                        <span className="font-mono text-xs text-slate-700">{row.code || '-'}</span>
                        <span className="truncate">{row.name || '-'}</span>
                        <span className="text-right">{row.totalPorts || '-'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-slate-600">Belum ada preview. Pilih file excel terlebih dahulu.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Import akan memanggil API create ODP per baris. Jika kode ODP sudah ada, baris akan di-skip otomatis.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
