import Link from 'next/link'
import type { ReactNode } from 'react'
import { BillingCollectionActionForm } from '@/components/billing-collection-action-form'
import { BillingInvoiceGenerateForm } from '@/components/billing-invoice-generate-form'
import { BillingInvoiceStatusForm } from '@/components/billing-invoice-status-form'
import { BillingPaymentForm } from '@/components/billing-payment-form'
import { CustomerCreateForm } from '@/components/customer-create-form'
import { HrAttendanceForm } from '@/components/hr-attendance-form'
import { HrEmployeeCreateForm } from '@/components/hr-employee-create-form'
import { HrLoanCreateForm } from '@/components/hr-loan-create-form'
import { HrSalarySlipForm } from '@/components/hr-salary-slip-form'
import { InventoryDeviceAssignmentForm } from '@/components/inventory-device-assignment-form'
import { InventoryDeviceReturnForm } from '@/components/inventory-device-return-form'
import { InventoryItemCreateForm } from '@/components/inventory-item-create-form'
import { InventoryOdpCreateForm } from '@/components/inventory-odp-create-form'
import { InventoryOdpPortAssignForm } from '@/components/inventory-odp-port-assign-form'
import { InventoryOdpPortStatusForm } from '@/components/inventory-odp-port-status-form'
import { InventoryStockMovementForm } from '@/components/inventory-stock-movement-form'
import { SalesCoverageCreateForm } from '@/components/sales-coverage-create-form'
import { SalesLeadCreateForm } from '@/components/sales-lead-create-form'
import { SalesOrderCreateForm } from '@/components/sales-order-create-form'
import { SalesSubscriptionActivateForm } from '@/components/sales-subscription-activate-form'
import { SalesSurveyCreateForm } from '@/components/sales-survey-create-form'
import { SalesWorkOrderCreateForm } from '@/components/sales-work-order-create-form'
import { SupportDismantleForm } from '@/components/support-dismantle-form'
import { SupportLaneDetailPanel } from '@/components/support-lane-detail-panel'
import { SupportIsolationForm } from '@/components/support-isolation-form'
import { SupportIsolationRestoreForm } from '@/components/support-isolation-restore-form'
import { SupportTicketCloseForm } from '@/components/support-ticket-close-form'
import { SupportTicketCreateForm } from '@/components/support-ticket-create-form'
import { SupportLaneWorkspacePanel } from '@/components/support-lane-workspace-panel'
import { SupportRoleQueueBoard } from '@/components/support-role-queue-board'
import { SupportSlaForm } from '@/components/support-sla-form'
import { DataSourceStatus } from '@/components/data-source-status'
import { getRoleMeta } from '@/lib/role-meta'
import { getSupportLanePath } from '@/lib/support-lanes'
import type {
  AppRole,
  DomainCapability,
  DomainPageContent,
  DataSourceSnapshot,
  DomainSupportFocus,
  SupportLaneActionKey,
  SupportLaneKey,
} from '@/lib/types'

function getSupportLaneFocusCopy(lane: SupportLaneKey) {
  switch (lane) {
    case 'tt':
      return {
        eyebrow: 'Lane fokus TT',
        title: 'Trouble ticket diprioritaskan untuk analisis, update status, dan close loop.',
        description:
          'Gunakan mode ini saat operator support perlu fokus pada ticket terbuka, kontrol SLA, dan tindak lanjut teknis yang masih aktif.',
      }
    case 'isolations':
      return {
        eyebrow: 'Lane fokus isolir',
        title: 'Queue isolir diprioritaskan untuk suspend aktif dan recovery pelanggan.',
        description:
          'Mode ini menonjolkan form suspend, restore, dan kaitannya dengan proses dismantle agar follow up administrasi tidak tercampur dengan ticket lain.',
      }
    case 'dismantle':
      return {
        eyebrow: 'Lane fokus dismantle',
        title: 'Queue dismantle diprioritaskan untuk terminasi, approval, dan jejak penutupan layanan.',
        description:
          'Gunakan lane ini saat tim perlu mengecek data isolir yang siap diterminasi serta histori dismantle yang sudah selesai.',
      }
    case 'sla':
      return {
        eyebrow: 'Lane fokus SLA',
        title: 'Kontrol SLA diprioritaskan untuk menjaga ticket tidak melewati target waktu.',
        description:
          'Mode ini membantu NOC, TT, dan teknisi lapangan melihat aturan SLA lebih cepat sebelum memproses ticket support yang kritis.',
      }
  }
}

export function DomainShell({
  content,
  source,
  capabilities,
  role,
  supportFocus,
  supportPageMode = 'domain',
}: {
  content: DomainPageContent
  source: DataSourceSnapshot
  capabilities: DomainCapability[]
  role: AppRole
  supportFocus?: DomainSupportFocus
  supportPageMode?: 'domain' | 'lane'
}) {
  const enabledCapabilities = capabilities.filter((item) => item.enabled)
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canApprove = capabilities.some((item) => item.action === 'approve' && item.enabled)
  const billingInvoiceSuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('INVOICE'))
              .flatMap((section) => section.rows)
              .map((row) => row.primary)
              .filter(Boolean),
          ),
        )
      : []
  const billingSubscriptionSuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('SUBSCRIPTION BILLING-READY'))
              .flatMap((section) => section.rows)
              .map((row) => row.primary)
              .filter(Boolean),
          ),
        )
      : []
  const inventoryItemSuggestions =
    content.key === 'inventory'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('ITEM'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.primary} | ${row.secondary}`)
      : []
  const inventoryOdpSuggestions =
    content.key === 'inventory'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('ODP'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.primary} | ${row.secondary}`)
      : []
  const inventoryAssignmentSuggestions =
    content.key === 'inventory'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('DEVICE ASSIGNMENT'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const assignmentId = row.id.replace(/^ASSIGN-/, '').trim()
            return assignmentId ? `${assignmentId} | ${row.primary} | ${row.secondary}` : ''
          })
          .filter(Boolean)
      : []
  const hrEmployeeSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('EMPLOYEE'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.primary} | ${row.secondary}`)
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
  const salesLeadSuggestions =
    content.key === 'sales'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('LEAD'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const marketing = row.meta.find((item) => item.startsWith('Marketing: '))?.replace('Marketing: ', '').trim() || '-'
            return `${row.id.replace(/^LEAD-/, '')} | ${row.primary} | ${marketing}`
          })
      : []
  const salesOrderSuggestions =
    content.key === 'sales'
      ? (content.reviewSections ?? [])
          .flatMap((section) => section.rows)
          .filter((row) => row.meta.includes('Flow: ORDER'))
          .map((row) => {
            const orderId = row.meta.find((item) => item.startsWith('Order ID: '))?.replace('Order ID: ', '').trim() || ''
            return orderId ? `${orderId} | ${row.primary} | ${row.secondary}` : ''
          })
          .filter(Boolean)
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
  const supportTicketSuggestions =
    content.key === 'support'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('TROUBLE'))
          .flatMap((section) => section.rows)
          .map((row) => row.primary)
      : []
  const supportRadboxSuggestions =
    content.key === 'support'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('ISOLIR'))
              .flatMap((section) => section.rows)
              .map((row) => row.secondary.trim())
              .filter((item) => item && !item.toLowerCase().includes('belum terpetakan')),
          ),
        )
      : []
  const supportMarketingSuggestions =
    content.key === 'support'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('ISOLIR'))
              .flatMap((section) => section.rows)
              .flatMap((row) =>
                row.meta
                  .filter((item) => item.startsWith('Marketing: '))
                  .map((item) => item.replace('Marketing: ', '').trim())
                  .filter((item) => item && item !== '-'),
              ),
          ),
        )
      : []
  const supportIsolationSuggestions =
    content.key === 'support'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('ISOLIR'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.id.replace(/^ISO-/, '')} | ${row.primary} | ${row.secondary}`)
      : []
  const selectedSupportLane = supportFocus?.selectedLane ?? null
  const activeSupportLane = supportFocus?.activeLane ?? null
  const activeSupportLaneMeta =
    activeSupportLane ? supportFocus?.lanes.find((lane) => lane.key === activeSupportLane) ?? null : null
  const activeSupportWorkspace = supportFocus?.activeWorkspace
  const supportFocusCopy =
    content.key === 'support' && activeSupportLane ? getSupportLaneFocusCopy(activeSupportLane) : null
  const supportRoleMeta = content.key === 'support' ? getRoleMeta(role) : null
  const visibleReviewSections =
    content.key === 'support' ? supportFocus?.visibleSections ?? (content.reviewSections ?? []) : (content.reviewSections ?? [])
  const supportForms =
    content.key === 'support'
      ? ([
          {
            key: 'ticket-create',
            lanes: ['tt'] as SupportLaneKey[],
            element: (
              <SupportTicketCreateForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                typeSuggestions={supportTypeSuggestions}
              />
            ),
          },
          {
            key: 'ticket-close',
            lanes: ['tt'] as SupportLaneKey[],
            element: (
              <SupportTicketCloseForm
                canUpdate={canUpdate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                ticketSuggestions={supportTicketSuggestions}
              />
            ),
          },
          {
            key: 'sla-manage',
            lanes: ['tt', 'sla'] as SupportLaneKey[],
            element: (
              <SupportSlaForm
                canApprove={canApprove}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                typeSuggestions={supportTypeSuggestions}
              />
            ),
          },
          {
            key: 'isolation-create',
            lanes: ['isolations'] as SupportLaneKey[],
            element: (
              <SupportIsolationForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                radboxSuggestions={supportRadboxSuggestions}
                marketingSuggestions={supportMarketingSuggestions}
              />
            ),
          },
          {
            key: 'isolation-restore',
            lanes: ['isolations'] as SupportLaneKey[],
            element: (
              <SupportIsolationRestoreForm
                canUpdate={canUpdate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                isolationSuggestions={supportIsolationSuggestions}
              />
            ),
          },
          {
            key: 'dismantle-approve',
            lanes: ['isolations', 'dismantle'] as SupportLaneKey[],
            element: (
              <SupportDismantleForm
                canApprove={canApprove}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                isolationSuggestions={supportIsolationSuggestions}
              />
            ),
          },
        ] satisfies {
          key: SupportLaneActionKey
          lanes: SupportLaneKey[]
          element: ReactNode
        }[])
      : []
  const primarySupportForms =
    activeSupportWorkspace && content.key === 'support'
      ? supportForms.filter((item) => activeSupportWorkspace.actionKeys.includes(item.key))
      : supportForms
  const secondarySupportForms =
    activeSupportWorkspace && content.key === 'support'
      ? supportForms.filter((item) => !activeSupportWorkspace.actionKeys.includes(item.key))
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
        <section className="grid gap-6 xl:grid-cols-2">
          <BillingInvoiceGenerateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            subscriptionSuggestions={billingSubscriptionSuggestions}
          />
          <BillingInvoiceStatusForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            invoiceSuggestions={billingInvoiceSuggestions}
          />
          <BillingCollectionActionForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            invoiceSuggestions={billingInvoiceSuggestions}
          />
          <BillingPaymentForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            invoiceSuggestions={billingInvoiceSuggestions}
          />
        </section>
      ) : null}

      {content.key === 'sales' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <SalesLeadCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            marketingSuggestions={salesMarketingSuggestions}
          />
          <SalesCoverageCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            leadSuggestions={salesLeadSuggestions}
          />
          <SalesSurveyCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            leadSuggestions={salesLeadSuggestions}
          />
          <SalesOrderCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            leadSuggestions={salesLeadSuggestions}
            marketingSuggestions={salesMarketingSuggestions}
          />
          <SalesWorkOrderCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            orderSuggestions={salesOrderSuggestions}
          />
          <SalesSubscriptionActivateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            orderSuggestions={salesOrderSuggestions}
          />
        </section>
      ) : null}

      {content.key === 'customers' ? (
        <CustomerCreateForm
          canCreate={canCreate}
          reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
        />
      ) : null}

      {content.key === 'inventory' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <InventoryItemCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
          />
          <InventoryStockMovementForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            itemSuggestions={inventoryItemSuggestions}
          />
          <InventoryOdpCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
          />
          <InventoryOdpPortAssignForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            odpSuggestions={inventoryOdpSuggestions}
          />
          <InventoryOdpPortStatusForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            odpSuggestions={inventoryOdpSuggestions}
          />
          <InventoryDeviceAssignmentForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            itemSuggestions={inventoryItemSuggestions}
          />
          <InventoryDeviceReturnForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            assignmentSuggestions={inventoryAssignmentSuggestions}
          />
        </section>
      ) : null}

      {content.key === 'hr' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <HrEmployeeCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
          />
          <HrAttendanceForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            employeeSuggestions={hrEmployeeSuggestions}
          />
          <HrLoanCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            employeeSuggestions={hrEmployeeSuggestions}
          />
          <HrSalarySlipForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            employeeSuggestions={hrEmployeeSuggestions}
          />
        </section>
      ) : null}

      {content.key === 'support' ? (
        <>
          {supportPageMode === 'domain' ? (
            <SupportRoleQueueBoard role={role} sections={content.reviewSections ?? []} selectedLane={selectedSupportLane} />
          ) : null}
          {supportPageMode === 'lane' && supportFocus ? (
            <SupportLaneDetailPanel supportFocus={supportFocus} />
          ) : null}
          {supportFocusCopy && activeSupportLaneMeta && supportRoleMeta && activeSupportWorkspace ? (
            <SupportLaneWorkspacePanel
              workspace={activeSupportWorkspace}
              laneTone={activeSupportLaneMeta.accent}
              roleTone={supportRoleMeta.tone}
              roleLabel={supportRoleMeta.shortLabel}
              isExplicitFocus={Boolean(selectedSupportLane)}
            />
          ) : null}
          {supportFocusCopy && activeSupportLaneMeta && supportRoleMeta ? (
            <section className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="section-title">
                    {supportPageMode === 'lane'
                      ? `Workspace dedicated: ${supportFocusCopy.eyebrow}`
                      : selectedSupportLane
                        ? supportFocusCopy.eyebrow
                        : `Default role: ${supportFocusCopy.eyebrow}`}
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                    {supportFocusCopy.title}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{supportFocusCopy.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${activeSupportLaneMeta.accent}`}>{activeSupportLaneMeta.shortLabel}</span>
                  <span className={`badge border-transparent ${supportRoleMeta.tone}`}>{supportRoleMeta.shortLabel}</span>
                  {!selectedSupportLane && supportPageMode === 'domain' ? (
                    <span className="badge border-slate-200 bg-white text-slate-600">workspace default</span>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {supportPageMode === 'lane' ? (
                  <Link href="/support" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    Kembali ke support
                  </Link>
                ) : (
                  <Link href="/support" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    Semua lane
                  </Link>
                )}
                {(supportFocus?.lanes ?? []).map((lane) => {
                  return (
                    <Link
                      key={lane.key}
                      href={getSupportLanePath(lane.key)}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        lane.key === activeSupportLane
                          ? 'bg-slate-950 text-white'
                          : 'border border-line bg-white text-slate-700'
                      }`}
                    >
                      {lane.shortLabel}
                    </Link>
                  )
                })}
              </div>
            </section>
          ) : null}
          {primarySupportForms.length ? (
            <section className="space-y-4">
              {activeSupportLane ? (
                <div>
                  <p className="section-title">Aksi utama lane</p>
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                    Form operasional yang diprioritaskan untuk lane aktif
                  </h3>
                </div>
              ) : null}
              <div className="grid gap-6 xl:grid-cols-2">
                {primarySupportForms.map((item) => (
                  <div key={item.key}>{item.element}</div>
                ))}
              </div>
            </section>
          ) : null}
          {secondarySupportForms.length ? (
            <section className="space-y-4">
              <div>
                <p className="section-title">Aksi pendukung</p>
                <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                  Form support lain tetap tersedia untuk lintas proses
                </h3>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                {secondarySupportForms.map((item) => (
                  <div key={item.key}>{item.element}</div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {visibleReviewSections.length > 0 ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {visibleReviewSections.map((section) => (
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
