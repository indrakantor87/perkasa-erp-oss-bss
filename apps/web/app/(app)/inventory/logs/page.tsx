import Link from 'next/link'
import { redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'

export default async function InventoryLogsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <p className="section-title">Log Aktivitas Inventory</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Ringkasan aktivitas stok dan request inventory
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Halaman ini menjadi jembatan menuju tracking inventory yang sudah aktif, sehingga user GA dan operasional punya entry point yang lebih dekat ke pola repo referensi.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Kembali ke inventory
            </Link>
            <Link
              href="/dashboard/tracking/stock-movements"
              className="rounded-full border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Buka tracking stok
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="panel p-6">
          <p className="section-title">Movement Log</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Pergerakan stok keluar, kembali, dan adjustment
          </h2>
          <p className="mt-3 text-sm leading-6 text-mute">
            Tracking ini cocok untuk membaca barang keluar, retur perangkat, dan adjustment yang memengaruhi stok operasional.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard/tracking/stock-movements"
              className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Lihat movement log
            </Link>
          </div>
        </article>

        <article className="panel p-6">
          <p className="section-title">Request Log</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Request barang dan status proses lapangan
          </h2>
          <p className="mt-3 text-sm leading-6 text-mute">
            Gunakan jalur ini untuk melihat antrean request material, pickup, approval, sampai penyelesaian request teknisi.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard/tracking/inventory-requests"
              className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Lihat request log
            </Link>
          </div>
        </article>
      </section>
    </div>
  )
}
