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

  const isolationSection = payload.content.reviewSections.find((section) => section.title.trim().toUpperCase().includes('ISOLIR AKTIF'))
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

      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Penjualan</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">
              List Data Isolir
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-200">
              Halaman ini fokus untuk memantau data isolir milik user login dengan pola tabel monitoring seperti referensi `web-psb-perkasa`, tanpa membawa lane support yang lebih lebar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/sales"
              className="rounded-md border border-slate-500 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
            >
              Kembali ke Penjualan
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
        <div className="rounded-xl border border-slate-700 bg-slate-900/20 px-4 py-3 text-sm text-slate-100">
          Data isolir di menu penjualan dibatasi ke customer yang terkait marketing user login, sehingga tabel tetap fokus untuk follow up prospek dan customer aktif.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/25 px-4 py-4 text-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Total Isolir</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totalRows}</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">Customer isolir aktif sesuai ownership marketing user login.</p>
          </article>
          <article className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-amber-50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100">Belum Ada Ticket</p>
            <p className="mt-2 text-3xl font-semibold text-white">{withoutTicket}</p>
            <p className="mt-2 text-sm leading-6 text-amber-100">Kasus isolir yang belum masuk ke jalur dismantle.</p>
          </article>
          <article className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 text-sky-50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">Sudah Berticket</p>
            <p className="mt-2 text-3xl font-semibold text-white">{withTicket}</p>
            <p className="mt-2 text-sm leading-6 text-sky-100">Data isolir yang sudah punya ticket dismantle.</p>
          </article>
        </div>

        <form className="mt-4 grid gap-4 lg:grid-cols-4" action="/sales/isolations" method="get">
          <label className="flex flex-col gap-2 text-sm text-slate-100 lg:col-span-3">
            <span className="font-semibold text-white">Search</span>
            <input
              name="q"
              defaultValue={resolveSearchParam(resolvedSearchParams.q) ?? ''}
              placeholder="Nama pelanggan / service no / no hp / marketing"
              className="rounded-2xl border border-slate-700 bg-slate-900/30 px-4 py-3 text-white outline-none transition focus:border-slate-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-100">
            <span className="font-semibold text-white">Radboox</span>
            <select
              name="radboox"
              defaultValue={resolveSearchParam(resolvedSearchParams.radboox) ?? ''}
              className="rounded-2xl border border-slate-700 bg-slate-900/30 px-4 py-3 text-white outline-none transition focus:border-slate-400"
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
              className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950"
            >
              Terapkan Filter
            </button>
            <Link
              href="/sales/isolations"
              className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Reset
            </Link>
          </div>
        </form>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-[#152643] shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
          <div className="overflow-x-auto">
            <table className="min-w-[1260px] w-full border-collapse">
              <thead className="bg-[#162d66]">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-100">
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
              <tbody className="divide-y divide-slate-700 bg-[#1c2b45]">
                {filteredRows.map((row, index) => (
                  <tr key={row.id} className="align-top transition-colors hover:bg-[#24395c]">
                    <td className="px-4 py-3 text-sm text-slate-100">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-slate-100">
                      <p className="font-semibold text-white">{row.primary}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-300">{pickMeta(row, 'Customer Code: ') || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-100">{pickMeta(row, 'Service No: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-100">{pickMeta(row, 'Phone: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-100">{pickMeta(row, 'Marketing: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-100">{row.secondary || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-100">{pickMeta(row, 'Isolasi: ') || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-100">
                      <p className="max-w-[320px] leading-6">{row.detail || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-100">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                          pickMeta(row, 'Ticket Dismantle: ').toUpperCase() === 'SUDAH'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {pickMeta(row, 'Ticket Dismantle: ') || 'Belum'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-sm text-slate-300">
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
