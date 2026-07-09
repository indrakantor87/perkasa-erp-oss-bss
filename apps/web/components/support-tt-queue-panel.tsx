import type { DomainReviewSection, DomainReviewRow } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRowTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('OPEN') || normalized === 'NEW') {
    return 'border-orange-200 bg-orange-50 text-orange-800'
  }
  if (normalized.includes('PROGRESS') || normalized.includes('FOLLOW')) {
    return 'border-sky-200 bg-sky-50 text-sky-800'
  }
  if (normalized.includes('CLOSE') || normalized.includes('DONE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

function buildTicketSummary(rows: DomainReviewRow[]) {
  const byStatus = new Map<string, number>()
  for (const row of rows) {
    const status = row.status?.trim() || 'UNKNOWN'
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
  }

  const statusItems = Array.from(byStatus.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([status, count]) => ({ status, count }))

  return {
    total: rows.length,
    statusItems,
  }
}

export function SupportTroubleTicketQueuePanel({
  sections,
}: {
  sections: DomainReviewSection[]
}) {
  const ttSection =
    sections.find((section) => section.title.toUpperCase().includes('TROUBLE')) ?? null

  if (!ttSection) {
    return null
  }

  const summary = buildTicketSummary(ttSection.rows)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Trouble Ticket</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Ticket terbuka yang perlu diproses cepat
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Ringkasan ini membantu operator melihat ticket mana yang masih open, jenis gangguan, dan
            konteks pembukaan sebelum mengeksekusi aksi close/update.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{summary.total} ticket</span>
          {summary.statusItems.map((item) => (
            <span key={item.status} className="badge border-slate-200 bg-white text-slate-600">
              {item.status}: {item.count}
            </span>
          ))}
        </div>
      </div>

      {ttSection.rows.length ? (
        <div className="mt-6 space-y-3">
          {ttSection.rows.map((row) => {
            const type = pickMeta(row.meta, 'Type: ')
            const opened = pickMeta(row.meta, 'Opened: ')
            const customerUser = pickMeta(row.meta, 'Customer User: ')

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
                  <span className="badge border-slate-200 bg-white text-slate-600">Type: {type}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">Opened: {opened}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">User: {customerUser}</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada trouble ticket terbuka untuk direview.</p>
      )}
    </section>
  )
}

