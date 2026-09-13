'use client'

import * as XLSX from 'xlsx'
import { InventoryItemLoanForm } from '@/components/inventory-item-loan-form'
import { InventoryLoanReturnForm } from '@/components/inventory-loan-return-form'
import type { DomainReviewRow, DomainReviewSection } from '@/lib/types'

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function parseMetaDateTime(value: string): string {
  if (!value || value === '-') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return trimmed
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('RETURNED') || normalized.includes('DIKEMBALIKAN')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized.includes('PARTIAL')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('OVERDUE')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  return 'border-sky-200 bg-sky-50 text-sky-700'
}

function buildCountMap(rows: DomainReviewRow[]) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.status.trim() || 'UNKNOWN'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({ label, count }))
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

type LoanTableRow = {
  no: number
  loanCode: string
  itemCode: string
  itemName: string
  borrower: string
  division: string
  subdivision: string
  qty: string
  returned: string
  remaining: string
  borrowedAt: string
  dueAt: string
  returnedAt: string
  status: string
  notes: string
}

function buildLoanTableRows(rows: DomainReviewRow[]): LoanTableRow[] {
  return rows.map((row, idx) => {
    const secondary = String(row.secondary ?? '')
    const parts = secondary.split('|').map((s) => s.trim())
    const itemCode = parts[0] || ''
    const itemName = parts.slice(1).join(' | ').trim()
    return {
      no: idx + 1,
      loanCode: String(row.primary ?? ''),
      itemCode,
      itemName,
      borrower: pickMeta(row.meta, 'Peminjam: '),
      division: pickMeta(row.meta, 'Divisi: '),
      subdivision: pickMeta(row.meta, 'Sub-divisi: '),
      qty: pickMeta(row.meta, 'Qty Pinjam: '),
      returned: pickMeta(row.meta, 'Qty Kembali: '),
      remaining: pickMeta(row.meta, 'Sisa Pinjam: '),
      borrowedAt: parseMetaDateTime(pickMeta(row.meta, 'Dipinjam: ')),
      dueAt: parseMetaDateTime(pickMeta(row.meta, 'Jatuh Tempo: ')),
      returnedAt: parseMetaDateTime(pickMeta(row.meta, 'Dikembalikan: ')),
      status: String(row.status ?? ''),
      notes: String(row.detail ?? ''),
    }
  })
}

function exportLoanTable(tableRows: LoanTableRow[]) {
  const stamp = new Date()
  const periodLabel = `DAFTAR PINJAMAN INVENTORY PT MEGA DATA PERKASA - ${pad2(stamp.getDate())}/${pad2(stamp.getMonth() + 1)}/${stamp.getFullYear()}`
  const colCount = 14
  const lines: Array<Array<string | number>> = []

  const titleRow: Array<string | number> = new Array(colCount).fill('')
  titleRow[0] = periodLabel
  lines.push(titleRow)
  lines.push(new Array(colCount).fill(''))

  const headerRow: Array<string | number> = [
    'NO',
    'KODE PINJAM',
    'KODE BARANG',
    'NAMA BARANG',
    'NAMA PEMINJAM',
    'DIVISI',
    'SUB DIVISI',
    'QTY PINJAM',
    'QTY KEMBALI',
    'SISA',
    'TGL PINJAM',
    'JATUH TEMPO',
    'TGL KEMBALI',
    'STATUS',
  ]
  lines.push(headerRow)

  let sumQty = 0
  let sumReturned = 0
  let sumRemaining = 0
  for (const r of tableRows) {
    lines.push([
      r.no,
      r.loanCode,
      r.itemCode,
      r.itemName,
      r.borrower,
      r.division,
      r.subdivision,
      r.qty,
      r.returned,
      r.remaining,
      r.borrowedAt,
      r.dueAt,
      r.returnedAt,
      r.status,
    ])
    const qNum = Number.parseFloat(String(r.qty).replace(/\D/g, '')) || 0
    const retNum = Number.parseFloat(String(r.returned).replace(/\D/g, '')) || 0
    const remNum = Number.parseFloat(String(r.remaining).replace(/\D/g, '')) || 0
    sumQty += qNum
    sumReturned += retNum
    sumRemaining += remNum
  }

  const footer: Array<string | number> = new Array(colCount).fill('')
  footer[0] = ''
  footer[1] = ''
  footer[2] = ''
  footer[3] = 'TOTAL'
  footer[7] = sumQty
  footer[8] = sumReturned
  footer[9] = sumRemaining
  lines.push(footer)

  const sheet = XLSX.utils.aoa_to_sheet(lines)
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }]
  sheet['!cols'] = [
    { wch: 5 }, { wch: 20 }, { wch: 18 }, { wch: 34 }, { wch: 24 }, { wch: 16 }, { wch: 20 },
    { wch: 12 }, { wch: 13 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Daftar Pinjaman')
  const filename = `daftar-pinjaman-inventory-${stamp.getFullYear()}-${pad2(stamp.getMonth() + 1)}-${pad2(stamp.getDate())}.xlsx`
  XLSX.writeFile(wb, filename, { compression: true })
}

export function InventoryLoanOpsPanel({
  sections,
  canCreate,
  canUpdate,
  reviewDbReady,
  itemSuggestions,
  rackSuggestions,
  loanSuggestions,
  requireScan,
  initialItemValue,
  initialLoanValue,
}: {
  sections: DomainReviewSection[]
  canCreate: boolean
  canUpdate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  rackSuggestions: string[]
  loanSuggestions: string[]
  requireScan: boolean
  initialItemValue?: string
  initialLoanValue?: string
}) {
  const loanSection = findSection(sections, 'PINJAMAN INVENTORY')
  if (!loanSection) {
    return null
  }

  const overdueRows = loanSection.rows.filter((row) => row.status.toUpperCase().includes('OVERDUE'))
  const partialRows = loanSection.rows.filter((row) => row.status.toUpperCase().includes('PARTIAL'))
  const statusItems = buildCountMap(loanSection.rows)
  const tableRows = buildLoanTableRows(loanSection.rows)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Pinjaman Dan Pengembalian</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Kontrol barang pinjam yang wajib kembali
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini memisahkan barang habis pakai dari barang yang harus kembali ke gudang. Fokus
            utamanya adalah pinjaman aktif, keterlambatan pengembalian, dan progress return sebagian.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">
            {loanSection.rows.length} pinjaman
          </span>
          {partialRows.length ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              {partialRows.length} return sebagian
            </span>
          ) : null}
          {overdueRows.length ? (
            <span className="badge border-rose-200 bg-rose-50 text-rose-700">
              {overdueRows.length} overdue
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => exportLoanTable(tableRows)}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi Workspace</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div id="inventory-action-item-loan" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryItemLoanForm
                canCreate={canCreate}
                reviewDbReady={reviewDbReady}
                itemSuggestions={itemSuggestions}
                rackSuggestions={rackSuggestions}
                requireScan={requireScan}
                initialItemValue={initialItemValue}
                embedded
              />
            </div>
            <div id="inventory-action-loan-return" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryLoanReturnForm
                canUpdate={canUpdate}
                reviewDbReady={reviewDbReady}
                loanSuggestions={loanSuggestions}
                initialLoanValue={initialLoanValue}
                embedded
              />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Ringkasan Status</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusItems.map((item) => (
              <span key={item.label} className={`badge ${getStatusTone(item.label)}`}>
                {item.label}: {item.count}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Daftar Pinjaman Inventory</p>
            <p className="text-xs text-mute">Catatan: daftar menampilkan {tableRows.length} pinjaman terbaru sesuai urutan dibuat.</p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[1500px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-800">
                <tr>
                  <th className="sticky left-0 z-20 w-12 bg-slate-100 px-3 py-3 text-xs font-semibold uppercase tracking-wider">No</th>
                  <th className="sticky left-[52px] z-20 bg-slate-100 px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Kode Pinjam</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Kode Barang</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Nama Barang</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Peminjam</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Divisi</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Sub Divisi</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Qty Pinjam</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Qty Kembali</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Sisa</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Tgl Pinjam</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Jatuh Tempo</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Tgl Kembali</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="sticky left-0 z-0 px-3 py-8 text-center text-sm text-mute">
                      Belum ada pinjaman inventory tercatat di review DB.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((r) => (
                    <tr key={r.loanCode} className="border-t border-slate-200 align-top hover:bg-slate-50">
                      <td className="sticky left-0 z-0 bg-white px-3 py-3 font-mono text-sm text-slate-500">{r.no}</td>
                      <td className="sticky left-[52px] z-0 bg-white px-3 py-3 font-mono text-slate-900">{r.loanCode}</td>
                      <td className="px-3 py-3 font-mono text-slate-900">{r.itemCode || '-'}</td>
                      <td className="px-3 py-3 text-slate-900">{r.itemName || '-'}</td>
                      <td className="px-3 py-3 text-slate-900">{r.borrower || '-'}</td>
                      <td className="px-3 py-3 text-slate-700">{r.division || '-'}</td>
                      <td className="px-3 py-3 text-slate-700">{r.subdivision || '-'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-900">{r.qty || '0'}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-900">{r.returned || '0'}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-900">{r.remaining || '0'}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-700 whitespace-nowrap">{r.borrowedAt || '-'}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-700 whitespace-nowrap">{r.dueAt || '-'}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-700 whitespace-nowrap">{r.returnedAt || '-'}</td>
                      <td className="px-3 py-3">
                        <span className={`badge ${getStatusTone(r.status)}`}>{r.status || '-'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {tableRows.length > 0 ? (
                <tfoot className="bg-emerald-50 text-slate-900">
                  <tr className="border-t border-emerald-200">
                    <td colSpan={7} className="sticky left-0 bg-emerald-50 px-3 py-3 text-sm font-semibold">
                      TOTAL
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">
                      {tableRows.reduce((a, r) => a + (Number.parseFloat(String(r.qty).replace(/\D/g, '')) || 0), 0)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">
                      {tableRows.reduce((a, r) => a + (Number.parseFloat(String(r.returned).replace(/\D/g, '')) || 0), 0)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-800">
                      {tableRows.reduce((a, r) => a + (Number.parseFloat(String(r.remaining).replace(/\D/g, '')) || 0), 0)}
                    </td>
                    <td colSpan={4} className="px-3 py-3 text-sm text-mute">Jumlah keseluruhan</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}
