import Link from 'next/link'
import { BillingCollectionActionForm } from '@/components/billing-collection-action-form'
import { CustomerCreateForm } from '@/components/customer-create-form'
import { SalesLeadCreateForm } from '@/components/sales-lead-create-form'
import { SupportTicketCreateForm } from '@/components/support-ticket-create-form'
import { DataSourceStatus } from '@/components/data-source-status'
import type { DomainCapability, DomainPageContent, DataSourceSnapshot } from '@/lib/types'

export function DomainShell({
  content,
  source,
  capabilities,
}: {
  content: DomainPageContent
  source: DataSourceSnapshot
  capabilities: DomainCapability[]
}) {
  const enabledCapabilities = capabilities.filter((item) => item.enabled)
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const billingInvoiceSuggestions =
    content.key === 'billing'
      ? (content.reviewSections?.[0]?.rows ?? []).map((row) => row.primary)
      : []
  const salesMarketingSuggestions =
    content.key === 'sales'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .flatMap((section) => section.rows)
              .flatMap((row) =>
                row.meta
                  .filter((item) => item.startsWith('Marketing: '))
                  .map((item) => item.replace('Marketing: ', '').trim())
                  .filter(Boolean),
              ),
          ),
        )
      : []
  const supportTypeSuggestions =
    content.key === 'support'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .flatMap((section) => section.rows)
              .flatMap((row) =>
                row.meta
                  .filter((item) => item.startsWith('Type: '))
                  .map((item) => item.replace('Type: ', '').trim())
                  .filter(Boolean),
              ),
          ),
        )
      : []

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <p className="section-title">{content.eyebrow}</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {content.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{content.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={content.primaryAction.href} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              {content.primaryAction.label}
            </Link>
            <Link href={content.secondaryAction.href} className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              {content.secondaryAction.label}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {content.summaries.map((item) => (
          <article key={item.label} className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{item.label}</p>
            <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-6">
          <p className="section-title">Highlight domain</p>
          <div className="mt-6 space-y-4">
            {content.highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="section-title">Capability aktif</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Role aktif membaca modul ini dengan permission yang terukur
          </h3>
          <p className="mt-4 text-sm leading-6 text-mute">
            Service layer domain sudah dipisahkan dari halaman sehingga integrasi Prisma, route
            handler, dan pembatasan aksi bisa diteruskan ke backend yang sama saat review database aktif.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {capabilities.map((item) => (
              <span
                key={item.action}
                className={`badge ${
                  item.enabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Catatan</p>
            <p className="mt-3 text-sm leading-6 text-mute">
              {enabledCapabilities.length} aksi aktif tersedia untuk role ini. Semua modul tetap
              berada dalam satu website agar akses lintas divisi, mobile web, dan Android wrapper
              mengikuti fondasi yang sama.
            </p>
          </div>
        </div>
      </section>

      {content.key === 'billing' ? (
        <BillingCollectionActionForm
          canCreate={canCreate}
          reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
          invoiceSuggestions={billingInvoiceSuggestions}
        />
      ) : null}

      {content.key === 'sales' ? (
        <SalesLeadCreateForm
          canCreate={canCreate}
          reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
          marketingSuggestions={salesMarketingSuggestions}
        />
      ) : null}

      {content.key === 'customers' ? (
        <CustomerCreateForm
          canCreate={canCreate}
          reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
        />
      ) : null}

      {content.key === 'support' ? (
        <SupportTicketCreateForm
          canCreate={canCreate}
          reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
          typeSuggestions={supportTypeSuggestions}
        />
      ) : null}

      {content.reviewSections && content.reviewSections.length > 0 ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {content.reviewSections.map((section) => (
            <div key={section.title} className="panel p-6">
              <p className="section-title">{section.title}</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Review operasional awal dari data domain
              </h3>
              <p className="mt-3 text-sm leading-6 text-mute">{section.description}</p>
              <div className="mt-6 space-y-3">
                {section.rows.map((row) => (
                  <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                        <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                      </div>
                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-700">{row.detail}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {row.meta.map((item) => (
                        <span key={`${row.id}-${item}`} className="badge border-slate-200 bg-white text-slate-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
