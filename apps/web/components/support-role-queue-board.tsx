import type { AppRole, DomainReviewSection } from '@/lib/types'
import { getRoleMeta } from '@/lib/role-meta'

type SupportLane = {
  key: string
  title: string
  description: string
  count: number
  accent: string
  topItems: string[]
}

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword))
}

function buildSupportLanes(role: AppRole, sections: DomainReviewSection[]): SupportLane[] {
  const ttSection = findSection(sections, 'TROUBLE')
  const isolationSection = findSection(sections, 'ISOLIR')
  const slaSection = findSection(sections, 'SLA')
  const dismantleSection = findSection(sections, 'DISMANTLE')

  const lanes: SupportLane[] = [
    {
      key: 'tt',
      title: 'Queue Trouble Ticket',
      description:
        role === 'TT_OPERATOR' || role === 'NOC_OPERATOR'
          ? 'Queue utama untuk ticket teknis yang perlu analisis, tindak lanjut, atau close loop.'
          : 'Ticket terbuka yang perlu dipantau dari perspektif operasional support.',
      count: ttSection?.rows.length ?? 0,
      accent: 'bg-orange-50 text-orange-700',
      topItems: (ttSection?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
    {
      key: 'isolations',
      title: 'Queue Isolir Aktif',
      description:
        role === 'CS_OPERATOR' || role === 'CS_ADMIN'
          ? 'Pelanggan suspend yang perlu tindak lanjut administrasi, ticket, atau transfer proses.'
          : 'Data isolir aktif untuk monitoring dan tindak lanjut lintas tim support.',
      count: isolationSection?.rows.length ?? 0,
      accent: 'bg-amber-50 text-amber-700',
      topItems: (isolationSection?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
    {
      key: 'dismantle',
      title: role === 'DISMANTLE_OPERATOR' ? 'Queue Histori Dismantle' : 'Dismantle Dan Terminasi',
      description:
        role === 'DISMANTLE_OPERATOR'
          ? 'Jejak pelanggan yang sudah diproses atau siap ditindaklanjuti pada flow dismantle.'
          : 'Histori dan tindak lanjut terminasi agar jejak support tidak hilang.',
      count: dismantleSection?.rows.length ?? 0,
      accent: 'bg-rose-50 text-rose-700',
      topItems: (dismantleSection?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
    {
      key: 'sla',
      title: role === 'FIELD_TECHNICIAN' ? 'Target SLA Lapangan' : 'Kontrol SLA',
      description:
        role === 'FIELD_TECHNICIAN'
          ? 'Ringkasan SLA untuk membantu prioritas pekerjaan yang berpotensi overdue di lapangan.'
          : 'Target durasi penanganan per tipe ticket agar prioritas support tetap terukur.',
      count: slaSection?.rows.length ?? 0,
      accent: 'bg-sky-50 text-sky-700',
      topItems: (slaSection?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
  ]

  const preferredOrder: Record<AppRole, string[]> = {
    SUPER_ADMIN: ['tt', 'isolations', 'dismantle', 'sla'],
    SALES_MARKETING: ['isolations', 'tt', 'dismantle', 'sla'],
    CS_OPERATOR: ['isolations', 'tt', 'dismantle', 'sla'],
    CS_ADMIN: ['isolations', 'tt', 'dismantle', 'sla'],
    NOC_OPERATOR: ['tt', 'sla', 'isolations', 'dismantle'],
    FIELD_TECHNICIAN: ['tt', 'sla', 'isolations', 'dismantle'],
    TT_OPERATOR: ['tt', 'sla', 'isolations', 'dismantle'],
    DIGITAL_CREATOR: ['tt', 'isolations', 'dismantle', 'sla'],
    DISMANTLE_OPERATOR: ['dismantle', 'isolations', 'tt', 'sla'],
  }

  const order = preferredOrder[role]
  return order.map((key) => lanes.find((lane) => lane.key === key)).filter((lane): lane is SupportLane => Boolean(lane))
}

export function SupportRoleQueueBoard({
  role,
  sections,
}: {
  role: AppRole
  sections: DomainReviewSection[]
}) {
  const lanes = buildSupportLanes(role, sections)
  const roleMeta = getRoleMeta(role)

  if (!lanes.some((lane) => lane.count > 0)) {
    return null
  }

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-title">Micro Queue Support</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Prioritas support untuk {roleMeta.label}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Queue ini memecah domain support menjadi jalur kerja trouble ticket, isolir, dismantle, dan kontrol SLA agar role operasional tidak melihat daftar campur aduk.
          </p>
        </div>
        <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.shortLabel}</span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {lanes.map((lane) => (
          <article key={lane.key} className="rounded-2xl border border-line bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`badge ${lane.accent}`}>{lane.count} item</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{lane.key}</span>
            </div>
            <h4 className="mt-4 text-lg font-semibold text-slate-950">{lane.title}</h4>
            <p className="mt-3 text-sm leading-6 text-mute">{lane.description}</p>
            {lane.topItems.length ? (
              <div className="mt-4 space-y-2">
                {lane.topItems.map((item) => (
                  <div key={`${lane.key}-${item}`} className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Belum ada item review pada lane ini.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
