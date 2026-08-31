import Link from 'next/link'
import { CaseActionOutcomeSummaryCard } from '@/components/case-action-outcome-summary'
import { CaseDecisionTrailPanel } from '@/components/case-decision-trail'
import { CaseEvidencePanelCard } from '@/components/case-evidence-panel'
import { CaseHealthSignalCard } from '@/components/case-health-signal'
import { CaseNextActionMatrixCard } from '@/components/case-next-action-matrix'
import { CaseCorrelationSummaryPanel } from '@/components/case-correlation-summary'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'
import type { AppRole, WorklistItem } from '@/lib/types'

type WorklistDetailPanelProps = {
  item: WorklistItem | null
  role?: AppRole
}

function resolveStatusTone(status: string): StatusTone {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (['CLOSED', 'DONE', 'COMPLETED', 'READY'].includes(normalized)) return 'success'
  if (['ACCEPTED', 'ON_PROGRESS', 'PROCESS', 'ASSIGNED'].includes(normalized)) return 'in_progress'
  if (['OPEN', 'OVERDUE'].includes(normalized)) return 'danger'
  if (['PENDING', 'REVIEW', 'WAITING', 'MONITOR', 'HOLD'].includes(normalized)) return 'pending'
  return 'neutral'
}

function resolvePriorityTone(priority: WorklistItem['priority']): StatusTone {
  if (priority === 'tinggi') return 'danger'
  if (priority === 'sedang') return 'warning'
  return 'success'
}

function resolvePriorityLabel(priority: WorklistItem['priority']): string {
  if (priority === 'tinggi') return 'URGENT'
  if (priority === 'sedang') return 'NORMAL'
  return 'RENDAH'
}

export function WorklistDetailPanel({ item, role }: WorklistDetailPanelProps) {
  const compactForNoc = role === 'NOC_OPERATOR'

  return (
    <section aria-label="Worklist detail panel" className="card-tier-2 border border-line p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Panel Detail</p>
          <h3 className="mt-1 text-lg font-semibold text-inkStrong">
            {compactForNoc ? 'Ringkasan item aktif dan tindak lanjut NOC' : 'Item aktif dan CTA tindak lanjut'}
          </h3>
        </div>
        {item ? (
          <StatusBadge tone="neutral" label={item.queue} size="sm" ariaLabel={`Antrean: ${item.queue}`} />
        ) : null}
      </div>

      {item ? (
        <div className="mt-5 space-y-5">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info" label={item.domain} size="sm" ariaLabel={`Domain: ${item.domain}`} />
              <StatusBadge
                tone={resolveStatusTone(item.status)}
                label={item.status}
                size="sm"
                uppercase
                ariaLabel={`Status: ${item.status}`}
              />
              <StatusBadge
                tone={resolvePriorityTone(item.priority)}
                label={resolvePriorityLabel(item.priority)}
                size="sm"
                uppercase
                ariaLabel={`Prioritas: ${item.priority}`}
              />
              {item.owner ? (
                <StatusBadge tone="neutral" label={item.owner} size="sm" ariaLabel={`PIC: ${item.owner}`} />
              ) : null}
            </div>
            <div>
              <h4 className="text-xl font-semibold leading-snug text-inkStrong">{item.title}</h4>
              {item.subtitle ? (
                <p className="mt-1 text-sm font-medium text-muteStrong">{item.subtitle}</p>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-mute">{item.detail}</p>
          </header>

          {compactForNoc ? (
            <div className="grid gap-3 lg:grid-cols-3">
              <article className="rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Yang Perlu Dipahami</p>
                <p className="mt-2 text-sm leading-6 text-ink">{item.reason || item.detail || '-'}</p>
              </article>
              <article className="rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Tindak Lanjut NOC</p>
                <p className="mt-2 text-sm leading-6 text-ink">{item.nextAction || '-'}</p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Blocker</p>
                <p className="mt-1 text-sm leading-6 text-mute">{item.blockingInfo || 'Belum ada blocker eksplisit.'}</p>
              </article>
              <article className="rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">PIC / Target</p>
                <p className="mt-2 text-sm leading-6 text-ink">{item.owner || '-'}</p>
                <p className="mt-1 text-sm leading-6 text-mute">{item.dueLabel || 'Belum ada target eksplisit'}</p>
              </article>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Alasan Muncul</p>
                <p className="mt-2 text-sm leading-6 text-ink">{item.reason || '-'}</p>
              </article>
              <article className="rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Langkah Berikut</p>
                <p className="mt-2 text-sm leading-6 text-ink">{item.nextAction || '-'}</p>
              </article>
              <article className="rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">PIC / Target</p>
                <p className="mt-2 text-sm leading-6 text-ink">{item.owner || '-'}</p>
                <p className="mt-1 text-sm leading-6 text-mute">{item.dueLabel || 'Belum ada target eksplisit'}</p>
              </article>
              <article className="rounded-control border border-line bg-cardSubtle p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">Blocker</p>
                <p className="mt-2 text-sm leading-6 text-ink">{item.blockingInfo || 'Belum ada blocker eksplisit.'}</p>
              </article>
            </div>
          )}

          {item.healthSignal ? <CaseHealthSignalCard signal={item.healthSignal} /> : null}

          {item.recommendedActions ? <CaseNextActionMatrixCard matrix={item.recommendedActions} /> : null}

          {item.actionOutcomeSummary ? <CaseActionOutcomeSummaryCard summary={item.actionOutcomeSummary} /> : null}

          {item.correlationSummary ? <CaseCorrelationSummaryPanel summary={item.correlationSummary} /> : null}

          {item.decisionTrail ? <CaseDecisionTrailPanel trail={item.decisionTrail} /> : null}

          {item.evidencePanel ? <CaseEvidencePanelCard evidence={item.evidencePanel} /> : null}

          <div className="rounded-control border border-line bg-surfaceSoft p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muteStrong">CTA</p>
            <div className={compactForNoc ? 'mt-4 flex flex-col gap-3 sm:flex-row' : 'mt-4 flex flex-wrap gap-3'}>
              <Link
                href={item.href}
                aria-label={`${item.actionLabel}: ${item.title}`}
                className="btn-base btn-primary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-4 text-sm font-semibold transition hover:opacity-90"
              >
                {item.actionLabel}
              </Link>
              {item.handoffLinks?.length
                ? item.handoffLinks.map((link) => (
                    <Link
                      key={`${item.id}-${link.label}`}
                      href={link.href}
                      aria-label={`Handoff link ${link.label}: ${item.title}`}
                      className="btn-base btn-secondary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control border border-line bg-surfaceSoft px-4 text-sm font-medium text-ink transition hover:border-lineStrong hover:text-inkStrong"
                    >
                      {link.label}
                    </Link>
                  ))
                : null}
              <span className="btn-base btn-ghost inline-flex min-h-[2.75rem] items-center justify-center rounded-control border border-line bg-surfaceSoft px-4 text-xs font-medium text-muteStrong">
                Prefill: {item.prefillToken || '-'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-control border border-dashed border-line bg-cardSubtle p-6 text-sm leading-6 text-mute">
          {compactForNoc
            ? 'Belum ada item yang terpilih. Pilih salah satu baris pada daftar item agar ringkasan tindak lanjut NOC muncul di blok ini.'
            : 'Belum ada item yang terpilih. Pilih salah satu baris pada daftar item untuk melihat konteks lintas domain dan CTA utamanya.'}
        </div>
      )}
    </section>
  )
}
