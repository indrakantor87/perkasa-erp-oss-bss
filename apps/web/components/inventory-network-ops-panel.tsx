import Link from 'next/link'
import { buildGoogleMapsHref } from '@/lib/map-links'
import type { DomainReviewRow, DomainReviewSection } from '@/lib/types'

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function isAccessoryCategory(value: string) {
  const normalized = value.trim().toUpperCase()
  return normalized.includes('AKSES') || normalized.includes('ACCESS')
}

function buildOdpMapHref(row: DomainReviewRow) {
  return buildGoogleMapsHref({
    latitude: pickMeta(row.meta, 'Latitude: '),
    longitude: pickMeta(row.meta, 'Longitude: '),
    query: row.detail,
  })
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('FAULT') || normalized.includes('DISABLED')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (normalized.includes('RESERVED')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('USED') || normalized.includes('ACTIVE') || normalized.includes('/')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  if (normalized.includes('DONE') || normalized.includes('AVAILABLE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  return 'border-slate-200 bg-white text-slate-600'
}

export function InventoryNetworkOpsPanel({
  sections,
}: {
  sections: DomainReviewSection[]
}) {
  const odpSection = findSection(sections, 'ODP TERBARU')
  const usedPortSection = findSection(sections, 'PORT TERPAKAI')
  const issuePortSection = findSection(sections, 'PORT BERMASALAH')
  const assignmentSection = findSection(sections, 'DEVICE ASSIGNMENT')

  if (!odpSection && !usedPortSection && !issuePortSection && !assignmentSection) {
    return null
  }

  const accessoryAssignments = (assignmentSection?.rows ?? []).filter((row) =>
    isAccessoryCategory(pickMeta(row.meta, 'Category: ')),
  )
  const odpRows = odpSection?.rows ?? []
  const usedPortRows = usedPortSection?.rows ?? []
  const issuePortRows = issuePortSection?.rows ?? []
  const assignmentRows = assignmentSection?.rows ?? []

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Operasional ODP</p>
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Ringkasan ODP, port aktif, dan device lapangan
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
            ODP, kapasitas port, issue, dan assignment device dalam satu console kerja yang ringkas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {odpSection ? (
            <span className="badge border-transparent bg-slate-950 text-white">
              {odpSection.rows.length} ODP
            </span>
          ) : null}
          {usedPortSection ? (
            <span className="badge border-slate-200 bg-white text-slate-600">
              {usedPortSection.rows.length} port used
            </span>
          ) : null}
          {issuePortSection ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              {issuePortSection.rows.length} port issue
            </span>
          ) : null}
          {assignmentSection ? (
            <span className="badge border-slate-200 bg-white text-slate-600">
              {assignmentSection.rows.length} device assign
            </span>
          ) : null}
          {accessoryAssignments.length ? (
            <span className="badge border-sky-200 bg-sky-50 text-sky-700">
              {accessoryAssignments.length} accessories
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        <article className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">ODP Aktif</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-sky-950">
            {odpRows.length}
          </p>
        </article>
        <article className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Port Terpakai</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-emerald-950">
            {usedPortRows.length}
          </p>
        </article>
        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Port Issue</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-amber-950">
            {issuePortRows.length}
          </p>
        </article>
        <article className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">Assignment</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-violet-950">
            {assignmentRows.length}
          </p>
        </article>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/inventory?focus=ACTIVE_ITEMS"
          className="inline-flex items-center justify-center rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-sky-700 transition hover:opacity-90"
        >
          Fokus ODP Aktif
        </Link>
        <Link
          href="/inventory?focus=PENDING_REQUESTS"
          className="inline-flex items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700 transition hover:opacity-90"
        >
          Cek Request Pending
        </Link>
        <Link
          href="/customers/cs-admin?queue=PORT+ODP"
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:opacity-90"
        >
          Buka Supervisor CS
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Console Port ODP</p>
              <h4 className="mt-1 text-base font-semibold text-slate-950">Tabel ODP dan kapasitas port</h4>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">Fokus utama dibuat table-first seperti console legacy.</p>
            </div>
            <span className="badge border-slate-200 bg-slate-50 text-slate-700">{odpRows.length} ODP terbaca</span>
          </div>
        </div>
        {odpRows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-4 py-3">ODP</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3">Port</th>
                  <th className="px-4 py-3">Koordinat</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {odpRows.map((row) => {
                  const totalPorts = pickMeta(row.meta, 'Total Ports: ')
                  const activePorts = pickMeta(row.meta, 'Active Ports: ')
                  const latitude = pickMeta(row.meta, 'Latitude: ')
                  const longitude = pickMeta(row.meta, 'Longitude: ')
                  const mapHref = buildOdpMapHref(row)

                  return (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                        <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-sm text-sm leading-6 text-slate-700">{row.detail}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="badge border-slate-200 bg-white text-slate-600">Total: {totalPorts || '-'}</span>
                          <span className="badge border-sky-200 bg-sky-50 text-sky-700">Active: {activePorts || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2 text-sm text-slate-600">
                          <p>Lat: {latitude || '-'}</p>
                          <p>Lng: {longitude || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-end gap-2">
                          {mapHref ? (
                            <Link
                              href={mapHref}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800"
                            >
                              Buka Maps
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-400">Maps belum siap</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-6 text-sm text-slate-500">Belum ada ODP yang bisa direview.</div>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-line bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Port Terpakai & Port Issue</p>
          <div className="mt-3 space-y-3">
            {usedPortRows.slice(0, 4).map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.meta.map((item) => (
                    <span key={`${row.id}-${item}`} className="badge border-slate-200 bg-white text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {issuePortRows.slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-amber-800">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-amber-900">{row.detail}</p>
              </div>
            ))}
            {!usedPortRows.length && !issuePortRows.length ? (
              <p className="text-sm text-slate-500">Belum ada port terpakai atau port issue yang tampil di review terbaru.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-line bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Device Assignment</p>
          <div className="mt-3 space-y-3">
            {assignmentRows.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.meta.map((item) => (
                    <span
                      key={`${row.id}-${item}`}
                      className={`badge ${
                        item.startsWith('Category: ') && isAccessoryCategory(item.replace('Category: ', ''))
                          ? 'border-violet-200 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {!assignmentRows.length ? (
              <p className="text-sm text-slate-500">Belum ada assignment device yang tampil pada review inventory.</p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  )
}
