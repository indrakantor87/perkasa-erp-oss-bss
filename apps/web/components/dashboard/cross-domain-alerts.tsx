import Link from 'next/link'
import type { DashboardAlertItem } from '@/lib/types'

function getSeverityTone(severity: DashboardAlertItem['severity']) {
  switch (severity) {
    case 'critical':
      return 'border-rose-200 bg-rose-50 text-rose-900'
    case 'high':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    default:
      return 'border-sky-200 bg-sky-50 text-sky-900'
  }
}

function getSeverityLabel(severity: DashboardAlertItem['severity']) {
  switch (severity) {
    case 'critical':
      return 'Kritis'
    case 'high':
      return 'Tinggi'
    default:
      return 'Menengah'
  }
}

export function CrossDomainAlerts({ items }: { items: DashboardAlertItem[] }) {
  if (!items.length) {
    return null
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Alert Silang Domain</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Hambatan operasional yang paling cepat memengaruhi modul lain
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini memprioritaskan backlog atau kondisi yang tidak boleh dibiarkan karena efeknya
            bisa merambat ke billing, support, import, approval, dan ritme kerja divisi lain.
          </p>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">{items.length} alert aktif</span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-line bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge border ${getSeverityTone(item.severity)}`}>
                    {getSeverityLabel(item.severity)}
                  </span>
                  <span className="badge border-slate-200 bg-white text-slate-600">{item.domain}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.affectedModules.map((module) => (
                    <span key={`${item.id}-${module}`} className="badge border-slate-200 bg-white text-slate-600">
                      {module}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Dampak silang domain
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.impactSummary}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Langkah berikutnya
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{item.nextStep}</p>
                  </div>
                </div>
              </div>
              <Link
                href={item.href}
                prefetch={false}
                className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {item.actionLabel}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
