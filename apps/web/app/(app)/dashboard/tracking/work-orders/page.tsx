import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getWorkOrderTrackingList, type WorkOrderTrackingQuery } from '@/lib/services/tracking-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function WorkOrderTrackingListPage({
  searchParams,
}: {
  searchParams?: Promise<WorkOrderTrackingQuery>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const query = (await searchParams) ?? {}
  const payload = await getWorkOrderTrackingList(query, { session })
  const q = resolveSearchParam(query.q) ?? ''
  const status = resolveSearchParam(query.status) ?? ''
  const jobCategory = resolveSearchParam(query.jobCategory) ?? ''
  const priority = resolveSearchParam(query.priority) ?? ''
  const mine = ['1', 'true', 'yes', 'on'].includes((resolveSearchParam(query.mine) ?? '').trim().toLowerCase())

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <section className="panel p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Tracking Pekerjaan</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Work Order Lapangan</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Filter dan pilih work order untuk melihat status log, assignment log, dan movement barang terkait.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
          >
            Kembali
          </Link>
        </div>

        <form className="mt-6 grid gap-4 lg:grid-cols-5" action="/dashboard/tracking/work-orders" method="get">
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="WO-202607-0001 / nama teknisi"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <input
              name="status"
              defaultValue={status}
              placeholder="OPEN"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Kategori</span>
            <input
              name="jobCategory"
              defaultValue={jobCategory}
              placeholder="PSB"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Prioritas</span>
            <input
              name="priority"
              defaultValue={priority}
              placeholder="MEDIUM"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>

          <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4" />
              Pekerjaan saya
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            >
              Terapkan Filter
            </button>
            <Link
              href="/dashboard/tracking/work-orders"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Reset
            </Link>
            <span className="solid-chip">{payload.items.length} item</span>
          </div>
        </form>

        {payload.error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Review DB belum bisa dibaca</p>
            <p className="mt-2 text-sm leading-6">{payload.error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                <th className="px-4 py-3">WO</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prioritas</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">Teknisi/TIm</th>
                <th className="px-4 py-3">Jadwal</th>
                <th className="px-4 py-3">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {payload.items.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-4 align-top">
                    <Link
                      href={`/dashboard/tracking/work-orders/${row.id}`}
                      className="text-sm font-semibold text-[var(--color-ink-strong)] hover:opacity-90"
                    >
                      {row.workOrderNo ?? `#${row.id}`}
                    </Link>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mute">{row.workType ?? '-'}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.jobCategory ?? '-'}</td>
                  <td className="px-4 py-4 align-top">
                    <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>
                      {row.status ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.priority ?? '-'}</td>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                    {row.picFullName || row.picUsername ? (
                      <>
                        <p className="font-semibold text-[var(--color-ink-strong)]">{row.picFullName ?? row.picUsername}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-mute">{row.picUsername ? `@${row.picUsername}` : ''}</p>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.technicianName ?? '-'}</td>
                  <td className="px-4 py-4 align-top text-sm text-[var(--color-mute-strong)]">{row.scheduledAt ?? '-'}</td>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-mute">
                    <p>SO: {row.salesOrderId ?? '-'}</p>
                    <p>TT: {row.troubleTicketId ?? '-'}</p>
                    <p>SUB: {row.subscriptionId ?? '-'}</p>
                  </td>
                </tr>
              ))}
              {!payload.items.length ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-mute" colSpan={8}>
                    Tidak ada data pada kombinasi filter ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
