'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { DataSourceStatus } from '@/components/data-source-status'
import type { InventoryMovementReportItem, InventoryStockReportItem } from '@/lib/services/inventory-report-service'
import type { DataSourceSnapshot } from '@/lib/types'

type InventoryStockReportPageProps = {
  mode: 'stock'
  title: string
  description: string
  source: DataSourceSnapshot
  warning?: string | null
  items: InventoryStockReportItem[]
}

type InventoryMovementReportPageProps = {
  mode: 'movement'
  title: string
  description: string
  source: DataSourceSnapshot
  warning?: string | null
  items: InventoryMovementReportItem[]
  siblingHref: string
  siblingLabel: string
}

type InventoryReportPageProps = InventoryStockReportPageProps | InventoryMovementReportPageProps

type DailyMatrixItem = {
  itemCode: string
  itemName: string
  categoryCode: string
  unitCode: string
  dailyByDate: Record<string, { masuk: number; keluar: number }>
  totalMasuk: number
  totalKeluar: number
  stokAkhir: number
}

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

function formatDateDisplay(value: string | null | undefined) {
  if (!value) return '-'
  const raw = String(value).trim()
  if (!raw) return '-'
  let y: number | null = null
  let m: number | null = null
  let d: number | null = null
  const iso = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    y = Number(iso[1])
    m = Number(iso[2])
    d = Number(iso[3])
  } else {
    const idFormat = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
    if (idFormat) {
      d = Number(idFormat[1])
      m = Number(idFormat[2])
      y = Number(idFormat[3])
    }
  }
  if (y && m && d) {
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }
  return raw
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function bulanLabel(month: number) {
  return [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ][month - 1] ?? ''
}

export function InventoryReportPage(props: InventoryReportPageProps) {
  const today = new Date()
  const [stockMode, setStockMode] = useState<'RINGKASAN' | 'REKAP_HARIAN'>('RINGKASAN')
  const [matrixMonth, setMatrixMonth] = useState(today.getMonth() + 1)
  const [matrixYear, setMatrixYear] = useState(today.getFullYear())
  const [matrixLoading, setMatrixLoading] = useState(false)
  const [matrixData, setMatrixData] = useState<{
    dateHeaders: number[]
    items: DailyMatrixItem[]
  } | null>(null)
  const [matrixError, setMatrixError] = useState<string | null>(null)

  const totals =
    props.mode === 'stock'
      ? {
          totalRows: props.items.length,
          totalQty: props.items.reduce((sum, item) => sum + item.currentStock, 0),
          flaggedRows: props.items.filter((item) => item.currentStock <= item.minimumStock).length,
        }
      : {
          totalRows: props.items.length,
          totalQty: props.items.reduce((sum, item) => sum + item.qty, 0),
          flaggedRows: props.items.filter((item) => item.movementType === 'ADJUSTMENT').length,
        }

  async function loadMatrix() {
    if (props.mode !== 'stock') return
    setMatrixLoading(true)
    setMatrixError(null)
    try {
      const url = `/api/inventory/reports/stock/daily-matrix?month=${matrixMonth}&year=${matrixYear}`
      const res = await fetch(url, { method: 'GET', cache: 'no-store' })
      const payload = (await res.json().catch(() => null)) as {
        message?: string
        dateHeaders?: number[]
        items?: DailyMatrixItem[]
      } | null
      if (!res.ok) {
        setMatrixData(null)
        setMatrixError(payload?.message || 'Matrix rekap gagal dimuat.')
        return
      }
      setMatrixData({
        dateHeaders: Array.isArray(payload?.dateHeaders) ? payload.dateHeaders : [],
        items: Array.isArray(payload?.items) ? payload.items : [],
      })
    } catch (error) {
      setMatrixData(null)
      setMatrixError(error instanceof Error ? error.message : 'Matrix rekap gagal dimuat.')
    } finally {
      setMatrixLoading(false)
    }
  }

  useEffect(() => {
    if (props.mode === 'stock' && stockMode === 'REKAP_HARIAN') {
      void loadMatrix()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockMode, matrixMonth, matrixYear])

  const dateHeaders = matrixData?.dateHeaders ?? []
  const matrixItems = matrixData?.items ?? []

  const isMinggu = (day: number) => new Date(matrixYear, matrixMonth - 1, day).getDay() === 0

  const labelHari = (day: number) => {
    if (isMinggu(day)) return `MINGGU (${pad2(day)}/${pad2(matrixMonth)})`
    return `${pad2(day)}/${pad2(matrixMonth)}`
  }

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, DailyMatrixItem[]>()
    for (const it of matrixItems) {
      const key = it.categoryCode || 'LAINNYA'
      const arr = groups.get(key) ?? []
      arr.push(it)
      groups.set(key, arr)
    }
    return groups
  }, [matrixItems])

  function exportRingkasanExcel() {
    if (props.mode !== 'stock') return
    const rows = props.items.map((item) => ({
      'Kode Item': item.itemCode,
      'Nama Item': item.itemName,
      'Kategori': item.categoryCode,
      'Satuan': item.unitCode,
      'Stok Saat Ini': item.currentStock,
      'Minimum Stok': item.minimumStock,
      'Status': item.itemStatus,
    }))
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: ['Kode Item', 'Nama Item', 'Kategori', 'Satuan', 'Stok Saat Ini', 'Minimum Stok', 'Status'],
    })
    sheet['!cols'] = [
      { wch: 18 }, { wch: 36 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Ringkasan Stok')
    const stamp = new Date()
    const filename = `stok-ringkasan-${stamp.getFullYear()}-${pad2(stamp.getMonth() + 1)}-${pad2(stamp.getDate())}.xlsx`
    XLSX.writeFile(wb, filename, { compression: true })
  }

  function exportMatrixExcel() {
    if (props.mode !== 'stock') return
    const dateH = dateHeaders
    const periodLabel = `REKAP STOK BARANG PT MEGA DATA PERKASA - ${bulanLabel(matrixMonth).toUpperCase()} ${matrixYear}`
    const colCount = 3 + dateH.length + 3
    const lines: Array<Array<string | number>> = []

    const titleRow: Array<string | number> = new Array(colCount).fill('')
    titleRow[0] = periodLabel
    lines.push(titleRow)

    const headerRow1: Array<string | number> = []
    headerRow1.push('KODE', 'NAMA BARANG', 'SATUAN')
    for (const d of dateH) headerRow1.push(labelHari(d))
    headerRow1.push('TOTAL MASUK', 'TOTAL KELUAR', 'STOK AKHIR')
    lines.push(headerRow1)

    const byCategory = categoryGroups
    for (const [cat, catItems] of byCategory.entries()) {
      const catRow: Array<string | number> = new Array(colCount).fill('')
      catRow[0] = `KATEGORI: ${cat}`
      lines.push(catRow)

      let subMasuk = 0
      let subKeluar = 0
      let subAkhir = 0

      for (const it of catItems) {
        const row: Array<string | number> = []
        row.push(it.itemCode, it.itemName, it.unitCode)
        for (const d of dateH) {
          const key = String(d)
          const bucket = it.dailyByDate[key]
          if (bucket && (bucket.masuk || bucket.keluar)) {
            row.push(`${bucket.masuk ? `+${bucket.masuk}` : ''}${bucket.keluar ? ` -${bucket.keluar}` : ''}`)
          } else {
            row.push('')
          }
        }
        row.push(it.totalMasuk, it.totalKeluar, it.stokAkhir)
        subMasuk += it.totalMasuk
        subKeluar += it.totalKeluar
        subAkhir += it.stokAkhir
        lines.push(row)
      }

      const subRow: Array<string | number> = new Array(colCount).fill('')
      subRow[1] = `Subtotal ${cat}`
      subRow[2] = ''
      subRow[colCount - 3] = subMasuk
      subRow[colCount - 2] = subKeluar
      subRow[colCount - 1] = subAkhir
      lines.push(subRow)
      lines.push([])
    }

    let grandMasuk = 0
    let grandKeluar = 0
    let grandAkhir = 0
    for (const it of matrixItems) {
      grandMasuk += it.totalMasuk
      grandKeluar += it.totalKeluar
      grandAkhir += it.stokAkhir
    }
    const grandRow: Array<string | number> = new Array(colCount).fill('')
    grandRow[1] = 'TOTAL KESELURUHAN'
    grandRow[colCount - 3] = grandMasuk
    grandRow[colCount - 2] = grandKeluar
    grandRow[colCount - 1] = grandAkhir
    lines.push(grandRow)

    const worksheet = XLSX.utils.aoa_to_sheet(lines)
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    ]
    worksheet['!cols'] = [
      { wch: 16 }, { wch: 36 }, { wch: 12 },
      ...dateH.map(() => ({ wch: 10 })),
      { wch: 14 }, { wch: 14 }, { wch: 14 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap ${bulanLabel(matrixMonth)} ${matrixYear}`)
    const filename = `rekap-stok-harian-${matrixYear}-${pad2(matrixMonth)}.xlsx`
    XLSX.writeFile(workbook, filename, { compression: true })
  }

  return (
    <div className="space-y-6">
      <DataSourceStatus source={props.source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Laporan Inventory</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">{props.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{props.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Kembali ke inventory
            </Link>
            {props.mode === 'movement' ? (
              <Link
                href={props.siblingHref}
                className="rounded-full border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                {props.siblingLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {props.warning ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
          <p className="text-sm font-semibold">Catatan</p>
          <p className="mt-2 text-sm leading-6">{props.warning}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total baris</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(totals.totalRows)}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
            {props.mode === 'stock' ? 'Total stok' : 'Total qty movement'}
          </p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(totals.totalQty)}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
            {props.mode === 'stock' ? 'Di bawah minimum' : 'Adjustment'}
          </p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(totals.flaggedRows)}
          </p>
        </article>
      </section>

      {props.mode === 'stock' ? (
        <div className="mb-2 flex flex-col gap-3 rounded-3xl border border-line bg-white p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1" role="tablist">
            <button
              type="button"
              onClick={() => setStockMode('RINGKASAN')}
              className={
                stockMode === 'RINGKASAN'
                  ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm'
                  : 'rounded-xl px-4 py-2 text-sm font-medium text-mute transition hover:text-slate-700'
              }
            >
              ① Ringkasan Stok
            </button>
            <button
              type="button"
              onClick={() => setStockMode('REKAP_HARIAN')}
              className={
                stockMode === 'REKAP_HARIAN'
                  ? 'rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm'
                  : 'rounded-xl px-4 py-2 text-sm font-medium text-mute transition hover:text-slate-700'
              }
            >
              ② Rekap Harian (Matrix)
            </button>
          </div>
          {stockMode === 'REKAP_HARIAN' ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Bulan</label>
                <select
                  value={matrixMonth}
                  onChange={(event) => setMatrixMonth(Number(event.target.value))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      {bulanLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Tahun</label>
                <select
                  value={matrixYear}
                  onChange={(event) => setMatrixYear(Number(event.target.value))}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  {[today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void loadMatrix()}
                className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={exportMatrixExcel}
                className="rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Export Excel Rekap
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
      ) : null}

      <section className="panel p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
          <div>
            <p className="section-title">
              {props.mode === 'stock'
                ? stockMode === 'RINGKASAN'
                  ? 'Stok Aktif'
                  : 'Rekap Harian Stok'
                : 'Movement Terbaru'}
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {props.mode === 'stock'
                ? stockMode === 'RINGKASAN'
                  ? 'Stok item berdasarkan item master'
                  : `Rekap per tanggal periode ${bulanLabel(matrixMonth)} ${matrixYear}`
                : 'Riwayat movement inventory yang paling relevan'}
            </h2>
          </div>
          <span className="badge border-slate-200 bg-white text-slate-600">
            {props.mode === 'stock' && stockMode === 'REKAP_HARIAN'
              ? `${matrixItems.length} item • ${dateHeaders.length} hari`
              : `${formatNumber(totals.totalRows)} baris`}
          </span>
        </div>

        {props.mode === 'stock' && stockMode === 'REKAP_HARIAN' ? (
          <div className="mt-4 overflow-x-auto">
            {matrixLoading ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-mute">
                Memuat matrix rekap harian...
              </div>
            ) : matrixError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {matrixError}
              </div>
            ) : matrixItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-mute">
                Belum ada data movement untuk periode ini.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                    <th className="sticky left-0 z-20 bg-white px-4 py-3 font-semibold">Kode</th>
                    <th className="sticky left-[88px] z-20 bg-white px-4 py-3 font-semibold">Nama Barang</th>
                    <th className="px-4 py-3 font-semibold">Satuan</th>
                    {dateHeaders.map((d) => (
                      <th
                        key={d}
                        className={`px-4 py-3 font-semibold ${isMinggu(d) ? 'bg-amber-50 text-amber-700' : ''}`}
                      >
                        {labelHari(d)}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold">Total Masuk</th>
                    <th className="px-4 py-3 font-semibold">Total Keluar</th>
                    <th className="px-4 py-3 font-semibold">Stok Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.from(categoryGroups.entries()).flatMap(([cat, catItems]) => {
                    let subMasuk = 0
                    let subKeluar = 0
                    let subAkhir = 0
                    for (const it of catItems) {
                      subMasuk += it.totalMasuk
                      subKeluar += it.totalKeluar
                      subAkhir += it.stokAkhir
                    }
                    return [
                      <tr key={`cat-${cat}`} className="bg-slate-50">
                        <td colSpan={3 + dateHeaders.length + 3} className="sticky left-0 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                          Kategori: {cat}
                        </td>
                      </tr>,
                      ...catItems.map((it) => (
                        <tr key={`it-${it.itemCode}`}>
                          <td className="sticky left-0 bg-white px-4 py-3 align-top font-semibold text-slate-950">{it.itemCode}</td>
                          <td className="sticky left-[88px] bg-white px-4 py-3 align-top text-slate-800">{it.itemName}</td>
                          <td className="px-4 py-3 align-top text-slate-700">{it.unitCode}</td>
                          {dateHeaders.map((d) => {
                            const key = String(d)
                            const bucket = it.dailyByDate[key]
                            const masuk = bucket?.masuk ?? 0
                            const keluar = bucket?.keluar ?? 0
                            return (
                              <td
                                key={d}
                                className={`px-2 py-3 align-top text-center tabular-nums ${isMinggu(d) ? 'bg-amber-50/60' : ''}`}
                              >
                                {masuk || keluar ? (
                                  <div className="flex flex-col gap-1">
                                    {masuk ? <span className="text-emerald-700 font-semibold">+{formatNumber(masuk)}</span> : null}
                                    {keluar ? <span className="text-rose-700 font-semibold">-{formatNumber(keluar)}</span> : null}
                                  </div>
                                ) : (
                                  <span className="text-mute">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-4 py-3 align-top text-right tabular-nums font-semibold text-emerald-700">{formatNumber(it.totalMasuk)}</td>
                          <td className="px-4 py-3 align-top text-right tabular-nums font-semibold text-rose-700">{formatNumber(it.totalKeluar)}</td>
                          <td className="px-4 py-3 align-top text-right tabular-nums font-bold text-slate-950">{formatNumber(it.stokAkhir)}</td>
                        </tr>
                      )),
                      <tr key={`sub-${cat}`} className="bg-slate-50/70">
                        <td colSpan={2} className="sticky left-0 px-4 py-2 text-sm font-bold text-slate-800">
                          Subtotal {cat}
                        </td>
                        <td></td>
                        {dateHeaders.map((d) => (
                          <td key={d} className={isMinggu(d) ? 'bg-amber-50/40' : ''}></td>
                        ))}
                        <td className="px-4 py-2 text-right tabular-nums font-bold text-emerald-700">{formatNumber(subMasuk)}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-bold text-rose-700">{formatNumber(subKeluar)}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-bold text-slate-950">{formatNumber(subAkhir)}</td>
                      </tr>,
                    ]
                  })}
                  {(() => {
                    let grandMasuk = 0
                    let grandKeluar = 0
                    let grandAkhir = 0
                    for (const it of matrixItems) {
                      grandMasuk += it.totalMasuk
                      grandKeluar += it.totalKeluar
                      grandAkhir += it.stokAkhir
                    }
                    return (
                      <tr key="grand" className="bg-slate-950 text-white">
                        <td colSpan={2} className="sticky left-0 bg-slate-950 px-4 py-3 text-sm font-bold">
                          TOTAL KESELURUHAN
                        </td>
                        <td></td>
                        {dateHeaders.map((d) => (
                          <td key={d}></td>
                        ))}
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-300">{formatNumber(grandMasuk)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-rose-300">{formatNumber(grandKeluar)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-white">{formatNumber(grandAkhir)}</td>
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            {props.mode === 'stock' ? (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">Satuan</th>
                    <th className="px-4 py-3 font-semibold">Stok Saat Ini</th>
                    <th className="px-4 py-3 font-semibold">Minimum</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {props.items.length > 0 ? (
                    props.items.map((item) => (
                      <tr key={`${item.itemCode}-${item.itemName}`}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">{item.itemCode}</p>
                          <p className="mt-1 text-sm text-mute">{item.itemName}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{item.categoryCode}</td>
                        <td className="px-4 py-4 text-slate-700">{item.unitCode}</td>
                        <td className="px-4 py-4 text-slate-700">{formatNumber(item.currentStock)}</td>
                        <td className="px-4 py-4 text-slate-700">{formatNumber(item.minimumStock)}</td>
                        <td className="px-4 py-4">
                          <span className="badge border-slate-200 bg-white text-slate-600">{item.itemStatus}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-mute">
                        Belum ada data stok yang bisa ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Tipe</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Referensi</th>
                    <th className="px-4 py-3 font-semibold">Waktu</th>
                    <th className="px-4 py-3 font-semibold">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {props.items.length > 0 ? (
                    props.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">{item.itemCode}</p>
                          <p className="mt-1 text-sm text-mute">{item.itemName}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="badge border-slate-200 bg-white text-slate-600">{item.movementType}</span>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{formatNumber(item.qty)}</td>
                        <td className="px-4 py-4 text-slate-700">{item.referenceNo}</td>
                        <td className="px-4 py-4 text-slate-700">{formatDateDisplay(item.movementAt)}</td>
                        <td className="px-4 py-4 text-slate-700">{item.notes}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-mute">
                        Belum ada data movement yang bisa ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
