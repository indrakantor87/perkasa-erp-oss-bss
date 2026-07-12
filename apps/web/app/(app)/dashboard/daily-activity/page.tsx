import { DailyActivityCloseForm } from '@/components/daily-activity-close-form'
import { DailyActivityExportForm } from '@/components/daily-activity-export-form'
import { DailyActivityFilterBar } from '@/components/daily-activity-filter-bar'
import { DailyActivityManagerApprovalForm } from '@/components/daily-activity-manager-approval-form'
import { DailyActivityPlanForm } from '@/components/daily-activity-plan-form'
import { DailyActivitySummaryPanel } from '@/components/daily-activity-summary-panel'
import { DataSourceStatus } from '@/components/data-source-status'
import { canPerformAction } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getRoleMeta } from '@/lib/role-meta'
import { getDailyActivityPageData } from '@/lib/services/daily-activity-service'

export default async function DailyActivityPage({
  searchParams,
}: {
  searchParams?: {
    month?: string
    divisionName?: string
    subdivisionName?: string
    planningLevel?: string
    approvalStatus?: string
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
              Plan pagi, closing sore, approval, dan export dipusatkan dalam satu layar kerja yang lebih ringkas.
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

      <section className="space-y-4">
        <div>
          <p className="section-title">Aksi Daily Activity</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Form operasional
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            Default layar tetap fokus ke ringkasan dan aktivitas. Buka panel ini hanya saat operator perlu menulis aksi.
          </p>
        </div>
        <details className="group rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Buka panel aksi daily activity
          </summary>
          <p className="mt-2 text-sm text-mute">
            Berisi `Plan`, `Close`, `Approval`, dan `Export`.
          </p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <DailyActivityPlanForm
                canCreate={canCreate}
                reviewDbReady={reviewDbReady}
                defaultActivityDate={defaultActivityDate}
                defaultPlanningLevel={defaultPlanningLevel}
                lockOrgFields={lockOrgFields}
                planningLevelOptions={planningLevelOptions}
                divisionOptions={divisionOptions}
                subdivisionMap={subdivisionMap}
                defaultDivision={defaultDivision}
                defaultSubdivision={defaultSubdivision}
              />
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
