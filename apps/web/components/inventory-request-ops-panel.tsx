import type { DomainReviewRow, DomainReviewSection } from '@/lib/types'

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('SELESAI') || normalized.includes('COMPLETE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized.includes('PENDING')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('PROGRESS')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  return 'border-slate-200 bg-white text-slate-600'
}

function buildCountMap(rows: DomainReviewRow[], prefix?: string) {
  const map = new Map<string, number>()

  for (const row of rows) {
    const rawValue = prefix ? pickMeta(row.meta, prefix) : row.status
    const key = rawValue.trim() || 'Belum diisi'
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({ label, count }))
}

export function InventoryRequestOpsPanel({
  sections,
}: {
  sections: DomainReviewSection[]
}) {
  const requestSection = findSection(sections, 'REQUEST INVENTORY')

  if (!requestSection) {
    return null
  }

  const bySubdivision = buildCountMap(requestSection.rows, 'Sub-divisi: ')
  const byStatus = buildCountMap(requestSection.rows)
  const pendingRows = requestSection.rows.filter((row) => row.status.trim().toUpperCase().includes('PENDING'))

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Request Inventory</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Antrean kebutuhan teknisi per sub-divisi
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini membantu tim inventory membaca antrean request berdasarkan status proses dan asal
            sub-divisi teknisi, sehingga pemenuhan barang harian tidak tercampur antara PSB, Jalur &
            Expan, dan Jointer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">
            {requestSection.rows.length} request
          </span>
          {pendingRows.length ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              {pendingRows.length} pending
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Distribusi Queue</p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Per sub-divisi</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {bySubdivision.length ? (
                  bySubdivision.map((item) => (
                    <span key={item.label} className="badge border-slate-200 bg-white text-slate-600">
                      {item.label}: {item.count}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Belum ada sub-divisi pada request terbaru.</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Per status</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {byStatus.length ? (
                  byStatus.map((item) => (
                    <span key={item.label} className={`badge ${getStatusTone(item.label)}`}>
                      {item.label}: {item.count}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Belum ada request yang bisa direkap.</span>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Request Terbaru</p>
          <div className="mt-4 space-y-3">
            {requestSection.rows.length ? (
              requestSection.rows.map((row) => {
                const subdivision = pickMeta(row.meta, 'Sub-divisi: ')
                const requestedFor = pickMeta(row.meta, 'Untuk: ')
                const requestedAt = pickMeta(row.meta, 'Requested: ')

                return (
                  <div key={row.id} className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                        <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                      </div>
                      <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Sub-divisi: {subdivision || '-'}
                      </span>
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Untuk: {requestedFor || '-'}
                      </span>
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Requested: {requestedAt || '-'}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-slate-500">Belum ada request inventory yang bisa direview.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
