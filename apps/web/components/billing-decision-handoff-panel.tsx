'use client'

import Link from 'next/link'
import { buildSupportLaneHref } from '@/lib/support-action-links'

type BillingDecisionHandoffPanelProps = {
  decisionLabel: string
  detail: string
}

const handoffLinks = [
  {
    label: 'Billing Decision',
    href: '/billing',
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  {
    label: 'Queue Isolir',
    href: buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' }),
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    label: 'TT Aktif',
    href: buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' }),
    tone: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  {
    label: 'SLA Kritis',
    href: buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' }),
    tone: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    label: 'Queue Dismantle',
    href: buildSupportLaneHref('dismantle', { focus: 'RECENT_DISMANTLE' }),
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  {
    label: 'Supervisor CS',
    href: '/customers/cs-admin?queue=Transfer+atau+Restore',
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  },
] as const

export function BillingDecisionHandoffPanel({
  decisionLabel,
  detail,
}: BillingDecisionHandoffPanelProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Handoff Lintas Divisi
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">{decisionLabel}</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">{detail}</p>
        </div>
        <span className="badge border-violet-200 bg-violet-50 text-violet-700">
          Billing sebagai sumber keputusan
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {handoffLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90 ${link.tone}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </article>
  )
}
