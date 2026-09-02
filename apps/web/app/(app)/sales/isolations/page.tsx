import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import type { DomainReviewRow, SupportLaneKey } from '@/lib/types'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function filterRowsByMarketingOwner(rows: DomainReviewRow[], ownerCandidates: string[]) {
  const normalizedCandidates = ownerCandidates
    .map((item) => String(item ?? '').trim().toUpperCase())
    .filter(Boolean)

  if (!normalizedCandidates.length) {
    return rows
  }

  return rows.filter((row) => {
    const marketingName =
      row.meta
        .find((item) => item.startsWith('Marketing: '))
        ?.replace('Marketing: ', '')
        .trim()
        .toUpperCase() ?? ''

    return marketingName ? normalizedCandidates.includes(marketingName) : false
  })
}

function pickMeta(row: DomainReviewRow, prefix: string) {
  return (
    row.meta
      .find((item) => item.startsWith(prefix))
      ?.replace(prefix, '')
      .trim() ?? ''
  )
}

export default async function SalesIsolationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string | string[]
    radboox?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/isolations')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getDomainPageData('support', session, {
    supportLane: 'isolations' as SupportLaneKey,
    focus: 'ACTIVE_ISOLATIONS',
  })

  if (!payload) {
    notFound()
  }

  const reviewSections = payload.content.reviewSections ?? []
  const isolationSection = reviewSections.find((section) => section.title.trim().toUpperCase().includes('ISOLIR AKTIF'))
  const scopedRows = filterRowsByMarketingOwner(isolationSection?.rows ?? [], [session.displayName, session.username])
  const q = String(resolveSearchParam(resolvedSearchParams.q) ?? '').trim().toUpperCase()
  const radboox = String(resolveSearchParam(resolvedSearchParams.radboox) ?? '').trim().toUpperCase()

  const radbooxOptions = Array.from(
    new Set(
      scopedRows
        .map((row) => row.secondary)
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right))

  const filteredRows = scopedRows.filter((row) => {
    const rowRadboox = String(row.secondary ?? '').trim().toUpperCase()
    const haystack = [row.primary, row.secondary, row.detail, ...row.meta].join(' ').toUpperCase()
    const qMatched = !q || haystack.includes(q)
    const radbooxMatched = !radboox || rowRadboox === radboox
    return qMatched && radbooxMatched
  })

  const totalRows = filteredRows.length
  const withTicket = filteredRows.filter((row) => pickMeta(row, 'Ticket Dismantle: ').toUpperCase() === 'SUDAH').length
  const withoutTicket = filteredRows.filter((row) => pickMeta(row, 'Ticket Dismantle: ').toUpperCase() !== 'SUDAH').length

  return (
    <div className="space-y-4">
      <DataSourceStatus source={payload.source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">Penjualan</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
              List Data Isolir
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muteStrong">
              Halaman ini fokus untuk memantau data isolir milik user login dengan pola tabel monitoring seperti referensi `web-psb-perkasa`, tanpa membawa lane support yang lebih lebar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales"
              className="rounded-md border border-line bg-surfaceSoft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Kembali ke Penjualan
            </Link>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="rounded-xl border border-line bg-surfaceSoft px-4 py-3 text-sm text-muteStrong">
          Data isolir di menu penjualan dibatasi ke customer yang terkait marketing user login, sehingga tabel tetap fokus untuk follow up prospek dan customer aktif.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-surface px-4 py-4 text-muteStrong">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Total Isolir</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{totalRows}</p>
            <p className="mt-2 text-sm leading-6 text-muteStrong">Customer isolir aktif sesuai ownership marketing user login.</p>
          </article>
          <article className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-4 text-warning">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">Belum Ada Ticket</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{withoutTicket}</p>
            <p className="mt-2 text-sm leading-6 text-warning/90">Kasus isolir yang belum masuk ke jalur dismantle.</p>
          </article>
          <article className="rounded-2xl border border-info/40 bg-info/10 px-4 py-4 text-info">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-info">Sudah Berticket</p>
            <p className="mt-2 text-3xl font-semibold text-inkStrong">{withTicket}</p>
            <p className="mt-2 text-sm leading-6 text-info/90">Data isolir yang sudah punya ticket dismantle.</p>
          </article>
        </div>

        <form className="mt-4 grid gap-4 lg:grid-cols-4" action="/sales/isolations" method="get">
          <label className="flex flex-col gap-2 text-sm text-muteStrong lg:col-span-3">
            <span className="font-semibold text-inkStrong">Search</span>
            <input
              name="q"
              defaultValue={resolveSearchParam(resolvedSearchParams.q) ?? ''}
              placeholder="Nama pelanggan / service no / no hp / marketing"
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-muteStrong">
            <span className="font-semibold text-inkStrong">Radboox</span>
            <select
              name="radboox"
              defaultValue={resolveSearchParam(resolvedSearchParams.radboox) ?? ''}
              className="rounded-2xl border border-line bg-surface px-4 py-3 text-ink outline-none transition focus:shadow-focus"
            >
              <option value="">Semua</option>
              {radbooxOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="lg:col-span-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accentInk"
            >
              Terapkan Filter
            </button>
            <Link
              href="/sales/isolations"
              className="inline-flex items-center justify-center rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm font-semibold text-muteStrong transition hover:bg-surface hover:text-inkStrong"
            >
              Reset
            </Link>
          </div>
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surfaceElevated shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[1260px] w-full border-collapse">
              <thead className="bg-surfaceStrong">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muteStrong">
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Pelanggan</th>
                  <th className="px-4 py-3">User / Service</th>
                  <th className="px-4 py-3">No. HP</th>
                  <th className="px-4 py-3">Marketing</th>
                  <th className="px-4 py-3">Radboox</th>
                  <th className="px-4 py-3">Suspend</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {filteredRows.map((row, index) => (
                  <tr key={row.id} className="align-top transition-colors hover:bg-surfaceSoft">
                    <td className="px-4 py-3 text-sm text-muteStrong">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p className="font-semibold text-inkStrong">{row.primary}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mute">{pickMeta(row, 'Customer Code: ') || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Service No: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Phone: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Marketing: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muteStrong">{row.secondary || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muteStrong">{pickMeta(row, 'Isolasi: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <p className="max-w-[320px] leading-6">{row.detail || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muteStrong">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                          pickMeta(row, 'Ticket Dismantle: ').toUpperCase() === 'SUDAH'
                            ? 'bg-info/15 text-info'
                            : 'bg-warning/15 text-warning'
                        }`}
                      >
                        {pickMeta(row, 'Ticket Dismantle: ') || 'Belum'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-sm text-muteStrong">
                      Belum ada data isolir yang sesuai filter untuk user login.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
