import Link from 'next/link'
import { SupportActionQuickLinks } from '@/components/support-action-quick-links'
import { canAccessPath } from '@/lib/access-control'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import { canAccessSupportLane } from '@/lib/support-lanes'
import type { AppRole, DomainReviewSection, DomainReviewRow, SupportActionLink } from '@/lib/types'

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
  actionLinks = [],
  role,
  canOpenBillingDecision = false,
}: {
  sections: DomainReviewSection[]
  actionLinks?: SupportActionLink[]
  role: AppRole
  canOpenBillingDecision?: boolean
}) {
  const slaSection = sections.find((section) => section.title.toUpperCase().includes('SLA')) ?? null

  if (!slaSection) {
    return null
  }

  const summary = buildSlaSummary(slaSection.rows)
  const canOpenTicketLane = canAccessSupportLane(role, 'tt')
  const canOpenSupervisorWorkspace = canAccessPath(role, '/customers/cs-admin')

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Kontrol SLA</p>
          <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Aturan durasi penanganan trouble ticket
          </h3>
          <p className="mt-1 text-sm leading-5 text-mute">
            Rule SLA untuk menjaga prioritas kerja TT tetap terukur dan menghindari overdue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{summary.total} aturan</span>
          {summary.lastUpdated ? (
            <span className="badge border-slate-200 bg-white text-slate-600">Diperbarui: {summary.lastUpdated}</span>
          ) : null}
        </div>
      </div>

      {summary.durationValues.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge border-slate-200 bg-white text-slate-600">Contoh durasi:</span>
          {summary.durationValues.map((value) => (
            <span key={value} className="badge border-slate-200 bg-white text-slate-600">
              {value}
            </span>
          ))}
        </div>
      ) : null}

      <SupportActionQuickLinks
        links={actionLinks}
        description="Lane SLA sekarang punya shortcut langsung ke pengelolaan aturan SLA dan penyelesaian ticket prioritas."
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {canOpenTicketLane ? (
          <Link
            href={buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })}
            className="inline-flex items-center justify-center rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-orange-700 transition hover:opacity-90"
          >
            Buka TT Aktif
          </Link>
        ) : null}
        {canOpenBillingDecision ? (
          <Link
            href="/billing"
            className="inline-flex items-center justify-center rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-violet-700 transition hover:opacity-90"
          >
            Sinkron Billing Recovery
          </Link>
        ) : null}
        {canOpenSupervisorWorkspace ? (
          <Link
            href="/customers/cs-admin?queue=Queue+Risiko+Tinggi"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:opacity-90"
          >
            Buka Supervisor CS
          </Link>
        ) : null}
      </div>

      {slaSection.rows.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[980px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3">Aturan</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3">Durasi</th>
                <th className="px-4 py-3">Diperbarui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {slaSection.rows.map((row) => {
                const duration = pickMeta(row.meta, 'Durasi: ')
                const updatedAt = pickMeta(row.meta, 'Updated: ')

                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{row.secondary}</td>
                    <td className="px-4 py-4">
                      <span className={`badge ${getRowTone(row.status)}`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-4 text-sm leading-6 text-mute">{row.detail}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{duration}</td>
                    <td className="px-4 py-4 text-sm text-slate-700">{updatedAt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada aturan SLA yang tersedia untuk direview.</p>
      )}
    </section>
  )
}
