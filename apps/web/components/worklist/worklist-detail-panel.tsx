import Link from 'next/link'
import { CaseActionOutcomeSummaryCard } from '@/components/case-action-outcome-summary'
import { CaseDecisionTrailPanel } from '@/components/case-decision-trail'
import { CaseEvidencePanelCard } from '@/components/case-evidence-panel'
import { CaseHealthSignalCard } from '@/components/case-health-signal'
import { CaseNextActionMatrixCard } from '@/components/case-next-action-matrix'
import { CaseCorrelationSummaryPanel } from '@/components/case-correlation-summary'
import type { AppRole, WorklistItem } from '@/lib/types'

type WorklistDetailPanelProps = {
  item: WorklistItem | null
  role?: AppRole
}

export function WorklistDetailPanel({ item, role }: WorklistDetailPanelProps) {
  const compactForNoc = role === 'NOC_OPERATOR'

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Panel Detail</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink-strong)]">
            {compactForNoc ? 'Ringkasan item aktif dan tindak lanjut NOC' : 'Item aktif dan CTA tindak lanjut'}
          </h3>
        </div>
        {item ? <span className="solid-chip">{item.queue}</span> : null}
      </div>

      {item ? (
        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="solid-chip">{item.domain}</span>
              <span className="badge border-transparent" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>{item.status}</span>
              <span className="solid-chip">{item.priority}</span>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[var(--color-ink-strong)]">{item.title}</h4>
              <p className="mt-1 text-sm font-medium text-[var(--color-mute-strong)]">{item.subtitle}</p>
            </div>
            <p className="text-sm leading-6 text-mute">{item.detail}</p>
          </div>

          {compactForNoc ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <article className="surface-soft rounded-3xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Yang Perlu Dipahami</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-mute-strong)]">{item.reason || item.detail || '-'}</p>
              </article>
              <article className="surface-soft rounded-3xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Tindak Lanjut NOC</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-mute-strong)]">{item.nextAction || '-'}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-mute">Blocker</p>
                <p className="mt-2 text-sm leading-6 text-mute">{item.blockingInfo || 'Belum ada blocker eksplisit.'}</p>
              </article>
              <article className="surface-soft rounded-3xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">PIC / Target</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-mute-strong)]">{item.owner || '-'}</p>
                <p className="mt-1 text-sm leading-6 text-mute">{item.dueLabel || 'Belum ada target eksplisit'}</p>
              </article>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <article className="surface-soft rounded-3xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Alasan Muncul</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-mute-strong)]">{item.reason || '-'}</p>
              </article>
              <article className="surface-soft rounded-3xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Langkah Berikut</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-mute-strong)]">{item.nextAction || '-'}</p>
              </article>
              <article className="surface-soft rounded-3xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">PIC / Target</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-mute-strong)]">{item.owner || '-'}</p>
                <p className="mt-1 text-sm leading-6 text-mute">{item.dueLabel || 'Belum ada target eksplisit'}</p>
              </article>
              <article className="surface-soft rounded-3xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Blocker</p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-mute-strong)]">{item.blockingInfo || 'Belum ada blocker eksplisit.'}</p>
              </article>
            </div>
          )}

          {item.healthSignal ? <CaseHealthSignalCard signal={item.healthSignal} /> : null}

          {item.recommendedActions ? <CaseNextActionMatrixCard matrix={item.recommendedActions} /> : null}

          {item.actionOutcomeSummary ? <CaseActionOutcomeSummaryCard summary={item.actionOutcomeSummary} /> : null}

          {item.correlationSummary ? (
            <CaseCorrelationSummaryPanel summary={item.correlationSummary} />
          ) : null}

          {item.decisionTrail ? <CaseDecisionTrailPanel trail={item.decisionTrail} /> : null}

          {item.evidencePanel ? <CaseEvidencePanelCard evidence={item.evidencePanel} /> : null}

          <div className="surface-elevated rounded-3xl border p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">CTA</p>
            <div className={compactForNoc ? 'mt-4 flex flex-col gap-3 sm:flex-row' : 'mt-4 flex flex-wrap gap-3'}>
              <Link
                href={item.href}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
              >
                {item.actionLabel}
              </Link>
              <span className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm text-mute">
                Prefill token: {item.prefillToken || '-'}
              </span>
            </div>
            {item.handoffLinks?.length ? (
              <div className={compactForNoc ? 'mt-4 grid gap-3 md:grid-cols-2' : 'mt-4 flex flex-wrap gap-3'}>
                {item.handoffLinks.map((link) => (
                  <Link
                    key={`${item.id}-${link.label}`}
                    href={link.href}
                    className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="surface-soft mt-6 rounded-3xl border border-dashed p-6 text-sm leading-6 text-mute">
          {compactForNoc
            ? 'Belum ada item yang terpilih. Pilih salah satu baris pada daftar item agar ringkasan tindak lanjut NOC muncul di blok ini.'
            : 'Belum ada item yang terpilih. Pilih salah satu baris pada daftar item untuk melihat konteks lintas domain dan CTA utamanya.'}
        </div>
      )}
    </section>
  )
}
