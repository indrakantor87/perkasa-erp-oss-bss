import type { DomainReviewSection, DomainReviewRow } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRowTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('CLOSE') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  if (normalized.includes('OPEN') || normalized.includes('PENDING')) {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

function buildDismantleSummary(rows: DomainReviewRow[]) {
  const marketingNames = Array.from(
    new Set(
      rows
        .map((row) => pickMeta(row.meta, 'Marketing: '))
        .filter((item) => item && item !== '-'),
    ),
  ).slice(0, 4)

  const lastClosed = rows
    .map((row) => pickMeta(row.meta, 'Closed: '))
    .filter((value) => value && value !== '-')
    .slice(0, 1)[0]

  return {
    total: rows.length,
    marketingNames,
    lastClosed,
  }
}

export function SupportDismantleQueuePanel({
  sections,
}: {
  sections: DomainReviewSection[]
}) {
  const dismantleSection =
    sections.find((section) => section.title.toUpperCase().includes('DISMANTLE')) ?? null

  if (!dismantleSection) {
    return null
  }

  const summary = buildDismantleSummary(dismantleSection.rows)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Dismantle</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Histori terminasi dan catatan penutupan layanan
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini membantu tim dismantle memverifikasi identitas pelanggan, mapping radbox, dan
            catatan penutupan sebelum memastikan proses terminasi tersimpan rapi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{summary.total} item</span>
          {summary.lastClosed ? (
            <span className="badge border-slate-200 bg-white text-slate-600">Closed: {summary.lastClosed}</span>
          ) : null}
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

      {dismantleSection.rows.length ? (
        <div className="mt-6 space-y-3">
          {dismantleSection.rows.map((row) => {
            const phone = pickMeta(row.meta, 'Phone: ')
            const marketing = pickMeta(row.meta, 'Marketing: ')
            const closedAt = pickMeta(row.meta, 'Closed: ')

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
                  <span className="badge border-slate-200 bg-white text-slate-600">Closed: {closedAt}</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada histori dismantle untuk direview.</p>
      )}
    </section>
  )
}

