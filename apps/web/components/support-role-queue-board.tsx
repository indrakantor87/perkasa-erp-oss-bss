import Link from 'next/link'
import { getPreferredSupportLane, getSupportLaneMeta, getSupportLaneOrder, getSupportLaneSections, type SupportLaneKey } from '@/lib/support-lanes'
import { getRoleMeta } from '@/lib/role-meta'
import type { AppRole, DomainReviewSection } from '@/lib/types'

type SupportLane = {
  key: SupportLaneKey
  title: string
  description: string
  count: number
  accent: string
  topItems: string[]
}

function buildSupportLanes(role: AppRole, sections: DomainReviewSection[]): SupportLane[] {
  const lanes: SupportLane[] = [
    {
      key: 'tt',
      title: 'Queue Trouble Ticket',
      description:
        role === 'TT_OPERATOR' || role === 'NOC_OPERATOR'
          ? 'Queue utama untuk ticket teknis yang perlu analisis, tindak lanjut, atau close loop.'
          : 'Ticket terbuka yang perlu dipantau dari perspektif operasional support.',
      count: getSupportLaneSections(sections, 'tt')[0]?.rows.length ?? 0,
      accent: getSupportLaneMeta('tt').accent,
      topItems: (getSupportLaneSections(sections, 'tt')[0]?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
    {
      key: 'isolations',
      title: 'Queue Isolir Aktif',
      description:
        role === 'CS_OPERATOR' || role === 'CS_ADMIN'
          ? 'Pelanggan suspend yang perlu tindak lanjut administrasi, ticket, atau transfer proses.'
          : 'Data isolir aktif untuk monitoring dan tindak lanjut lintas tim support.',
      count: getSupportLaneSections(sections, 'isolations')[0]?.rows.length ?? 0,
      accent: getSupportLaneMeta('isolations').accent,
      topItems: (getSupportLaneSections(sections, 'isolations')[0]?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
    {
      key: 'dismantle',
      title: role === 'DISMANTLE_OPERATOR' ? 'Queue Histori Dismantle' : 'Dismantle Dan Terminasi',
      description:
        role === 'DISMANTLE_OPERATOR'
          ? 'Jejak pelanggan yang sudah diproses atau siap ditindaklanjuti pada flow dismantle.'
          : 'Histori dan tindak lanjut terminasi agar jejak support tidak hilang.',
      count: getSupportLaneSections(sections, 'dismantle')[0]?.rows.length ?? 0,
      accent: getSupportLaneMeta('dismantle').accent,
      topItems: (getSupportLaneSections(sections, 'dismantle')[0]?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
    {
      key: 'sla',
      title: role === 'FIELD_TECHNICIAN' ? 'Target SLA Lapangan' : 'Kontrol SLA',
      description:
        role === 'FIELD_TECHNICIAN'
          ? 'Ringkasan SLA untuk membantu prioritas pekerjaan yang berpotensi overdue di lapangan.'
          : 'Target durasi penanganan per tipe ticket agar prioritas support tetap terukur.',
      count: getSupportLaneSections(sections, 'sla')[0]?.rows.length ?? 0,
      accent: getSupportLaneMeta('sla').accent,
      topItems: (getSupportLaneSections(sections, 'sla')[0]?.rows ?? []).slice(0, 2).map((row) => `${row.primary} - ${row.secondary}`),
    },
  ]

  const order = getSupportLaneOrder(role)
  return order.map((key) => lanes.find((lane) => lane.key === key)).filter((lane): lane is SupportLane => Boolean(lane))
}

export function SupportRoleQueueBoard({
  role,
  sections,
  selectedLane,
}: {
  role: AppRole
  sections: DomainReviewSection[]
  selectedLane?: SupportLaneKey | null
}) {
  const lanes = buildSupportLanes(role, sections)
  const roleMeta = getRoleMeta(role)
  const recommendedLane = getPreferredSupportLane(role)

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
          <Link
            key={lane.key}
            href={`/support?lane=${lane.key}`}
            className={`rounded-2xl border p-5 transition hover:border-slate-300 hover:bg-white ${
              selectedLane === lane.key ? 'border-slate-950 bg-white shadow-sm' : 'border-line bg-slate-50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${lane.accent}`}>{lane.count} item</span>
                {recommendedLane === lane.key && selectedLane !== lane.key ? (
                  <span className="badge border-slate-200 bg-white text-slate-600">default role</span>
                ) : null}
                {selectedLane === lane.key ? (
                  <span className="badge border-transparent bg-slate-950 text-white">focus aktif</span>
                ) : null}
              </div>
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
            <p className="mt-4 text-sm font-medium text-slate-700">Buka mode fokus lane</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
