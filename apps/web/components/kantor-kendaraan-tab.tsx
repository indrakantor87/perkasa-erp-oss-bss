'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

type KendaraanRow = {
  id: string
  platNo: string
  jenisKendaraan: 'MOTOR' | 'MOBIL'
  merkTipe: string
  tahun: string
  namaDriver: string
  tanggalPakai: string
  kmAwal: number
  kmAkhir: number
  nominalBbm: number
  catatan?: string
}

const STORAGE_KEY = 'kantor_kendaraan_v1'

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('id-ID')
}

function formatCurrency(value: number | null | undefined) {
  const v = Number(value ?? 0)
  if (!Number.isFinite(v)) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
}

function normalizeDateDisplay(value: string | undefined | null) {
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

function loadLocal(): KendaraanRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed as KendaraanRow[]
  } catch {
    // ignore
  }
  return []
}

function saveLocal(rows: KendaraanRow[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // ignore
  }
}

export function KantorKendaraanTabContent() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  const [rows, setRows] = useState<KendaraanRow[]>([])

  const [platNo, setPlatNo] = useState('')
  const [jenisKendaraan, setJenisKendaraan] = useState<'MOTOR' | 'MOBIL'>('MOTOR')
  const [merkTipe, setMerkTipe] = useState('')
  const [tahun, setTahun] = useState(String(today.getFullYear()))
  const [namaDriver, setNamaDriver] = useState('')
  const [tanggalPakai, setTanggalPakai] = useState(todayStr)
  const [kmAwal, setKmAwal] = useState('')
  const [kmAkhir, setKmAkhir] = useState('')
  const [nominalBbm, setNominalBbm] = useState('')
  const [catatan, setCatatan] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [filterJenis, setFilterJenis] = useState<'SEMUA' | 'MOTOR' | 'MOBIL'>('SEMUA')

  useEffect(() => {
    setRows(loadLocal())
  }, [])

  const displayRows = useMemo(() => {
    const filtered = filterJenis === 'SEMUA' ? rows : rows.filter((r) => r.jenisKendaraan === filterJenis)
    return [...filtered].sort((a, b) => (a.tanggalPakai < b.tanggalPakai ? 1 : -1))
  }, [rows, filterJenis])

  const totals = useMemo(() => {
    const motor = displayRows.filter((r) => r.jenisKendaraan === 'MOTOR').reduce((s, r) => s + Number(r.nominalBbm ?? 0), 0)
    const mobil = displayRows.filter((r) => r.jenisKendaraan === 'MOBIL').reduce((s, r) => s + Number(r.nominalBbm ?? 0), 0)
    return { motor, mobil, total: motor + mobil, count: displayRows.length }
  }, [displayRows])

  function resetForm() {
    setPlatNo('')
    setJenisKendaraan('MOTOR')
    setMerkTipe('')
    setTahun(String(today.getFullYear()))
    setNamaDriver('')
    setTanggalPakai(todayStr)
    setKmAwal('')
    setKmAkhir('')
    setNominalBbm('')
    setCatatan('')
  }

  function handleSimpan() {
    if (!platNo.trim()) {
      setFeedback({ tone: 'error', message: 'Plat Nomor wajib diisi.' })
      return
    }
    if (!merkTipe.trim()) {
      setFeedback({ tone: 'error', message: 'Merk / Tipe kendaraan wajib diisi.' })
      return
    }
    if (!namaDriver.trim()) {
      setFeedback({ tone: 'error', message: 'Nama Driver wajib diisi.' })
      return
    }
    const row: KendaraanRow = {
      id: `kdr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      platNo: platNo.trim().toUpperCase(),
      jenisKendaraan,
      merkTipe: merkTipe.trim(),
      tahun: tahun.trim(),
      namaDriver: namaDriver.trim(),
      tanggalPakai: tanggalPakai.trim() || todayStr,
      kmAwal: Number(kmAwal || 0),
      kmAkhir: Number(kmAkhir || 0),
      nominalBbm: Number(nominalBbm || 0),
      catatan: catatan.trim() || undefined,
    }
    const next = [row, ...rows]
    setRows(next)
    saveLocal(next)
    setFeedback({ tone: 'success', message: 'Data penggunaan kendaraan berhasil disimpan.' })
    resetForm()
  }

  function handleHapus(id: string) {
    const next = rows.filter((r) => r.id !== id)
    setRows(next)
    saveLocal(next)
  }

  function exportExcel() {
    const motorRows = rows.filter((r) => r.jenisKendaraan === 'MOTOR')
    const mobilRows = rows.filter((r) => r.jenisKendaraan === 'MOBIL')

    function buildExportLines(list: KendaraanRow[]) {
      const header = ['Plat No', 'Jenis', 'Merk / Tipe', 'Tahun', 'Nama Driver', 'Tanggal Pakai', 'Km Awal', 'Km Akhir', 'Jarak (Km)', 'Nominal BBM', 'Catatan']
      const lines: Array<Array<string | number>> = [header]
      let sumBbm = 0
      for (const r of list) {
        const jarak = Math.max(0, Number(r.kmAkhir ?? 0) - Number(r.kmAwal ?? 0))
        sumBbm += Number(r.nominalBbm ?? 0)
        lines.push([
          r.platNo,
          r.jenisKendaraan,
          r.merkTipe,
          r.tahun,
          r.namaDriver,
          normalizeDateDisplay(r.tanggalPakai),
          Number(r.kmAwal ?? 0),
          Number(r.kmAkhir ?? 0),
          jarak,
          Number(r.nominalBbm ?? 0),
          r.catatan ?? '',
        ])
      }
      lines.push(['', '', '', '', '', '', '', '', 'TOTAL', sumBbm, ''])
      return lines
    }

    const wb = XLSX.utils.book_new()

    const motorLines = buildExportLines(motorRows)
    const wsMotor = XLSX.utils.aoa_to_sheet(motorLines)
    wsMotor['!cols'] = [
      { wch: 14 }, { wch: 10 }, { wch: 26 }, { wch: 8 }, { wch: 22 },
      { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 30 },
    ]
    XLSX.utils.book_append_sheet(wb, wsMotor, 'Pool Motor')

    const mobilLines = buildExportLines(mobilRows)
    const wsMobil = XLSX.utils.aoa_to_sheet(mobilLines)
    wsMobil['!cols'] = [
      { wch: 14 }, { wch: 10 }, { wch: 26 }, { wch: 8 }, { wch: 22 },
      { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 30 },
    ]
    XLSX.utils.book_append_sheet(wb, wsMobil, 'Pool Mobil')

    const stamp = new Date()
    const filename = `kendaraan-operasional-${stamp.getFullYear()}-${pad2(stamp.getMonth() + 1)}-${pad2(stamp.getDate())}.xlsx`
    XLSX.writeFile(wb, filename, { compression: true })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-title">Pool Kendaraan</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Catatan Penggunaan Kendaraan Operasional
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
              Rekap pemakaian Motor dan Mobil pool operasional harian beserta BBM dan jarak tempuh.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value as 'SEMUA' | 'MOTOR' | 'MOBIL')}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              <option value="SEMUA">Semua Jenis</option>
              <option value="MOTOR">Pool Motor</option>
              <option value="MOBIL">Pool Mobil</option>
            </select>
            <button
              type="button"
              onClick={exportExcel}
              className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Export Excel (2 Sheet)
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-line bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">Pool Motor</p>
            <p className="mt-1 font-semibold text-slate-950">{formatCurrency(totals.motor)}</p>
          </div>
          <div className="rounded-xl border border-line bg-white px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">Pool Mobil</p>
            <p className="mt-1 font-semibold text-slate-950">{formatCurrency(totals.mobil)}</p>
          </div>
          <div className="rounded-xl border border-slate-950 bg-slate-950 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Total BBM</p>
            <p className="mt-1 font-bold text-white">{formatCurrency(totals.total)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">Input</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950">
              Tambah Catatan Penggunaan
            </h3>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              feedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 md:grid-cols-4 lg:grid-cols-6">
          <select
            value={jenisKendaraan}
            onChange={(e) => setJenisKendaraan(e.target.value as 'MOTOR' | 'MOBIL')}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          >
            <option value="MOTOR">Motor</option>
            <option value="MOBIL">Mobil</option>
          </select>
          <input
            value={platNo}
            onChange={(e) => setPlatNo(e.target.value)}
            placeholder="Plat No (mis. H 1234 AA)"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          <input
            value={merkTipe}
            onChange={(e) => setMerkTipe(e.target.value)}
            placeholder="Merk / Tipe (mis. Honda Vario)"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 md:col-span-2"
          />
          <input
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            placeholder="Tahun"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          <input
            value={namaDriver}
            onChange={(e) => setNamaDriver(e.target.value)}
            placeholder="Nama Driver"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 md:col-span-2"
          />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Tanggal Pakai</label>
            <input
              type="date"
              value={tanggalPakai}
              onChange={(e) => setTanggalPakai(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </div>
          <input
            type="number"
            value={kmAwal}
            onChange={(e) => setKmAwal(e.target.value)}
            placeholder="Km Awal"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          <input
            type="number"
            value={kmAkhir}
            onChange={(e) => setKmAkhir(e.target.value)}
            placeholder="Km Akhir"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          <input
            type="number"
            value={nominalBbm}
            onChange={(e) => setNominalBbm(e.target.value)}
            placeholder="Nominal BBM (Rp)"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 md:col-span-2"
          />
          <input
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan (opsional)"
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 md:col-span-6 lg:col-span-5"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSimpan}
              className="flex-1 rounded-xl border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-title">Tabel</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950">
              Riwayat Penggunaan {filterJenis === 'SEMUA' ? '' : filterJenis === 'MOTOR' ? 'Motor' : 'Mobil'}
            </h3>
          </div>
          <span className="badge border-slate-200 bg-white text-slate-600">{totals.count} catatan</span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                <th className="px-3 py-2 font-semibold">Plat No</th>
                <th className="px-3 py-2 font-semibold">Jenis</th>
                <th className="px-3 py-2 font-semibold">Merk / Tipe</th>
                <th className="px-3 py-2 font-semibold">Tahun</th>
                <th className="px-3 py-2 font-semibold">Driver</th>
                <th className="px-3 py-2 font-semibold">Tanggal Pakai</th>
                <th className="px-3 py-2 font-semibold">Km Awal</th>
                <th className="px-3 py-2 font-semibold">Km Akhir</th>
                <th className="px-3 py-2 font-semibold">Jarak</th>
                <th className="px-3 py-2 font-semibold">Nominal BBM</th>
                <th className="px-3 py-2 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-sm text-mute">
                    Belum ada catatan penggunaan kendaraan.
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => {
                  const jarak = Math.max(0, Number(r.kmAkhir ?? 0) - Number(r.kmAwal ?? 0))
                  return (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-semibold text-slate-950">{r.platNo}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            r.jenisKendaraan === 'MOTOR'
                              ? 'badge border-sky-200 bg-sky-50 text-sky-700'
                              : 'badge border-violet-200 bg-violet-50 text-violet-700'
                          }
                        >
                          {r.jenisKendaraan}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-800">{r.merkTipe}</td>
                      <td className="px-3 py-2 text-slate-700">{r.tahun}</td>
                      <td className="px-3 py-2 text-slate-700">{r.namaDriver}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-700">{normalizeDateDisplay(r.tanggalPakai)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatNumber(r.kmAwal)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatNumber(r.kmAkhir)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">{formatNumber(jarak)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">{formatCurrency(r.nominalBbm)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleHapus(r.id)}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {displayRows.length > 0 ? (
              <tfoot>
                <tr className="bg-slate-950 text-white">
                  <td colSpan={9} className="px-3 py-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-200">
                    Total Nominal BBM
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-white">{formatCurrency(totals.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  )
}
