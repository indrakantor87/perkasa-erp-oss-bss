import { DailyActivityCloseForm } from '@/components/daily-activity-close-form'
import { DailyActivityExportForm } from '@/components/daily-activity-export-form'
import { DailyActivityFilterBar } from '@/components/daily-activity-filter-bar'
import { DailyActivityManagerApprovalForm } from '@/components/daily-activity-manager-approval-form'
import { DailyActivitySmartPaste } from '@/components/daily-activity-smart-paste'
import { DailyActivitySummaryPanel } from '@/components/daily-activity-summary-panel'
import { DailyActivityWorkspaceToolbar } from '@/components/daily-activity-workspace-toolbar'
import { DataSourceStatus } from '@/components/data-source-status'
import { canPerformAction } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { dailyActivityPlanningLevelLabels } from '@/lib/daily-activity-org'
import { getRoleMeta } from '@/lib/role-meta'
import { getDailyActivityPageData, type DailyActivityItem } from '@/lib/services/daily-activity-service'

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getStatusBadge(status: DailyActivityItem['executionStatus']) {
  switch (status) {
    case 'DONE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'PENDING':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    default:
      return 'border-slate-200 bg-white text-slate-600'
  }
}

function getApprovalBadge(status: DailyActivityItem['approvalStatus']) {
  switch (status) {
    case 'APPROVED':
      return { label: 'APPROVED', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    case 'PENDING':
      return { label: 'PENDING APPROVAL', className: 'border-sky-200 bg-sky-50 text-sky-700' }
    case 'REJECTED':
      return { label: 'REJECTED', className: 'border-rose-200 bg-rose-50 text-rose-700' }
    default:
      return null
  }
}

function getPriorityBadge(priority: DailyActivityItem['priorityLevel']) {
  switch (priority) {
    case 'HIGH':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'LOW':
      return 'border-slate-200 bg-white text-slate-600'
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700'
  }
}

export default async function DailyActivityPage({
  searchParams,
}: {
  searchParams?: {
    month?: string
    divisionName?: string
    subdivisionName?: string
    planningLevel?: string
    approvalStatus?: string
    referenceWorkOrder?: string
    workOrderNo?: string
    troubleTicketId?: string
    troubleTicketNo?: string
    activityCategory?: string
    activityType?: string
    notes?: string
  }
}) {
  const session = await requireSession()
  const {
    source,
    summary,
    todayItems,
    recentItems,
    closeSuggestions,
    scopeLabel,
    todayLabel,
    defaultActivityDate,
    defaultPlanningLevel,
    lockOrgFields,
    approvalSuggestions,
    pendingApprovals,
    planningLevelOptions,
    divisionOptions,
    subdivisionMap,
    defaultDivision,
    defaultSubdivision,
    selectedDivision,
    selectedSubdivision,
    selectedPlanningLevel,
    selectedApprovalStatus,
    performance,
    calendarMonth,
    calendarPrevMonth,
    calendarNextMonth,
    calendarMonthLabel,
    calendarDays,
  } = await getDailyActivityPageData(session, {
    month: searchParams?.month,
    divisionName: searchParams?.divisionName,
    subdivisionName: searchParams?.subdivisionName,
    planningLevel: searchParams?.planningLevel,
    approvalStatus: searchParams?.approvalStatus,
  })
  const roleMeta = getRoleMeta(session.role)
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback
  const canCreate = canPerformAction(session.role, 'daily_activity', 'create')
  const canUpdate = canPerformAction(session.role, 'daily_activity', 'update')
  const canApprove = canPerformAction(session.role, 'daily_activity', 'approve')
  const canExport = canPerformAction(session.role, 'daily_activity', 'export')
  const isSuperAdmin = session.role === 'SUPER_ADMIN'
  const querySuffixParts = [
    isSuperAdmin ? `divisionName=${encodeURIComponent(selectedDivision)}` : null,
    isSuperAdmin && selectedSubdivision ? `subdivisionName=${encodeURIComponent(selectedSubdivision)}` : null,
    selectedPlanningLevel && selectedPlanningLevel !== 'ALL'
      ? `planningLevel=${encodeURIComponent(selectedPlanningLevel)}`
      : null,
    selectedApprovalStatus && selectedApprovalStatus !== 'ALL'
      ? `approvalStatus=${encodeURIComponent(selectedApprovalStatus)}`
      : null,
  ].filter(Boolean)
  const querySuffix = querySuffixParts.length ? `&${querySuffixParts.join('&')}` : ''
  const calendarPrevHref = `?month=${calendarPrevMonth}${querySuffix}`
  const calendarNextHref = `?month=${calendarNextMonth}${querySuffix}`

  const prefillReferenceWorkOrderId = searchParams?.referenceWorkOrder?.trim() || ''
  const prefillWorkOrderNo = searchParams?.workOrderNo?.trim() || ''
  const prefillTroubleTicketId = searchParams?.troubleTicketId?.trim() || ''
  const prefillTroubleTicketNo = searchParams?.troubleTicketNo?.trim() || ''
  const prefillActivityCategory = searchParams?.activityCategory?.trim() || ''
  const prefillActivityType = searchParams?.activityType?.trim() || ''
  const prefillNotes = searchParams?.notes?.trim() || ''
  const hasPrefillContext = Boolean(
    prefillReferenceWorkOrderId ||
      prefillWorkOrderNo ||
      prefillTroubleTicketId ||
      prefillTroubleTicketNo ||
      prefillActivityCategory ||
      prefillActivityType ||
      prefillNotes,
  )

  const sharedToolbarProps = {
    canCreate,
    reviewDbReady,
    defaultActivityDate,
    defaultPlanningLevel,
    lockOrgFields,
    planningLevelOptions,
    divisionOptions,
    subdivisionMap,
    defaultDivision,
    defaultSubdivision,
    prefillReferenceWorkOrderId,
    prefillWorkOrderNo,
    prefillTroubleTicketId,
    prefillTroubleTicketNo,
    prefillActivityCategory,
    prefillActivityType,
    prefillNotes,
    hasPrefillContext,
  } as const

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Disiplin Operasional</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Daily Activity
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
              Tabel hari ini menjadi pusat kerja utama. Gunakan toolbar untuk input cepat, create manual, atau filter lanjutan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.label}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">{scopeLabel}</span>
          </div>
        </div>
      </section>

      <DailyActivitySummaryPanel
        summary={summary}
        todayLabel={todayLabel}
        scopeLabel={scopeLabel}
        todayItems={todayItems}
        recentItems={recentItems}
        performance={performance}
        calendarMonth={calendarMonth}
        calendarPrevHref={calendarPrevHref}
        calendarNextHref={calendarNextHref}
        calendarMonthLabel={calendarMonthLabel}
        calendarDays={calendarDays}
      />

      <DataSourceStatus source={source} />

      <div id="daily-activity-filter-bar">
        <DailyActivityFilterBar
          isSuperAdmin={isSuperAdmin}
          calendarMonth={calendarMonth}
          divisionOptions={divisionOptions}
          subdivisionMap={subdivisionMap}
          selectedDivision={selectedDivision}
          selectedSubdivision={selectedSubdivision}
          selectedPlanningLevel={selectedPlanningLevel}
          selectedApprovalStatus={selectedApprovalStatus}
        />
      </div>

      <section className="space-y-4">
        <DailyActivityWorkspaceToolbar
          {...sharedToolbarProps}
          todayItemsCount={todayItems.length}
          todayLabel={todayLabel}
        />

        <section className="panel p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Aktivitas Hari Ini</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Daftar aktivitas yang direncanakan dan ditutup {todayLabel}
              </h3>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{todayItems.length} aktivitas</span>
          </div>

          <div className="mt-6 space-y-3">
            {todayItems.length ? (
              todayItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-line bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.taskTitle}</p>
                      <p className="mt-1 text-sm text-mute">
                        {item.activityCode} • {item.plannedBy} • {dailyActivityPlanningLevelLabels[item.planningLevel]}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`badge ${getStatusBadge(item.executionStatus)}`}>{item.executionStatus}</span>
                      {getApprovalBadge(item.approvalStatus) ? (
                        <span className={`badge ${getApprovalBadge(item.approvalStatus)?.className}`}>
                          {getApprovalBadge(item.approvalStatus)?.label}
                        </span>
                      ) : null}
                      <span className={`badge ${getPriorityBadge(item.priorityLevel)}`}>{item.priorityLevel}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-6 text-mute">
                    <p>{item.taskDetail || 'Detail aktivitas belum ditambahkan.'}</p>
                    <p>
                      <span className="font-semibold text-slate-700">Target:</span>{' '}
                      {item.successMetric || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Level:</span>{' '}
                      {dailyActivityPlanningLevelLabels[item.planningLevel]}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Divisi:</span>{' '}
                      {item.divisionName || '-'} / {item.subdivisionName || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Direncanakan:</span>{' '}
                      {formatDateTime(item.plannedAt)}
                    </p>
                    {item.closeNotes ? (
                      <p>
                        <span className="font-semibold text-slate-700">Closing:</span>{' '}
                        {item.closeNotes}
                      </p>
                    ) : null}
                    {item.pendingReason ? (
                      <p>
                        <span className="font-semibold text-slate-700">Alasan pending:</span>{' '}
                        {item.pendingReason}
                      </p>
                    ) : null}
                    {item.followUpAction ? (
                      <p>
                        <span className="font-semibold text-slate-700">Aksi lanjut:</span>{' '}
                        {item.followUpAction}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <article className="rounded-2xl border border-dashed border-line bg-slate-50 p-6 text-sm leading-6 text-mute">
                Belum ada daily activity yang tercatat hari ini. Mulai dari tombol <b>+ INPUT</b> atau <b>+ CREATE</b> di toolbar agar closing sore bisa terlihat jelas.
              </article>
            )}
          </div>
        </section>

        <section className="panel p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Riwayat Ringkas</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Aktivitas terbaru untuk evaluasi mingguan
              </h3>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">7 hari terakhir</span>
          </div>

          <div className="mt-6 space-y-3">
            {recentItems.length ? (
              recentItems.map((item) => (
                <article key={`${item.id}-${item.activityDate}`} className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.taskTitle}</p>
                      <p className="mt-1 text-sm text-mute">
                        {item.activityDate} • {item.plannedBy} • {dailyActivityPlanningLevelLabels[item.planningLevel]} • {item.activityCode}
                      </p>
                    </div>
                    <span className={`badge ${getStatusBadge(item.executionStatus)}`}>{item.executionStatus}</span>
                  </div>
                  {item.pendingReason || item.followUpAction ? (
                    <div className="mt-4 space-y-2 text-sm leading-6 text-mute">
                      {item.pendingReason ? (
                        <p>
                          <span className="font-semibold text-slate-700">Alasan pending:</span>{' '}
                          {item.pendingReason}
                        </p>
                      ) : null}
                      {item.followUpAction ? (
                        <p>
                          <span className="font-semibold text-slate-700">Aksi lanjut:</span>{' '}
                          {item.followUpAction}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <article className="rounded-2xl border border-dashed border-line bg-slate-50 p-6 text-sm leading-6 text-mute">
                Riwayat daily activity 7 hari terakhir belum tersedia.
              </article>
            )}
          </div>
        </section>
      </section>

      <section className="space-y-4">
        <div>
          <p className="section-title">Aksi Lanjutan</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Close, Approval, Export
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            Workflow close harian, approval manager, dan export laporan. Diakses hanya saat dibutuhkan.
          </p>
        </div>
        <details className="group rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Buka panel aksi lanjutan daily activity
          </summary>
          <p className="mt-2 text-sm text-mute">
            Berisi `Close`, `Approval`, dan `Export`.
          </p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <DailyActivitySmartPaste {...sharedToolbarProps} />
              <DailyActivityCloseForm
                canUpdate={canUpdate}
                reviewDbReady={reviewDbReady}
                activitySuggestions={closeSuggestions}
              />
            </div>

            {canApprove ? (
              <DailyActivityManagerApprovalForm
                canApprove={canApprove}
                reviewDbReady={reviewDbReady}
                approvalSuggestions={approvalSuggestions}
                pendingApprovals={pendingApprovals}
              />
            ) : null}

            <DailyActivityExportForm
              canExport={canExport}
              reviewDbReady={reviewDbReady}
              isSuperAdmin={isSuperAdmin}
              divisionOptions={divisionOptions}
              subdivisionMap={subdivisionMap}
              defaultDivision={defaultDivision}
              defaultSubdivision={defaultSubdivision}
            />
          </div>
        </details>
      </section>
    </div>
  )
}
