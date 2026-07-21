import Link from 'next/link'
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

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

export function InventoryReportPage(props: InventoryReportPageProps) {
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

      <section className="panel p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
          <div>
            <p className="section-title">{props.mode === 'stock' ? 'Stok Aktif' : 'Movement Terbaru'}</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {props.mode === 'stock' ? 'Stok item berdasarkan item master' : 'Riwayat movement inventory yang paling relevan'}
            </h2>
          </div>
          <span className="badge border-slate-200 bg-white text-slate-600">{formatNumber(totals.totalRows)} baris</span>
        </div>

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
                      <td className="px-4 py-4 text-slate-700">{item.movementAt}</td>
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
      </section>
    </div>
  )
}
