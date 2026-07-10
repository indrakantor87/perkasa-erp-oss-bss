import Link from 'next/link'
import type { DashboardAlertItem, DashboardQueueItem, DashboardWorkItem } from '@/lib/types'

type DashboardNextActionItem = {
  id: string
  sourceLabel: string
  domain: string
  title: string
  detail: string
  actionLabel: string
  href: string
  tone: string
}

function getAlertTone(severity: DashboardAlertItem['severity']) {
  switch (severity) {
    case 'critical':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'high':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700'
  }
}

function getWorklistTone(priority: DashboardWorkItem['priority']) {
  switch (priority) {
    case 'tinggi':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'sedang':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
}

function getQueueTone(accent: string) {
  if (accent.includes('rose') || accent.includes('orange')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (accent.includes('amber')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (accent.includes('emerald')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (accent.includes('sky') || accent.includes('blue') || accent.includes('indigo') || accent.includes('cyan')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function buildNextActions(params: {
  alerts: DashboardAlertItem[]
  worklist: DashboardWorkItem[]
  roleQueues: DashboardQueueItem[]
}) {
  const items: DashboardNextActionItem[] = [
    ...params.alerts.slice(0, 3).map((item) => ({
      id: `alert-${item.id}`,
      sourceLabel: 'Alert',
      domain: item.domain,
      title: item.title,
      detail: item.nextStep,
      actionLabel: item.actionLabel,
      href: item.href,
      tone: getAlertTone(item.severity),
    })),
    ...params.worklist.slice(0, 2).map((item) => ({
      id: `worklist-${item.id}`,
      sourceLabel: 'List Kerja',
      domain: item.domain,
      title: item.title,
      detail: item.detail,
      actionLabel: item.priority === 'tinggi' ? 'Kerjakan Sekarang' : 'Buka Agenda',
      href: item.href,
      tone: getWorklistTone(item.priority),
    })),
    ...params.roleQueues.slice(0, 2).map((item) => ({
      id: `queue-${item.title}-${item.href}`,
      sourceLabel: 'Queue',
      domain: 'Role Aktif',
      title: item.title,
      detail: `${item.count} item aktif. ${item.description}`,
      actionLabel: 'Masuk Queue',
      href: item.href,
      tone: getQueueTone(item.accent),
    })),
  ]

  const seen = new Set<string>()

  return items.filter((item) => {
    const key = `${item.href}::${item.title}`
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export function DashboardNextActions({
  alerts,
  worklist,
  roleQueues,
}: {
  alerts: DashboardAlertItem[]
  worklist: DashboardWorkItem[]
  roleQueues: DashboardQueueItem[]
}) {
  const items = buildNextActions({ alerts, worklist, roleQueues }).slice(0, 6)

  if (!items.length) {
    return null
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Tindakan Berikutnya</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Aksi operasional yang paling cepat menjaga ritme kerja harian
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini merangkum alert, list kerja, dan queue role aktif menjadi langkah berikutnya
            yang bisa langsung dibuka tanpa menebak modul tujuan.
          </p>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">{items.length} aksi prioritas</span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {items.map((item, index) => (
          <article key={item.id} className="rounded-2xl border border-line bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge border ${item.tone}`}>Prioritas {index + 1}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">{item.sourceLabel}</span>
                  <span className="badge border-slate-200 bg-white text-slate-600">{item.domain}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </div>
              <Link
                href={item.href}
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
