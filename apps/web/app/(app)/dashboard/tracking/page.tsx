import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'

export default async function DashboardTrackingIndexPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const source = getDataSourceSnapshot()

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />
      <section className="panel p-6">
        <p className="section-title">Tracking</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Pekerjaan & Barang</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">
          Halaman ini menampilkan tracking berbasis review DB untuk work order lapangan dan pergerakan barang.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/dashboard/tracking/work-orders"
            className="surface-soft rounded-3xl border border-line p-5 transition hover:[border-color:var(--color-line-strong)]"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Tracking Pekerjaan (Work Order)</p>
            <p className="mt-2 text-sm leading-6 text-mute">List WO + detail status log, assignment log, dan movement terkait.</p>
          </Link>
          <Link
            href="/dashboard/tracking/stock-movements"
            className="surface-soft rounded-3xl border border-line p-5 transition hover:[border-color:var(--color-line-strong)]"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Tracking Barang (Stock Movement)</p>
            <p className="mt-2 text-sm leading-6 text-mute">List movement + filter WO/TT/teknisi/lokasi dan detail jejak barang.</p>
          </Link>
          <div className="surface-soft rounded-3xl border border-line p-5">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Deep Link Trouble Ticket</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              Detail TT bisa dibuka dari movement atau work order yang sudah terhubung ke ticket lapangan.
            </p>
          </div>
          <div className="surface-soft rounded-3xl border border-line p-5">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Deep Link Request Barang</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              Detail request barang bisa dibuka dari movement yang punya relasi `request_id`.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
