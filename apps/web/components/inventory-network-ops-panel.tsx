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

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Operasional ODP</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Ringkasan ODP, port aktif, dan device lapangan
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini merangkum konteks jaringan yang paling dekat dengan parity legacy:
            koordinat ODP, kondisi port, dan assignment device/accessories yang dipakai di lapangan.
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">ODP Dan Maps</p>
          <div className="mt-4 space-y-3">
            {(odpSection?.rows ?? []).length ? (
              odpSection?.rows.map((row) => {
                const totalPorts = pickMeta(row.meta, 'Total Ports: ')
                const activePorts = pickMeta(row.meta, 'Active Ports: ')
                const mapHref = buildOdpMapHref(row)

                return (
                  <div key={row.id} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                        <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{row.detail}</p>
                      </div>
                      <span className="badge border-slate-200 bg-white text-slate-600">{row.status}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Total Port: {totalPorts || '-'}
                      </span>
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Active: {activePorts || '-'}
                      </span>
                      {mapHref ? (
                        <Link
                          href={mapHref}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700"
                        >
                          Buka Maps
                        </Link>
                      ) : (
                        <span className="badge border-slate-200 bg-white text-slate-500">
                          Maps belum siap
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-slate-500">Belum ada ODP yang bisa direview.</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Port Dan Accessories</p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Port aktif</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {(usedPortSection?.rows ?? []).length
                  ? `${usedPortSection?.rows.length} port sedang terpakai dan sudah tertaut ke layanan/customer.`
                  : 'Belum ada port terpakai yang tampil di review saat ini.'}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Port bermasalah</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {(issuePortSection?.rows ?? []).length
                  ? `${issuePortSection?.rows.length} port berada pada status reserved/faulty/disabled dan perlu perhatian jaringan.`
                  : 'Belum ada port reserved/faulty/disabled di review terbaru.'}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Accessories dan device</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {assignmentSection?.rows.length
                  ? `${assignmentSection.rows.length} assignment device tercatat, dengan ${accessoryAssignments.length} item yang sudah terindikasi sebagai accessories dari kategori inventory.`
                  : 'Belum ada assignment device yang tampil pada review inventory.'}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
