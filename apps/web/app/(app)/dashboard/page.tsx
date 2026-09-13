import Link from 'next/link'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { CrossDomainAlerts } from '@/components/dashboard/cross-domain-alerts'
import { DashboardCommandCenter } from '@/components/dashboard/dashboard-command-center'
import { DashboardKpiManagerPanel } from '@/components/dashboard/dashboard-kpi-manager-panel'
import { DashboardNextActions } from '@/components/dashboard/dashboard-next-actions'
import { DashboardProfessionalOverview } from '@/components/dashboard/dashboard-professional-overview'
import { DashboardProcessKpis } from '@/components/dashboard/dashboard-process-kpis'
import { DivisionStructureBoard } from '@/components/dashboard/division-structure-board'
import { DailyActivityApprovalQueue } from '@/components/dashboard/daily-activity-approval-queue'
import { KpiGrid } from '@/components/dashboard/kpi-grid'
import { ModuleGrid } from '@/components/dashboard/module-grid'
import { OperationalDivisionBoard } from '@/components/dashboard/operational-division-board'
import { RoleQueueGrid } from '@/components/dashboard/role-queue-grid'
import { WorklistBoard } from '@/components/dashboard/worklist-board'
import { SimpleBarChart, type SimpleBarDatum } from '@/components/simple-bar-chart'
import { canAccessPath, canPerformAction, getDefaultLandingPath } from '@/lib/access-control-server'
import { DataSourceStatus } from '@/components/data-source-status'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getServerUiLanguage } from '@/lib/ui-language-server'
import { getRoleMeta } from '@/lib/role-meta'
import { listMergedDashboardKpiDefinitions, resolveDashboardKpiManagerScope } from '@/lib/services/dashboard-kpi-service'
import { buildDashboardNextActions, getDashboardPageData } from '@/lib/services/dashboard-service'
import { getDomainPageData } from '@/lib/services/domain-service'
import { buildWorklistHref } from '@/lib/services/worklist-service'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import { getPreferredSupportLane } from '@/lib/support-lanes'
import type { AppRole, DomainReviewRow, DomainReviewSection } from '@/lib/types'
import type { DashboardOperationalDivisionKey } from '@/lib/types'
import { getVisibleModuleCards } from '@/lib/ui-access'
import { PageHeader } from '@/components/page-header'

function parsePositiveNumber(value: string | string[] | undefined, fallback: number) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseDivision(value: string | string[] | undefined): DashboardOperationalDivisionKey {
  const raw = String(Array.isArray(value) ? value[0] : value ?? 'ALL')
    .trim()
    .toUpperCase()

  if (
    raw === 'SALES' ||
    raw === 'CS' ||
    raw === 'NOC' ||
    raw === 'TT' ||
    raw === 'DISMANTLE' ||
    raw === 'DIGITAL' ||
    raw === 'BILLING' ||
    raw === 'HR' ||
    raw === 'INVENTORY'
  ) {
    return raw
  }

  return 'ALL'
}

function getDefaultDivision(role: AppRole): DashboardOperationalDivisionKey {
  switch (role) {
    case 'SALES_MARKETING':
      return 'SALES'
    case 'CS_OPERATOR':
    case 'CS_ADMIN':
      return 'CS'
    case 'NOC_OPERATOR':
      return 'NOC'
    case 'TT_OPERATOR':
      return 'TT'
    case 'DISMANTLE_OPERATOR':
      return 'DISMANTLE'
    case 'DIGITAL_CREATOR':
      return 'DIGITAL'
    default:
      return 'ALL'
  }
}

function buildDashboardCommandLinks(role: AppRole) {
  const links: Array<{ label: string; href: string; tone: 'primary' | 'secondary' }> = []
  const seen = new Set<string>()

  const pushLink = (label: string, href: string, tone: 'primary' | 'secondary') => {
    if (!href || seen.has(href)) {
      return
    }
    seen.add(href)
    links.push({ label, href, tone })
  }

  const landingHref = getDefaultLandingPath(role)
  pushLink(landingHref === '/dashboard' ? 'Buka Dashboard' : 'Masuk Workspace', landingHref, 'primary')

  if (canAccessPath(role, '/dashboard/daily-activity')) {
    pushLink('Buka Daily Activity', '/dashboard/daily-activity', 'secondary')
  }

  if (canAccessPath(role, '/support')) {
    pushLink('Lihat Support', buildSupportLaneHref(getPreferredSupportLane(role)), 'secondary')
  }

  if (canAccessPath(role, '/billing')) {
    pushLink('Lihat Billing', '/billing', 'secondary')
  }

  if (canAccessPath(role, '/sales')) {
    pushLink('Lihat Sales', '/sales', 'secondary')
  }

  if (canAccessPath(role, '/inventory')) {
    pushLink('Lihat Inventory', '/inventory#inventory-overview-hero', 'secondary')
  }

  return links.slice(0, 3)
}

type DashboardRoleProfile = 'executive' | 'control' | 'commercial' | 'service' | 'backoffice'

function resolveDashboardRoleProfile(role: AppRole): DashboardRoleProfile {
  switch (role) {
    case 'OWNER':
      return 'executive'
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return 'control'
    case 'PENJUALAN':
    case 'SALES_MARKETING':
    case 'DIGITAL_CREATOR':
      return 'commercial'
    case 'CS_OPERATOR':
    case 'CS_ADMIN':
    case 'NOC_OPERATOR':
    case 'FIELD_TECHNICIAN':
    case 'TT_OPERATOR':
    case 'DISMANTLE_OPERATOR':
      return 'service'
    default:
      return 'backoffice'
  }
}

function findInventorySection(sections: DomainReviewSection[] | undefined, keyword: string) {
  if (!sections || sections.length === 0) return null
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMetaField(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function countByStatus(rows: DomainReviewRow[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.status.trim() || 'TANPA STATUS'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

function countByMetaPrefix(rows: DomainReviewRow[], prefix: string): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = pickMetaField(row.meta, prefix).trim() || 'TIDAK TERDAFTAR'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

function countByMovementPrimary(rows: DomainReviewRow[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.primary.trim().toUpperCase() || 'TANPA JENIS'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  const preferredOrder = ['IN', 'OUT', 'ADJUSTMENT']
  const entries = Array.from(map.entries()).map(([label, count]) => ({ label, count }))
  return entries.sort((a, b) => {
    const ai = preferredOrder.indexOf(a.label)
    const bi = preferredOrder.indexOf(b.label)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return b.count - a.count
  })
}

function statusGroupRequest(status: string): SimpleBarDatum['tone'] {
  const s = status.trim().toUpperCase()
  if (s.includes('SELESAI') || s.includes('DONE') || s.includes('COMPLETE')) return 'emerald'
  if (s.includes('PENDING')) return 'amber'
  if (s.includes('DIPROSES') || s.includes('PROSES') || s.includes('PROGRESS')) return 'sky'
  if (s.includes('BATAL') || s.includes('CANCEL') || s.includes('REJECT')) return 'rose'
  return 'slate'
}

function statusGroupLoan(status: string): SimpleBarDatum['tone'] {
  const s = status.trim().toUpperCase()
  if (s.includes('DIKEMBALIKAN') || s.includes('RETURNED') || s.includes('SELESAI')) return 'emerald'
  if (s.includes('PARTIAL')) return 'amber'
  if (s.includes('OVERDUE') || s.includes('TERLAMBAT')) return 'rose'
  return 'sky'
}

function toneForMovement(primary: string): SimpleBarDatum['tone'] {
  const s = primary.trim().toUpperCase()
  if (s === 'IN') return 'emerald'
  if (s === 'OUT') return 'sky'
  if (s === 'ADJUSTMENT') return 'violet'
  return 'slate'
}

function buildBarFromKeyValue(
  entries: Array<{ label: string; count: number }>,
  toneResolver?: (label: string) => SimpleBarDatum['tone'],
): SimpleBarDatum[] {
  return entries.map((entry) => ({
    label: entry.label,
    value: entry.count,
    tone: toneResolver ? toneResolver(entry.label) : 'ink',
  }))
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const resolvedSearchParams = (await searchParams) ?? {}
  const now = new Date()
  const month = Math.min(12, Math.max(1, parsePositiveNumber(resolvedSearchParams.month, now.getMonth() + 1)))
  const year = Math.min(2100, Math.max(2024, parsePositiveNumber(resolvedSearchParams.year, now.getFullYear())))
  const roleDivisionFallback = getDefaultDivision(session.role)
  const division =
    typeof resolvedSearchParams.division === 'undefined'
      ? roleDivisionFallback
      : parseDivision(resolvedSearchParams.division)
  const kpiDivisionName = String(resolvedSearchParams.kpiDivisionName ?? '').trim()
  const kpiSubdivisionName = String(resolvedSearchParams.kpiSubdivisionName ?? '').trim()
  const {
    source,
    metrics,
    roleQueues,
    worklist,
    activities,
    dailyActivityApprovalQueue,
    operationalCards,
    dashboardAlerts,
  } =
    await getDashboardPageData(session, {
      month,
      year,
      division,
      kpiDivisionName: kpiDivisionName || undefined,
      kpiSubdivisionName: kpiSubdivisionName || undefined,
    })
  const hasInventoryAccess = canAccessPath(session.role, '/inventory')
  const inventoryPayloadPromise: ReturnType<typeof getDomainPageData> | null = hasInventoryAccess
    ? getDomainPageData('inventory', session, { month, year })
    : null
  const inventoryPayload = inventoryPayloadPromise ? await inventoryPayloadPromise.catch(() => null) : null
  const inventorySections: DomainReviewSection[] = inventoryPayload?.content.reviewSections ?? []
  const inventoryRequestRows = findInventorySection(inventorySections, 'REQUEST INVENTORY')?.rows ?? []
  const inventoryMovementRows = findInventorySection(inventorySections, 'STOCK MOVEMENT')?.rows ?? []
  const inventoryLoanRows = findInventorySection(inventorySections, 'PINJAMAN INVENTORY')?.rows ?? []
  const inventoryCharts = hasInventoryAccess
    ? {
        statusRequest: buildBarFromKeyValue(countByStatus(inventoryRequestRows), statusGroupRequest),
        movementKind: buildBarFromKeyValue(countByMovementPrimary(inventoryMovementRows), toneForMovement),
        subdivRequest: buildBarFromKeyValue(countByMetaPrefix(inventoryRequestRows, 'Sub-divisi: ')),
        statusLoan: buildBarFromKeyValue(countByStatus(inventoryLoanRows), statusGroupLoan),
      }
    : null
  const language = await getServerUiLanguage()
  const roleMeta = getRoleMeta(session.role, language)
  const canApproveDailyActivity = canPerformAction(session.role, 'daily_activity', 'approve')
  const visibleModuleCards = getVisibleModuleCards(session.role)
  const commandCenterLinks = buildDashboardCommandLinks(session.role)
  const dashboardNextActions = buildDashboardNextActions({
    role: session.role,
    alerts: dashboardAlerts,
    worklist,
    roleQueues,
  }).slice(0, 6)
  const roleProfile = resolveDashboardRoleProfile(session.role)
  const showGuidedSteps = roleProfile !== 'executive'
  const showInlineActionPanels = roleProfile === 'control' || roleProfile === 'executive'
  const lockDivisionFilter = session.role !== 'SUPER_ADMIN'
  const sourceSnapshot = getDataSourceSnapshot()
  const reviewDbReady = sourceSnapshot.effectiveMode === 'review-db' && !sourceSnapshot.isFallback
  const managerScope = await resolveDashboardKpiManagerScope(session)
  const initialKpiDivision =
    managerScope.planningLevel === 'SUPER_ADMIN'
      ? kpiDivisionName || managerScope.divisionName || 'Pemasaran dan Pelayanan'
      : managerScope.divisionName || 'Pemasaran dan Pelayanan'
  const initialKpiSubdivision =
    managerScope.planningLevel === 'SUPER_ADMIN'
      ? kpiSubdivisionName || managerScope.subdivisionName || 'Penjualan'
      : managerScope.subdivisionName || 'Penjualan'
  const initialKpiDefinitions = reviewDbReady
    ? await listMergedDashboardKpiDefinitions({
        divisionName: initialKpiDivision,
        subdivisionName: initialKpiSubdivision,
      }).catch(() => [])
    : []
  const worklistHref = buildWorklistHref(session.role)
  const supportLaneHref = canAccessPath(session.role, '/support')
    ? buildSupportLaneHref(getPreferredSupportLane(session.role))
    : null
  const trackingHref = canAccessPath(session.role, '/dashboard/tracking') ? '/dashboard/tracking' : null

  const breadcrumbs = [
    { label: 'Workspace', href: '/dashboard' },
    { label: 'Dasbor Operasional', href: '/dashboard' },
  ]

  const pageActions = (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      {worklistHref ? (
        <Link
          href={worklistHref}
          className="btn-base btn-secondary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-4 text-sm font-medium"
        >
          Lihat Worklist
        </Link>
      ) : null}
      {trackingHref ? (
        <Link
          href={trackingHref}
          className="btn-base btn-ghost focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-4 text-sm font-medium"
        >
          Tracking
        </Link>
      ) : null}
      {supportLaneHref ? (
        <Link
          href={supportLaneHref}
          className="btn-base btn-ghost focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-4 text-sm font-medium"
        >
          Support Lane
        </Link>
      ) : null}
    </div>
  )

  return (
    <div className="content-fade-in space-y-4">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Dasbor Operasional"
        description="Ringkasan ritme kerja, tekanan antrean, dan jalur aksi tercepat untuk peran aktif hari ini."
        actions={pageActions}
      />
      <DashboardCommandCenter
        roleLabel={roleMeta.label}
        roleShortLabel={roleMeta.shortLabel}
        roleTone={roleMeta.tone}
        roleDivision={roleMeta.division}
        roleSubdivision={roleMeta.subdivision}
        roleScope={roleMeta.scope}
        queueCount={roleQueues.length}
        worklistCount={worklist.length}
        moduleCount={visibleModuleCards.length}
        approvalCount={canApproveDailyActivity ? dailyActivityApprovalQueue.totalPending : 0}
        quickLinks={commandCenterLinks}
      />
      <DashboardProfessionalOverview
        metrics={metrics}
        roleQueues={roleQueues}
        worklist={worklist}
        approvalCount={canApproveDailyActivity ? dailyActivityApprovalQueue.totalPending : 0}
        operationalCards={operationalCards}
        roleProfile={roleProfile}
      />

      {hasInventoryAccess && inventoryCharts ? (
        <section id="dashboard-inventory-snapshot" className="scroll-mt-24 space-y-4">
          <div className="panel p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <p className="section-title">Ringkasan GA Inventory</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                  Snapshot operasional gudang di Dasbor Operasional
                </h2>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Panel ini menampilkan snapshot inventory secara langsung di Dasbor Utama agar role GA / Inventory tidak perlu pindah tab untuk
                  membaca angka hari ini. Untuk visualisasi historis (compare periode) dan 8 grafik lengkap, buka dashboard inventory khusus.
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                <span className="badge border-line bg-surfaceMuted text-muteStrong self-start">
                  {inventoryRequestRows.length + inventoryMovementRows.length + inventoryLoanRows.length} row snapshot
                </span>
                <Link
                  href="/inventory#inventory-overview-historical"
                  className="inline-flex items-center rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-accentInk transition hover:bg-accent/90 focus-visible:shadow-focus"
                >
                  Buka Historis Inventory →
                </Link>
              </div>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <article className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total Request Aktif</p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums tracking-tight text-inkStrong">
                  {inventoryRequestRows.length}
                </p>
                <Link
                  href="/inventory/requests"
                  className="mt-2 inline-flex text-xs font-semibold text-accent underline underline-offset-2"
                >
                  Buka queue request →
                </Link>
              </article>
              <article className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total Movement (IN + OUT)</p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums tracking-tight text-inkStrong">
                  {inventoryMovementRows.length}
                </p>
                <Link
                  href="/inventory/movements"
                  className="mt-2 inline-flex text-xs font-semibold text-accent underline underline-offset-2"
                >
                  Buka movements →
                </Link>
              </article>
              <article className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total Pinjaman Aktif</p>
                <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tabular-nums tracking-tight text-inkStrong">
                  {inventoryLoanRows.length}
                </p>
                <Link
                  href="/inventory/loans"
                  className="mt-2 inline-flex text-xs font-semibold text-accent underline underline-offset-2"
                >
                  Buka pinjaman →
                </Link>
              </article>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <SimpleBarChart
                title="Status Request Barang (Snapshot Hari Ini)"
                subtitle="Distribusi request per status untuk tekanan operasional gudang."
                unitLabel="request"
                data={inventoryCharts.statusRequest}
                emptyNote="Belum ada request barang yang tercatat pada periode ini."
              />
              <SimpleBarChart
                title="Stock Movement IN / OUT / ADJUSTMENT"
                subtitle="Komparasi arus barang masuk vs keluar untuk memantau buffer stok."
                unitLabel="transaksi"
                data={inventoryCharts.movementKind}
                emptyNote="Belum ada stock movement yang tercatat."
              />
              <SimpleBarChart
                title="Top Sub-divisi Request Barang"
                subtitle="Sub-divisi mana yang paling banyak mengajukan request barang periode ini."
                unitLabel="request"
                data={inventoryCharts.subdivRequest}
                emptyNote="Belum ada request per sub-divisi yang tercatat."
              />
              <SimpleBarChart
                title="Status Pinjaman Barang"
                subtitle="Pantau pinjaman aktif, partial, dan overdue untuk akuntabilitas aset."
                unitLabel="pinjaman"
                data={inventoryCharts.statusLoan}
                emptyNote="Belum ada pinjaman barang yang tercatat."
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <WorklistBoard items={worklist} viewAllHref={worklistHref} />
        {canApproveDailyActivity && dailyActivityApprovalQueue.totalPending > 0 ? (
          <DailyActivityApprovalQueue queue={dailyActivityApprovalQueue} />
        ) : null}
        <RoleQueueGrid items={roleQueues} />
        <DataSourceStatus source={source} />
      </section>

      <ActivityFeed items={activities} />

      <section className="space-y-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-title">Ringkasan KPI</p>
              <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
                Kartu angka cepat lintas domain
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
                Dipakai sebagai lapisan angka cepat setelah panel visual prioritas, bukan untuk menggantikan tabel kerja utama.
              </p>
            </div>
            <span className="badge border-line bg-surface text-mute">{metrics.length} KPI</span>
          </div>
          <div className="mt-4">
            <KpiGrid items={metrics} />
          </div>
        </div>
        {visibleModuleCards.length > 0 ? (
          <section className="panel p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-title">Shortcut Operasional</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
                  Masuk ke modul yang relevan
                </h2>
                <p className="mt-1 text-sm leading-5 text-mute">
                  Shortcut mengikuti role aktif agar perpindahan dari ringkasan ke modul kerja tetap singkat.
                </p>
              </div>
              <span className="badge border-line bg-surface text-mute">
                {visibleModuleCards.length} modul
              </span>
            </div>
            <div className="mt-4">
              <ModuleGrid items={visibleModuleCards} />
            </div>
          </section>
        ) : null}
        {showGuidedSteps ? (
          <section className="panel p-4">
            <p className="section-title">Panduan Singkat</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
              Ritme baca dashboard yang disarankan
            </h2>
            <div className="mt-4 grid gap-3">
              {[
                {
                  step: '01',
                  title: 'Prioritaskan antrean',
                  detail: 'Mulai dari panel visual prioritas untuk membaca queue dominan dan tekanan kerja hari ini.',
                },
                {
                  step: '02',
                  title: 'Validasi blocker',
                  detail: 'Cek approval, activity feed, dan queue role-aware untuk menemukan hambatan lintas tim.',
                },
                {
                  step: '03',
                  title: 'Eksekusi ke modul',
                  detail: 'Masuk ke modul dari shortcut operasional setelah arah kerja harian sudah jelas.',
                },
              ].map((item) => (
                <article
                  key={item.step}
                  className="rounded-3xl border border-line p-4"
                  style={{
                    background:
                      'linear-gradient(180deg, var(--color-surface) 0%, var(--color-card-subtle) 100%)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-panel text-xs font-semibold tracking-[0.18em] text-surface">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-mute">{item.detail}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      {showInlineActionPanels ? (
        <section className="space-y-4">
          <DashboardNextActions items={dashboardNextActions} />
          <CrossDomainAlerts items={dashboardAlerts} />
        </section>
      ) : null}

      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--color-ink-strong)]">
          Buka panel tambahan dashboard
        </summary>
        <p className="mt-2 text-sm text-mute">
          Berisi panel manajerial dan analitik yang tetap tersedia saat butuh konteks lebih detail.
        </p>
        <div className="mt-4 space-y-4">
          {!showInlineActionPanels ? <DashboardNextActions items={dashboardNextActions} /> : null}
          {!showInlineActionPanels ? <CrossDomainAlerts items={dashboardAlerts} /> : null}
          <OperationalDivisionBoard
            cards={operationalCards}
            metrics={metrics}
            month={month}
            year={year}
            division={division}
            lockDivision={lockDivisionFilter}
            superAdminMode={session.role === 'SUPER_ADMIN'}
          />
          <DashboardProcessKpis
            cards={operationalCards}
            metrics={metrics}
            month={month}
            year={year}
            superAdminMode={session.role === 'SUPER_ADMIN'}
          />
          <DivisionStructureBoard
            activeDivision={roleMeta.division}
            activeSubdivision={roleMeta.subdivision}
            superAdminMode={session.role === 'SUPER_ADMIN'}
          />
          <DashboardKpiManagerPanel
            reviewDbReady={reviewDbReady}
            managerScope={managerScope}
            initialDefinitions={initialKpiDefinitions}
          />
        </div>
      </details>
    </div>
  )
}
