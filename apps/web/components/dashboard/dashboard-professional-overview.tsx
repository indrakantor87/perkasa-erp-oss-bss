import type {
  DashboardMetric,
  DashboardOperationalCard,
  DashboardQueueItem,
  DashboardWorkItem,
} from '@/lib/types'

type DashboardOverviewProfile = 'executive' | 'control' | 'commercial' | 'service' | 'backoffice'

function extractNumericValue(raw: string) {
  const normalized = raw.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('id-ID', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function getPriorityTone(priority: DashboardWorkItem['priority']) {
  switch (priority) {
    case 'tinggi':
      return {
        fill: '#ef4444',
        soft: 'status-chip-danger',
        label: 'Prioritas Tinggi',
      }
    case 'sedang':
      return {
        fill: '#f59e0b',
        soft: 'status-chip-warning',
        label: 'Prioritas Sedang',
      }
    default:
      return {
        fill: '#10b981',
        soft: 'status-chip-success',
        label: 'Prioritas Rendah',
      }
  }
}

function buildPriorityDonutSegments(items: Array<{ value: number; color: string }>) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total <= 0) {
    return 'conic-gradient(var(--color-surface-strong) 0deg 360deg)'
  }

  let current = 0
  const stops = items.map((item) => {
    const start = current
    current += (item.value / total) * 360
    return `${item.color} ${start}deg ${current}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
}

function getOverviewConfig(profile: DashboardOverviewProfile) {
  if (profile === 'executive') {
    return {
      heroKicker: 'Ringkasan Eksekutif',
      heroTitle: 'Pantau tekanan operasi, agenda prioritas, dan performa divisi tanpa turun ke detail terlalu cepat',
      heroDescription:
        'Tampilan ini memusatkan sinyal manajerial yang paling cepat dibaca agar owner dan pimpinan bisa melihat ritme bisnis, titik tekanan, dan kesehatan domain dalam satu layar.',
      queueTitle: 'Tekanan Operasi',
      queueDescription: 'Lane kerja yang paling mempengaruhi ritme layanan dan layak dipantau lebih dulu',
      priorityTitle: 'Arah Prioritas',
      priorityDescription: 'Komposisi agenda yang perlu dijaga agar tekanan bisnis tidak menumpuk',
      kpiTitle: 'Spotlight Eksekutif',
      kpiDescription: 'Angka inti yang paling cepat menjelaskan kondisi bisnis dan operasi saat ini',
      domainTitle: 'Performa Divisi',
      domainDescription: 'Snapshot divisi yang paling relevan untuk pembacaan tingkat pimpinan',
      pulseTitle: 'Executive Pulse',
      pulseDescription: 'Ringkasan cepat untuk membaca titik tekanan paling dominan',
      queueLimit: 4,
      metricLimit: 3,
      domainLimit: 4,
    }
  }

  if (profile === 'commercial') {
    return {
      heroKicker: 'Dashboard Komersial',
      heroTitle: 'Pantau antrean komersial, prioritas follow-up, dan domain yang memengaruhi akuisisi pelanggan',
      heroDescription:
        'Panel ini membantu tim penjualan dan akuisisi membaca backlog yang paling mendesak, komposisi prioritas, dan sinyal domain yang memengaruhi percepatan closing.',
      queueTitle: 'Antrean Komersial',
      queueDescription: 'Lane yang paling menekan follow-up, penawaran, dan pergerakan order',
      priorityTitle: 'Prioritas Follow-up',
      priorityDescription: 'Campuran kerja yang harus dijaga agar pipeline tetap bergerak sehat',
      kpiTitle: 'Spotlight Pipeline',
      kpiDescription: 'Angka cepat untuk melihat arah demand, progress akuisisi, dan tekanan backlog',
      domainTitle: 'Domain Pendukung Penjualan',
      domainDescription: 'Snapshot domain yang paling memengaruhi gerak komersial hari ini',
      pulseTitle: 'Commercial Pulse',
      pulseDescription: 'Ringkasan cepat untuk membantu menentukan fokus follow-up paling bernilai',
      queueLimit: 5,
      metricLimit: 4,
      domainLimit: 3,
    }
  }

  if (profile === 'service') {
    return {
      heroKicker: 'Dashboard Operasional',
      heroTitle: 'Baca antrean lapangan, blocker layanan, dan tekanan domain yang memengaruhi respons harian',
      heroDescription:
        'Tampilan ini dirancang untuk role layanan agar fokus pada antrean yang harus ditangani lebih dulu, prioritas kerja aktif, dan domain yang sedang memberi tekanan operasional.',
      queueTitle: 'Antrean Layanan',
      queueDescription: 'Queue yang paling menahan respons tim dan perlu dijaga agar SLA tetap sehat',
      priorityTitle: 'Prioritas Tindakan',
      priorityDescription: 'Komposisi pekerjaan aktif yang memerlukan aksi cepat hari ini',
      kpiTitle: 'Spotlight Layanan',
      kpiDescription: 'Angka yang paling cepat menjelaskan backlog, respons, dan kestabilan pekerjaan lapangan',
      domainTitle: 'Domain Operasional',
      domainDescription: 'Snapshot domain yang paling berpengaruh ke ritme support dan delivery',
      pulseTitle: 'Service Pulse',
      pulseDescription: 'Ringkasan singkat untuk membaca tekanan layanan paling dominan saat ini',
      queueLimit: 6,
      metricLimit: 4,
      domainLimit: 3,
    }
  }

  if (profile === 'backoffice') {
    return {
      heroKicker: 'Dashboard Backoffice',
      heroTitle: 'Pantau kesiapan proses, agenda prioritas, dan domain administrasi yang perlu dikawal harian',
      heroDescription:
        'Panel ini menonjolkan backlog inti, prioritas kontrol, dan kesehatan domain backoffice agar proses internal tetap stabil dan tidak tertinggal.',
      queueTitle: 'Antrian Proses',
      queueDescription: 'Titik proses yang paling menekan ritme administrasi dan kontrol internal',
      priorityTitle: 'Prioritas Kontrol',
      priorityDescription: 'Campuran agenda yang perlu dijaga agar proses finance, HR, dan GA tetap rapi',
      kpiTitle: 'Spotlight Kontrol',
      kpiDescription: 'Angka cepat yang menjelaskan kesiapan proses dan tekanan administratif',
      domainTitle: 'Domain Backoffice',
      domainDescription: 'Snapshot domain yang paling relevan untuk pembacaan finance, HR, dan GA',
      pulseTitle: 'Backoffice Pulse',
      pulseDescription: 'Ringkasan cepat untuk membaca tekanan proses internal paling dominan',
      queueLimit: 4,
      metricLimit: 4,
      domainLimit: 3,
    }
  }

  return {
    heroKicker: 'Dashboard Prioritas',
    heroTitle: 'Baca ritme kerja, beban queue, dan kesehatan operasi dalam satu layar',
    heroDescription:
      'Bagian ini memadukan kartu prioritas, grafik distribusi, dan snapshot domain agar semua role bisa cepat menentukan fokus kerja tanpa membuka terlalu banyak halaman lebih dulu.',
    queueTitle: 'Distribusi Queue',
    queueDescription: 'Titik antrean yang paling menekan ritme kerja',
    priorityTitle: 'Komposisi Prioritas',
    priorityDescription: 'Campuran kerja yang harus dijaga hari ini',
    kpiTitle: 'KPI Spotlight',
    kpiDescription: 'Angka yang paling cepat menjelaskan kondisi saat ini',
    domainTitle: 'Kesehatan Domain',
    domainDescription: 'Snapshot divisi dengan metrik yang paling cepat dibaca',
    pulseTitle: 'Operational Pulse',
    pulseDescription: 'Ringkasan cepat untuk mengisi celah pembacaan manajerial',
    queueLimit: 6,
    metricLimit: 4,
    domainLimit: 4,
  }
}

export function DashboardProfessionalOverview({
  metrics,
  roleQueues,
  worklist,
  approvalCount,
  operationalCards,
  roleProfile,
}: {
  metrics: DashboardMetric[]
  roleQueues: DashboardQueueItem[]
  worklist: DashboardWorkItem[]
  approvalCount: number
  operationalCards: DashboardOperationalCard[]
  roleProfile: DashboardOverviewProfile
}) {
  const overview = getOverviewConfig(roleProfile)
  const totalQueueLoad = roleQueues.reduce((sum, item) => sum + extractNumericValue(item.count), 0)
  const queueChartItems = roleQueues
    .map((item) => ({
      ...item,
      numericCount: extractNumericValue(item.count),
    }))
    .slice(0, overview.queueLimit)
  const maxQueueCount = Math.max(...queueChartItems.map((item) => item.numericCount), 1)

  const priorityItems = (['tinggi', 'sedang', 'rendah'] as const).map((priority) => {
    const count = worklist.filter((item) => item.priority === priority).length
    return {
      priority,
      count,
      ...getPriorityTone(priority),
    }
  })
  const donutBackground = buildPriorityDonutSegments(priorityItems.map((item) => ({ value: item.count, color: item.fill })))
  const totalPriorityItems = priorityItems.reduce((sum, item) => sum + item.count, 0)
  const highestPriorityCount = priorityItems.find((item) => item.priority === 'tinggi')?.count ?? 0

  const spotlightMetrics = metrics.slice(0, overview.metricLimit).map((item) => ({
    ...item,
    numericValue: extractNumericValue(item.value),
  }))
  const maxMetricValue = Math.max(...spotlightMetrics.map((item) => item.numericValue), 1)

  const domainCards = operationalCards.slice(0, overview.domainLimit).map((card) => {
    const parsedMetrics = card.metrics.slice(0, 3).map((metric) => ({
      ...metric,
      numericValue: extractNumericValue(metric.value),
    }))
    const maxValue = Math.max(...parsedMetrics.map((metric) => metric.numericValue), 1)
    return {
      ...card,
      parsedMetrics,
      maxValue,
    }
  })
  const dominantQueue =
    queueChartItems.length > 0
      ? queueChartItems.reduce((largest, item) => (item.numericCount > largest.numericCount ? item : largest), queueChartItems[0])
      : null
  const domainPressure =
    domainCards.length > 0
      ? domainCards.reduce(
          (largest, card) =>
            card.parsedMetrics.reduce((sum, metric) => sum + metric.numericValue, 0) >
            largest.parsedMetrics.reduce((sum, metric) => sum + metric.numericValue, 0)
              ? card
              : largest,
          domainCards[0],
        )
      : null

  return (
    <section className="space-y-4">
      <div className="space-y-4">
        <div className="panel overflow-hidden p-0">
          <div className="border-b border-line px-5 py-5 text-[var(--color-sidebar-ink)]" style={{ backgroundColor: 'var(--color-sidebar)' }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 72%, var(--color-mute) 28%)' }}>
                  {overview.heroKicker}
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight">
                  {overview.heroTitle}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 82%, transparent)' }}>
                  {overview.heroDescription}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <article
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: 'var(--color-line-strong)',
                    backgroundColor: 'var(--color-surface-strong)',
                    color: 'var(--color-ink-strong)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Beban Queue</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCompactNumber(totalQueueLoad)}</p>
                </article>
                <article
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: 'var(--color-line-strong)',
                    backgroundColor: 'var(--color-surface-strong)',
                    color: 'var(--color-ink-strong)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Worklist</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCompactNumber(worklist.length)}</p>
                </article>
                <article
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: 'var(--color-line-strong)',
                    backgroundColor: 'var(--color-surface-strong)',
                    color: 'var(--color-ink-strong)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Approval</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCompactNumber(approvalCount)}</p>
                </article>
                <article
                  className="rounded-2xl border px-4 py-3"
                  style={{
                    borderColor: 'var(--color-line-strong)',
                    backgroundColor: 'var(--color-surface-strong)',
                    color: 'var(--color-ink-strong)',
                  }}
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mute">Domain</p>
                  <p className="mt-2 text-2xl font-semibold">{formatCompactNumber(operationalCards.length)}</p>
                </article>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div
              className="surface-soft rounded-3xl border p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-title">{overview.queueTitle}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink-strong)]">{overview.queueDescription}</h3>
                </div>
                <span className="solid-chip">{queueChartItems.length} lane</span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {queueChartItems.length ? (
                  queueChartItems.map((item) => {
                    const percent = Math.max(8, Math.round((item.numericCount / maxQueueCount) * 100))
                    return (
                      <article key={`${item.href}-${item.title}`} className="rounded-2xl border border-line bg-surface p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.title}</p>
                            <p className="mt-1 text-xs leading-5 text-mute">{item.description}</p>
                          </div>
                          <span className={`badge border ${item.accent}`}>{item.count}</span>
                        </div>
                        <div
                          className="surface-soft mt-4 h-28 rounded-2xl border p-3"
                        >
                          <div className="flex h-full items-end gap-3">
                            <div
                              className="flex h-full flex-1 items-end rounded-xl p-1"
                              style={{ backgroundColor: 'var(--color-surface-strong)' }}
                            >
                              <div
                                className="w-full rounded-lg"
                                style={{
                                  backgroundColor: 'var(--color-accent)',
                                  height: `${percent}%`,
                                }}
                              />
                            </div>
                            <div className="w-16">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Intensitas</p>
                              <p className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--color-ink-strong)]">
                                {percent}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })
                ) : (
                    <article className="surface-soft sm:col-span-2 xl:col-span-3 rounded-3xl border border-dashed p-5">
                    <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Belum ada lane queue aktif</p>
                    <p className="mt-2 text-sm leading-6 text-mute">
                      Dashboard tetap stabil. Gunakan worklist, spotlight utama, dan shortcut modul sebagai pembacaan utama sampai antrean baru muncul.
                    </p>
                  </article>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-title">{overview.priorityTitle}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink-strong)]">{overview.priorityDescription}</h3>
                </div>
                <span className="badge border-line bg-[var(--color-card-subtle)] text-mute">{totalPriorityItems} item</span>
              </div>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                <div
                  className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
                  style={{ background: donutBackground }}
                >
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface text-center shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-mute">Fokus</p>
                    <p className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--color-ink-strong)]">
                      {totalPriorityItems}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {priorityItems.map((item) => (
                    <div
                      key={item.priority}
                      className="rounded-2xl border border-line p-3"
                      style={{ backgroundColor: 'var(--color-card-subtle)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.soft}`}>
                          {item.label}
                        </span>
                        <span className="text-sm font-semibold text-ink">{item.count} item</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-surface">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${totalPriorityItems ? Math.max(8, Math.round((item.count / totalPriorityItems) * 100)) : 8}%`,
                            backgroundColor: item.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: 'var(--color-sidebar-line)',
                      backgroundColor: 'var(--color-sidebar)',
                      color: 'var(--color-sidebar-ink)',
                    }}
                  >
                    <p
                      className="text-[11px] uppercase tracking-[0.18em]"
                      style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 72%, var(--color-mute) 28%)' }}
                    >
                      Sinyal Operasional
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold">
                      {approvalCount > 0 ? formatCompactNumber(approvalCount) : 'Stabil'}
                    </p>
                    <p
                      className="mt-2 text-sm leading-5"
                      style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 82%, transparent)' }}
                    >
                      {approvalCount > 0
                        ? 'Dipakai sebagai sinyal blocker lintas tim yang bisa menahan ritme kerja role aktif.'
                        : 'Belum ada blocker approval yang menahan ritme kerja. Fokus bisa diarahkan ke queue dan worklist.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-3xl border border-line p-5"
              style={{ backgroundColor: 'var(--color-card-subtle)' }}
            >
              <p className="section-title">{overview.kpiTitle}</p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink-strong)]">{overview.kpiDescription}</h3>
              <div className="mt-4 space-y-3">
                {spotlightMetrics.map((item) => (
                  <article key={item.label} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-mute">{item.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--color-ink-strong)]">
                          {item.value}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-blue-700">{item.change}</p>
                      </div>
                    </div>
                    <div
                      className="mt-3 h-2 rounded-full"
                      style={{ backgroundColor: 'var(--color-card-subtle)' }}
                    >
                      <div
                        className="h-2 rounded-full"
                        style={{
                          background:
                            'linear-gradient(90deg, var(--color-panel) 0%, var(--color-accent) 100%)',
                          width: `${Math.max(10, Math.round((item.numericValue / maxMetricValue) * 100))}%`,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-title">{overview.domainTitle}</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink-strong)]">{overview.domainDescription}</h3>
              </div>
              <span className="badge border-line bg-surface text-mute">{domainCards.length} domain</span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {domainCards.map((card) => (
                <article
                  key={card.key}
                  className="rounded-3xl border border-line p-5"
                  style={{ backgroundColor: 'var(--color-card-subtle)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`badge border ${card.tone}`}>{card.badge}</span>
                        <span className="badge border-line bg-surface text-mute">{card.title}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-mute">{card.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {card.parsedMetrics.map((metric) => (
                      <div key={`${card.key}-${metric.label}`} className="rounded-2xl border border-line bg-surface p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{metric.label}</p>
                            {metric.hint ? <p className="mt-1 text-xs text-mute">{metric.hint}</p> : null}
                          </div>
                          <span className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--color-ink-strong)]">
                            {metric.value}
                          </span>
                        </div>
                        <div
                          className="mt-3 h-2 rounded-full"
                          style={{ backgroundColor: 'var(--color-card-subtle)' }}
                        >
                          <div
                            className="h-2 rounded-full"
                            style={{
                              background:
                                'linear-gradient(90deg, var(--color-panel) 0%, var(--color-accent) 100%)',
                              width: `${Math.max(12, Math.round((metric.numericValue / card.maxValue) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-title">{overview.pulseTitle}</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink-strong)]">{overview.pulseDescription}</h3>
              </div>
              <span className="badge border-line bg-surface text-mute">Live summary</span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <article
                className="rounded-3xl border border-line p-5"
                style={{
                  background:
                    'linear-gradient(180deg, var(--color-surface) 0%, var(--color-card-subtle) 100%)',
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mute">Queue Dominan</p>
                <p className="mt-3 text-lg font-semibold text-[var(--color-ink-strong)]">
                  {dominantQueue ? dominantQueue.title : 'Belum ada queue dominan'}
                </p>
                <p className="mt-2 text-sm leading-6 text-mute">
                  {dominantQueue
                    ? `${dominantQueue.count} item menjadi tekanan terbesar untuk ritme kerja saat ini.`
                    : 'Dashboard sedang berada pada kondisi antrean ringan.'}
                </p>
              </article>

              <article
                className="rounded-3xl border border-line p-5"
                style={{
                  background:
                    'linear-gradient(180deg, var(--color-surface) 0%, var(--color-card-subtle) 100%)',
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mute">Tekanan Prioritas</p>
                <p className="mt-3 text-lg font-semibold text-[var(--color-ink-strong)]">
                  {highestPriorityCount > 0 ? `${highestPriorityCount} item prioritas tinggi` : 'Prioritas tinggi terkendali'}
                </p>
                <p className="mt-2 text-sm leading-6 text-mute">
                  {highestPriorityCount > 0
                    ? 'Perlu dijaga agar item kritis tidak menumpuk dan merambat ke modul lain.'
                    : 'Mayoritas kerja bergerak di level sedang atau rendah.'}
                </p>
              </article>

              <article
                className="rounded-3xl border border-line p-5"
                style={{
                  backgroundColor: 'var(--color-sidebar)',
                  borderColor: 'var(--color-sidebar-line)',
                  color: 'var(--color-sidebar-ink)',
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 72%, var(--color-mute) 28%)' }}
                >
                  Domain Paling Aktif
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {domainPressure ? domainPressure.title : 'Belum ada domain dominan'}
                </p>
                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 82%, transparent)' }}
                >
                  {domainPressure
                    ? 'Domain ini memegang tekanan metrik paling besar dan layak dibaca lebih dulu pada snapshot divisi.'
                    : 'Belum ada tekanan domain yang menonjol dari data saat ini.'}
                </p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
