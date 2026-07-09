import type { DomainReviewSection, DomainReviewRow } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRowTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('OPEN') || normalized === 'ACTIVE') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }
  if (normalized.includes('PENDING') || normalized.includes('FOLLOW')) {
    return 'border-sky-200 bg-sky-50 text-sky-800'
  }
  if (normalized.includes('CLOSE') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

function buildIsolationSummary(rows: DomainReviewRow[]) {
  const byStatus = new Map<string, number>()
  for (const row of rows) {
    const status = row.status?.trim() || 'UNKNOWN'
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
  }

  const statusItems = Array.from(byStatus.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([status, count]) => ({ status, count }))

  const marketingNames = Array.from(
    new Set(
      rows
        .map((row) => pickMeta(row.meta, 'Marketing: '))
        .filter((item) => item && item !== '-'),
    ),
  ).slice(0, 4)

  return {
    total: rows.length,
    statusItems,
    marketingNames,
  }
}

export function SupportIsolationQueuePanel({
  sections,
}: {
  sections: DomainReviewSection[]
}) {
  const isolationSection =
    sections.find((section) => section.title.toUpperCase().includes('ISOLIR')) ?? null

  if (!isolationSection) {
    return null
  }

  const summary = buildIsolationSummary(isolationSection.rows)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Isolir</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Suspend aktif yang perlu follow up dan recovery
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Fokuskan identitas pelanggan, mapping radbox, marketing owner, dan tanggal isolir sebelum
            melakukan restore atau meneruskan kasus ke dismantle.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{summary.total} isolir</span>
          {summary.statusItems.map((item) => (
            <span key={item.status} className="badge border-slate-200 bg-white text-slate-600">
              {item.status}: {item.count}
            </span>
          ))}
        </div>
      </div>

      {summary.marketingNames.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">Marketing:</span>
          {summary.marketingNames.map((name) => (
            <span key={name} className="badge border-slate-200 bg-white text-slate-600">
              {name}
            </span>
          ))}
        </div>
      ) : null}

      {isolationSection.rows.length ? (
        <div className="mt-6 space-y-3">
          {isolationSection.rows.map((row) => {
            const phone = pickMeta(row.meta, 'Phone: ')
            const marketing = pickMeta(row.meta, 'Marketing: ')
            const isolasiAt = pickMeta(row.meta, 'Isolasi: ')

            return (
              <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-mute">{row.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="badge border-slate-200 bg-white text-slate-600">Phone: {phone}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">Marketing: {marketing}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">Isolasi: {isolasiAt}</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada data isolir aktif untuk direview.</p>
      )}
    </section>
  )
}

