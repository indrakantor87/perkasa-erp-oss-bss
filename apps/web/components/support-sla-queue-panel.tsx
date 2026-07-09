import type { DomainReviewSection, DomainReviewRow } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? '-'
}

function getRowTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('ACTIVE')) {
    return 'border-sky-200 bg-sky-50 text-sky-800'
  }
  return 'border-slate-200 bg-white text-slate-700'
}

function buildSlaSummary(rows: DomainReviewRow[]) {
  const lastUpdated = rows
    .map((row) => pickMeta(row.meta, 'Updated: '))
    .filter((value) => value && value !== '-')
    .slice(0, 1)[0]

  const durationValues = rows
    .map((row) => pickMeta(row.meta, 'Durasi: '))
    .filter((value) => value && value !== '-')
    .slice(0, 3)

  return {
    total: rows.length,
    lastUpdated,
    durationValues,
  }
}

export function SupportSlaQueuePanel({
  sections,
}: {
  sections: DomainReviewSection[]
}) {
  const slaSection = sections.find((section) => section.title.toUpperCase().includes('SLA')) ?? null

  if (!slaSection) {
    return null
  }

  const summary = buildSlaSummary(slaSection.rows)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Kontrol SLA</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Aturan durasi penanganan trouble ticket
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Ringkasan SLA dipakai untuk menjaga prioritas kerja TT/NOC/lapangan tetap terukur dan
            menghindari ticket overdue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{summary.total} rule</span>
          {summary.lastUpdated ? (
            <span className="badge border-slate-200 bg-white text-slate-600">Updated: {summary.lastUpdated}</span>
          ) : null}
        </div>
      </div>

      {summary.durationValues.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">Contoh durasi:</span>
          {summary.durationValues.map((value) => (
            <span key={value} className="badge border-slate-200 bg-white text-slate-600">
              {value}
            </span>
          ))}
        </div>
      ) : null}

      {slaSection.rows.length ? (
        <div className="mt-6 space-y-3">
          {slaSection.rows.map((row) => {
            const duration = pickMeta(row.meta, 'Durasi: ')
            const updatedAt = pickMeta(row.meta, 'Updated: ')

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
                  <span className="badge border-slate-200 bg-white text-slate-600">{duration}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">Updated: {updatedAt}</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada aturan SLA yang tersedia untuk direview.</p>
      )}
    </section>
  )
}

