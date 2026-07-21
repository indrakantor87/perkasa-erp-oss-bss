import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import type { InventoryMasterSummaryItem } from '@/lib/services/inventory-master-service'
import type { DataSourceSnapshot } from '@/lib/types'

type InventoryMasterSummaryPageProps = {
  title: string
  description: string
  sectionTitle: string
  items: InventoryMasterSummaryItem[]
  source: DataSourceSnapshot
  warning?: string | null
  siblingHref: string
  siblingLabel: string
}

function formatNumber(value: number) {
  return value.toLocaleString('id-ID')
}

export function InventoryMasterSummaryPage({
  title,
  description,
  sectionTitle,
  items,
  source,
  warning,
  siblingHref,
  siblingLabel,
}: InventoryMasterSummaryPageProps) {
  const totalCodes = items.length
  const populatedCodes = items.filter((item) => item.itemCount > 0).length
  const totalStock = items.reduce((sum, item) => sum + item.totalStock, 0)

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <div className="mt-1 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Data Master Inventory</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory/items"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Lihat data barang
            </Link>
            <Link
              href={siblingHref}
              className="rounded-full border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              {siblingLabel}
            </Link>
          </div>
        </div>
      </section>

      {warning ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
          <p className="text-sm font-semibold">Catatan</p>
          <p className="mt-2 text-sm leading-6">{warning}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total kode</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(totalCodes)}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Sudah dipakai</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(populatedCodes)}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total stok</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(totalStock)}
          </p>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
          <div>
            <p className="section-title">{sectionTitle}</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Distribusi master yang aktif di inventory
            </h2>
            <p className="mt-2 text-sm leading-6 text-mute">
              Halaman ini memudahkan pengecekan master yang paling sering dipakai sebelum masuk ke `Data Barang`.
            </p>
          </div>
          <span className="badge border-slate-200 bg-white text-slate-600">{formatNumber(items.length)} baris</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.18em] text-mute">
                <th className="px-4 py-3 font-semibold">Kode</th>
                <th className="px-4 py-3 font-semibold">Jumlah Item</th>
                <th className="px-4 py-3 font-semibold">Item Aktif</th>
                <th className="px-4 py-3 font-semibold">Total Stok</th>
                <th className="px-4 py-3 font-semibold">Minimum Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.code} className="align-top">
                    <td className="px-4 py-4 font-semibold text-slate-950">{item.code}</td>
                    <td className="px-4 py-4 text-slate-700">{formatNumber(item.itemCount)}</td>
                    <td className="px-4 py-4 text-slate-700">{formatNumber(item.activeItemCount)}</td>
                    <td className="px-4 py-4 text-slate-700">{formatNumber(item.totalStock)}</td>
                    <td className="px-4 py-4 text-slate-700">{formatNumber(item.totalMinimumStock)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-mute">
                    Belum ada data yang bisa ditampilkan untuk master ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
