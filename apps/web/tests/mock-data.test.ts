import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  canAccessPath,
  canPerformAction,
  getDefaultLandingPath,
  getPermissionMatrix,
  getPermissionSummary,
} from '@/lib/access-control'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  authenticateUser,
  authenticateMockUser,
  createSessionToken,
  isBootstrapMockAuthEnabled,
  mockAuthUsers,
  parseSessionToken,
} from '@/lib/auth-session'
import { dashboardSummary } from '@/lib/mock-dashboard'
import { domainPages } from '@/lib/mock-domains'
import { getBatchDetail, getImportBatch, importBatches, transformStages } from '@/lib/mock-import'
import {
  buildSupportLaneReviewSummary,
  canProcessSupportDismantle,
  canUseSupportAction,
  getSupportLanePath,
  getSupportLaneSections,
  normalizeSupportLane,
} from '@/lib/support-lanes'
import {
  SUPPORT_DISMANTLE_METADATA_PREFIXES,
  buildSupportDismantleCloseNote,
  buildSupportDismantleReopenNote,
  buildSupportDismantleTransferNote,
  parseStructuredSupportNote,
} from '@/lib/services/support-dismantle-service'
import { buildDashboardNextActions, getDashboardPageData, getDashboardSummary } from '@/lib/services/dashboard-service'
import { getAuthUsersPageData } from '@/lib/services/auth-user-service'
import { getDomainPageData } from '@/lib/services/domain-service'
import { getImportBatchDetail, getImportOverview } from '@/lib/services/import-service'
import { canAccessWorklistHref, getWorklistPageData, sanitizeWorklistItemForRole } from '@/lib/services/worklist-service'

async function main() {
  const adminBootstrapPassword = randomUUID()
  const supportOpsBootstrapPassword = randomUUID()
  const ttReviewBootstrapPassword = randomUUID()
  process.env.BOOTSTRAP_MOCK_AUTH_CREDENTIALS = JSON.stringify({
    'admin.perkasa': adminBootstrapPassword,
    'support.ops': supportOpsBootstrapPassword,
    'tt.review': ttReviewBootstrapPassword,
  })

  assert.equal(dashboardSummary.customers, 10284)
  assert.ok(dashboardSummary.overdueInvoices > 0, 'Summary billing harus punya angka overdue.')

  assert.equal(importBatches.length, 4)
  assert.equal(transformStages.length, 4)
  assert.equal(getImportBatch('sample-webpsb-user-001')?.sourceSystem, 'WEB_PSB')
  assert.ok(getBatchDetail('sample-webpsb-billing-001')?.rows.length, 'Batch billing harus punya row review.')

  assert.equal(domainPages.support.summaries[0]?.label, 'TT Open')
  assert.equal(domainPages.access.primaryAction.href, '/dashboard')
  assert.equal(domainPages.support.resource, 'support')

  assert.ok(mockAuthUsers.length >= 2, 'Akun review auth minimal harus tersedia dua.')
  const session = authenticateMockUser('admin.perkasa', adminBootstrapPassword)
  assert.ok(session, 'Login mock utama harus valid.')
  assert.equal(authenticateMockUser('admin.perkasa', 'salah'), null)
  delete process.env.ALLOW_BOOTSTRAP_MOCK_AUTH
  const hybridMockLogin = await authenticateUser('admin.perkasa', adminBootstrapPassword)
  assert.ok(hybridMockLogin.session, 'Hybrid auth harus tetap mengizinkan fallback mock.')
  assert.equal(hybridMockLogin.source, 'mock')
  const invalidHybridLogin = await authenticateUser('admin.perkasa', 'salah')
  assert.equal(invalidHybridLogin.session, null)
  assert.deepEqual(parseSessionToken(createSessionToken(session!)), session)
  assert.equal(parseSessionToken('invalid.token.value'), null)
  assert.equal(getDefaultLandingPath('SUPER_ADMIN'), '/dashboard/worklist')
  assert.equal(getDefaultLandingPath('SALES_MARKETING'), '/dashboard/worklist')
  assert.equal(getDefaultLandingPath('CS_OPERATOR'), '/dashboard/worklist')
  assert.equal(getDefaultLandingPath('CS_ADMIN'), '/customers/cs-admin')
  assert.equal(getDefaultLandingPath('FINANCE'), '/finance')
  assert.equal(getDefaultLandingPath('NOC_OPERATOR'), '/support/tt')
  assert.equal(getDefaultLandingPath('FIELD_TECHNICIAN'), '/support/teknisi-psb')
  assert.equal(getDefaultLandingPath('TT_OPERATOR'), '/support/tt')
  assert.equal(getDefaultLandingPath('DIGITAL_CREATOR'), '/dashboard/worklist')
  assert.equal(getDefaultLandingPath('DISMANTLE_OPERATOR'), '/support/dismantle')
  assert.equal(canAccessPath('FINANCE', '/finance'), true)
  assert.equal(canAccessPath('FINANCE', '/billing'), true)
  assert.equal(canAccessPath('FIELD_TECHNICIAN', '/support/teknisi-troubleshoots'), true)
  assert.equal(canAccessPath('FIELD_TECHNICIAN', '/support/teknisi-dismantle'), true)
  assert.equal(canAccessPath('CS_ADMIN', '/customers/cs-admin/odp-port'), true)
  assert.equal(canAccessPath('CS_ADMIN', '/hr'), false)
  assert.equal(canAccessPath('SUPER_ADMIN', '/settings/users'), true)
  assert.equal(canAccessPath('CS_ADMIN', '/settings/users'), false)
  assert.equal(canAccessPath('NOC_OPERATOR', '/support'), true)
  assert.equal(canAccessPath('NOC_OPERATOR', '/support/tt'), true)
  assert.equal(canAccessPath('NOC_OPERATOR', '/import'), false)
  assert.equal(canAccessPath('CS_ADMIN', '/billing'), false)
  assert.equal(canAccessPath('SALES_MARKETING', '/sales'), true)
  assert.equal(getPermissionMatrix('SUPER_ADMIN').length >= 8, true)
  assert.equal(canPerformAction('CS_ADMIN', 'support', 'approve'), true)
  assert.equal(canPerformAction('CS_OPERATOR', 'support', 'approve'), false)
  assert.equal(canPerformAction('NOC_OPERATOR', 'import_center', 'approve'), false)
  assert.equal(canPerformAction('NOC_OPERATOR', 'import_center', 'create'), false)
  assert.equal(canPerformAction('NOC_OPERATOR', 'support', 'create'), true)
  assert.equal(canPerformAction('NOC_OPERATOR', 'billing', 'view'), false)
  assert.equal(canPerformAction('SALES_MARKETING', 'sales', 'create'), true)
  assert.equal(getPermissionSummary('SUPER_ADMIN').manageCount > 0, true)
  assert.equal(
    canUseSupportAction({
      role: 'CS_OPERATOR',
      actionKey: 'isolation-restore',
      canCreate: canPerformAction('CS_OPERATOR', 'support', 'create'),
      canUpdate: canPerformAction('CS_OPERATOR', 'support', 'update'),
      canApprove: canPerformAction('CS_OPERATOR', 'support', 'approve'),
    }),
    true,
    'CS Operator harus tetap bisa menjalankan restore isolir.',
  )
  assert.equal(
    canUseSupportAction({
      role: 'CS_OPERATOR',
      actionKey: 'dismantle-close',
      canCreate: canPerformAction('CS_OPERATOR', 'support', 'create'),
      canUpdate: canPerformAction('CS_OPERATOR', 'support', 'update'),
      canApprove: canPerformAction('CS_OPERATOR', 'support', 'approve'),
    }),
    false,
    'CS Operator tidak boleh menutup dismantle tanpa capability approve.',
  )
  assert.equal(
    canUseSupportAction({
      role: 'CS_ADMIN',
      actionKey: 'dismantle-reopen',
      canCreate: canPerformAction('CS_ADMIN', 'support', 'create'),
      canUpdate: canPerformAction('CS_ADMIN', 'support', 'update'),
      canApprove: canPerformAction('CS_ADMIN', 'support', 'approve'),
    }),
    true,
    'CS Admin harus bisa reopen dismantle karena punya capability approve.',
  )
  assert.equal(
    canUseSupportAction({
      role: 'DISMANTLE_OPERATOR',
      actionKey: 'dismantle-close',
      canCreate: canPerformAction('DISMANTLE_OPERATOR', 'support', 'create'),
      canUpdate: canPerformAction('DISMANTLE_OPERATOR', 'support', 'update'),
      canApprove: canPerformAction('DISMANTLE_OPERATOR', 'support', 'approve'),
    }),
    true,
    'Dismantle Operator harus bisa menutup dismantle walau bukan approver umum.',
  )
  assert.equal(
    canProcessSupportDismantle('CS_ADMIN', canPerformAction('CS_ADMIN', 'support', 'approve')),
    true,
    'CS Admin harus bisa memproses flow dismantle.',
  )
  assert.equal(
    canProcessSupportDismantle('CS_OPERATOR', canPerformAction('CS_OPERATOR', 'support', 'approve')),
    false,
    'CS Operator tidak boleh memproses flow dismantle yang butuh capability sempit.',
  )
  assert.equal(
    canProcessSupportDismantle(
      'DISMANTLE_OPERATOR',
      canPerformAction('DISMANTLE_OPERATOR', 'support', 'approve'),
    ),
    true,
    'Dismantle Operator harus lolos gate proses dismantle walau capability approve umum tidak aktif.',
  )

  const transferAuditNote = buildSupportDismantleTransferNote(session!, '  pelanggan meminta terminasi resmi ')
  assert.match(transferAuditNote, /^\[Transferred to dismantle queue\]/)
  assert.match(transferAuditNote, /pelanggan meminta terminasi resmi$/)

  const reopenAuditNote = buildSupportDismantleReopenNote(session!, '  perlu dibuka ulang setelah verifikasi billing ')
  assert.match(reopenAuditNote, /^\[Reopened via dismantle\]/)
  assert.match(reopenAuditNote, /perlu dibuka ulang setelah verifikasi billing$/)

  const closeAuditNote = buildSupportDismantleCloseNote(session!, {
    closeNote: '  perangkat sudah diambil ',
    fieldPic: '  Budi  ',
    deviceStatus: '  Aman ',
    pickupStatus: '  Sudah pickup ',
    closeOutcome: '  Terminasi selesai ',
    billingDisposition: '  Final invoice tetap berjalan ',
    returnedItemCodes: ['INV-ONT-ZTE-F670L-000301', ' INV-ADP-ZTE-12V-000301 '],
  })
  const parsedCloseAuditNote = parseStructuredSupportNote(closeAuditNote)
  assert.equal(parsedCloseAuditNote.summary, '[Dismantled via web] perangkat sudah diambil')
  assert.equal(
    parsedCloseAuditNote.metadata.get(SUPPORT_DISMANTLE_METADATA_PREFIXES.actor),
    'Super Admin Perkasa (admin.perkasa)',
  )
  assert.equal(parsedCloseAuditNote.metadata.get(SUPPORT_DISMANTLE_METADATA_PREFIXES.fieldPic), 'Budi')
  assert.equal(parsedCloseAuditNote.metadata.get(SUPPORT_DISMANTLE_METADATA_PREFIXES.deviceStatus), 'Aman')
  assert.equal(parsedCloseAuditNote.metadata.get(SUPPORT_DISMANTLE_METADATA_PREFIXES.pickupStatus), 'Sudah pickup')
  assert.equal(parsedCloseAuditNote.metadata.get(SUPPORT_DISMANTLE_METADATA_PREFIXES.closeOutcome), 'Terminasi selesai')
  assert.equal(
    parsedCloseAuditNote.metadata.get(SUPPORT_DISMANTLE_METADATA_PREFIXES.billingDisposition),
    'Final invoice tetap berjalan',
  )
  assert.equal(
    parsedCloseAuditNote.metadata.get(SUPPORT_DISMANTLE_METADATA_PREFIXES.returnedItemCodes),
    'INV-ONT-ZTE-F670L-000301, INV-ADP-ZTE-12V-000301',
  )

  delete process.env.APP_DATA_MODE
  delete process.env.DATABASE_URL
  assert.equal(getDataSourceSnapshot().effectiveMode, 'mock')

  process.env.APP_DATA_MODE = 'review-db'
  delete process.env.DATABASE_URL
  assert.equal(getDataSourceSnapshot().isFallback, true)
  assert.equal(getDataSourceSnapshot().effectiveMode, 'mock')

  process.env.APP_DATA_MODE = 'review-db'
  process.env.DATABASE_URL = 'mysql://root:@127.0.0.1:1/perkasa_review'
  assert.equal(getDataSourceSnapshot().effectiveMode, 'review-db')
  assert.equal(isBootstrapMockAuthEnabled(), false)
  const reviewReadyMockLogin = await authenticateUser('admin.perkasa', adminBootstrapPassword)
  assert.equal(reviewReadyMockLogin.session, null, 'Mock auth tidak boleh fallback diam-diam saat review DB aktif.')
  assert.equal(
    reviewReadyMockLogin.reason,
    'unavailable',
    'Saat review DB dikonfigurasi tetapi koneksi gagal, login harus memberi sinyal auth unavailable.'
  )

  process.env.ALLOW_BOOTSTRAP_MOCK_AUTH = '1'
  assert.equal(isBootstrapMockAuthEnabled(), true)
  const explicitMockLogin = await authenticateUser('admin.perkasa', adminBootstrapPassword)
  assert.ok(explicitMockLogin.session, 'Override eksplisit harus menghidupkan kembali bootstrap mock auth.')
  assert.equal(explicitMockLogin.source, 'mock')
  delete process.env.ALLOW_BOOTSTRAP_MOCK_AUTH

  const dashboardData = await getDashboardPageData(session!)
  assert.equal(dashboardData.summary.customers, 10284)
  assert.equal(dashboardData.source.effectiveMode, 'mock')
  assert.equal(dashboardData.source.isFallback, true)
  assert.equal(dashboardData.roleQueues.length > 0, true)
  assert.equal(dashboardData.worklist.length > 0, true)
  assert.equal((await getDashboardSummary()).source.effectiveMode, 'mock')

  const nocSession = authenticateMockUser('support.ops', supportOpsBootstrapPassword)
  const ttSession = authenticateMockUser('tt.review', ttReviewBootstrapPassword)
  assert.ok(nocSession, 'Akun mock NOC harus valid.')
  assert.ok(ttSession, 'Akun mock TT harus valid.')
  const nocSlaWorklist = await getWorklistPageData(nocSession!, { queue: 'SLA Kritis' })
  assert.ok(nocSlaWorklist.items.some((item) => item.queue === 'SLA Kritis'), 'NOC harus punya bucket SLA Kritis.')
  const nocIsolationWorklist = await getWorklistPageData(nocSession!, { queue: 'Monitoring Isolir' })
  assert.ok(
    nocIsolationWorklist.items.some((item) => item.queue === 'Monitoring Isolir'),
    'NOC harus punya bucket Monitoring Isolir.',
  )
  const ttOverdueWorklist = await getWorklistPageData(ttSession!, { queue: 'Follow Up Overdue' })
  assert.ok(
    ttOverdueWorklist.items.some((item) => item.queue === 'Follow Up Overdue'),
    'TT Operator harus punya bucket Follow Up Overdue.',
  )
  const ttReadyCloseWorklist = await getWorklistPageData(ttSession!, { queue: 'Siap Close' })
  assert.ok(
    ttReadyCloseWorklist.items.some((item) => item.queue === 'Siap Close'),
    'TT Operator harus punya bucket Siap Close.',
  )
  const nocDashboard = await getDashboardPageData(nocSession!)
  assert.deepEqual(
    nocDashboard.roleQueues.map((item) => item.href),
    ['/support/tt?focus=OPEN_TICKETS', '/support/isolations?focus=ACTIVE_ISOLATIONS', '/inventory'],
    'Role queue NOC harus langsung menuju lane atau modul yang benar, bukan support generic.',
  )
  assert.equal(
    nocDashboard.dashboardAlerts.some((item) => item.href.startsWith('/billing')),
    false,
    'Alert billing tidak boleh tampil ke NOC.',
  )
  assert.equal(
    nocDashboard.dashboardAlerts.some((item) => item.href.startsWith('/dashboard/daily-activity')),
    false,
    'Alert approval harian tidak boleh tampil ke role yang tidak punya approval.',
  )
  assert.equal(
    nocDashboard.dashboardAlerts.every((item) => !/billing|invoice|collection/i.test(`${item.domain} ${item.detail} ${item.nextStep}`)),
    true,
    'Narasi billing tidak boleh bocor ke alert dashboard NOC.',
  )
  const nocNextActions = buildDashboardNextActions({
    role: 'NOC_OPERATOR',
    alerts: nocDashboard.dashboardAlerts,
    worklist: nocDashboard.worklist,
    roleQueues: nocDashboard.roleQueues,
  })
  assert.equal(
    nocNextActions.every((item) => !['Masuk Queue', 'Kerjakan Sekarang', 'Buka Agenda'].includes(item.actionLabel)),
    true,
    'Next actions NOC tidak boleh kembali ke label generik setelah dihardening.',
  )
  assert.equal(
    nocNextActions.every((item) => item.href !== '/support'),
    true,
    'Next actions NOC tidak boleh mengarah ke support generic.',
  )
  assert.deepEqual(
    nocDashboard.operationalCards.map((item) => item.key),
    ['NOC'],
    'Operational card NOC harus terkunci ke kartu NOC miliknya.',
  )
  assert.deepEqual(
    nocDashboard.operationalCards.map((item) => item.href),
    ['/support/tt?focus=OPEN_TICKETS'],
    'Kartu operasional NOC harus masuk langsung ke lane TT yang relevan.',
  )
  const nocDashboardWithAllDivision = await getDashboardPageData(nocSession!, {
    month: 7,
    year: 2026,
    division: 'ALL',
  })
  assert.deepEqual(
    nocDashboardWithAllDivision.operationalCards.map((item) => item.key),
    ['NOC'],
    'Manipulasi query division=ALL tidak boleh membuka kartu operasional lintas domain untuk NOC.',
  )
  const ttDashboard = await getDashboardPageData(ttSession!)
  assert.deepEqual(
    ttDashboard.roleQueues.map((item) => item.href),
    ['/support/tt?focus=OPEN_TICKETS', '/support/sla?focus=SLA_OVERDUE'],
    'Role queue TT harus langsung menuju lane TT dan SLA yang relevan.',
  )
  const ttNextActions = buildDashboardNextActions({
    role: 'TT_OPERATOR',
    alerts: ttDashboard.dashboardAlerts,
    worklist: ttDashboard.worklist,
    roleQueues: ttDashboard.roleQueues,
  })
  assert.equal(
    ttNextActions.every((item) => !['Masuk Queue', 'Kerjakan Sekarang', 'Buka Agenda'].includes(item.actionLabel)),
    true,
    'Next actions TT tidak boleh memakai label generik setelah dipindah ke service layer.',
  )
  assert.deepEqual(
    ttDashboard.operationalCards.map((item) => item.key),
    ['TT'],
    'Operational card TT harus terkunci ke kartu Trouble Ticket yang relevan.',
  )
  assert.equal(canAccessWorklistHref('NOC_OPERATOR', '/support/dismantle#support-action-dismantle-close'), false)
  assert.equal(canAccessWorklistHref('NOC_OPERATOR', '/support/sla#support-action-sla-manage'), false)
  assert.equal(canAccessWorklistHref('NOC_OPERATOR', '/support/tt#support-action-ticket-progress'), true)
  const sanitizedNocItem = sanitizeWorklistItemForRole('NOC_OPERATOR', {
    id: 'tt-risk-sanitize-1',
    domain: 'Support',
    title: 'Ticket SLA kritis sanitasi',
    subtitle: 'Perlu kontrol cepat',
    status: 'OVERDUE',
    priority: 'tinggi',
    detail: 'Ticket overdue dan perlu kontrol sekarang.',
    queue: 'SLA Kritis',
    href: '/support/dismantle#support-action-dismantle-close',
    actionLabel: 'Tutup Dismantle',
    handoffLinks: [
      { label: 'Buka Billing', href: '/billing' },
      { label: 'Buka TT', href: '/support/tt?focus=OPEN_TICKETS' },
      { label: 'Buka Dismantle', href: '/support/dismantle' },
    ],
    recommendedActions: {
      owner: 'NOC',
      items: [
        { label: 'Billing', detail: 'Tidak boleh untuk NOC.', href: '/billing' },
        { label: 'Kontrol SLA', detail: 'Tetap boleh untuk NOC.', href: '/support/sla?focus=SLA_OVERDUE' },
      ],
    },
  })
  assert.equal(sanitizedNocItem.href, '/support/sla?focus=SLA_OVERDUE')
  assert.equal(sanitizedNocItem.actionLabel, 'Kontrol SLA')
  assert.deepEqual(
    sanitizedNocItem.handoffLinks?.map((link) => link.label),
    ['Buka TT'],
    'NOC hanya boleh melihat handoff yang masih berada dalam scope lane/support miliknya.',
  )
  assert.deepEqual(
    sanitizedNocItem.recommendedActions?.items.map((action) => action.label),
    ['Kontrol SLA'],
    'Recommended action lintas domain yang tidak boleh diakses harus disaring.',
  )
  const sanitizedSupportNarrativeItem = sanitizeWorklistItemForRole('NOC_OPERATOR', {
    id: 'iso-billing-1',
    domain: 'Support',
    title: 'Restore billing kandidat',
    subtitle: 'Ownership billing',
    status: 'OPEN',
    priority: 'tinggi',
    detail: 'Kasus aktif yang masih perlu sinkronisasi.',
    queue: 'Transfer atau Restore',
    href: '/support/isolations?focus=ACTIVE_ISOLATIONS',
    actionLabel: 'Buka support',
    reason: 'Kasus ini masih berada pada ownership Billing untuk memutuskan restore atau tindak lanjut penagihan.',
    nextAction: 'Pilih apakah Billing memulihkan layanan atau CS/Admin memfinalkan terminate',
    owner: 'Billing / Collection',
    blockingInfo: 'Menunggu keputusan Billing sebelum layanan bisa dipulihkan.',
    correlationSummary: {
      customer: 'PT Demo',
      service: 'SVC-001',
      owner: 'Billing / Collection',
      items: [
        { label: 'Billing', value: 'Perlu keputusan invoice overdue' },
        { label: 'TT SLA', value: 'Normal' },
      ],
    },
    decisionTrail: {
      owner: 'Billing / Collection',
      items: [
        { label: 'Billing review', detail: 'Billing belum memutuskan restore atau hold.' },
        { label: 'Isolir aktif', detail: 'Suspend aktif masih berjalan.' },
      ],
    },
    evidencePanel: {
      owner: 'Billing / Collection',
      items: [
        { label: 'Invoice overdue', detail: 'Masih ada tagihan yang belum diputuskan.' },
        { label: 'Status isolir', detail: 'Pelanggan masih dalam status suspend aktif.' },
      ],
    },
    healthSignal: {
      label: 'Butuh Follow-Up Billing',
      detail: 'Kasus belum aman dipulihkan sebelum Billing menyelesaikan validasi pembayaran.',
    },
    actionOutcomeSummary: {
      owner: 'Billing / Collection',
      items: [
        { label: 'Target hasil', detail: 'Billing menentukan restore atau tindak lanjut tagihan.' },
        { label: 'Fallback', detail: 'Jika Billing menolak restore, eskalasi support tetap berjalan.' },
      ],
    },
  })
  assert.equal(
    sanitizedSupportNarrativeItem.reason,
    'Item ini tetap relevan untuk role Anda, tetapi sebagian konteks lintas tim disembunyikan.',
  )
  assert.equal(
    sanitizedSupportNarrativeItem.nextAction,
    'Buka lane kerja yang tersedia untuk role Anda lalu lanjutkan follow up operasional.',
  )
  assert.equal(sanitizedSupportNarrativeItem.owner, 'Tim terkait')
  assert.equal(
    sanitizedSupportNarrativeItem.blockingInfo,
    'Sebagian blocker berada pada tim lain dan disembunyikan untuk role ini.',
  )
  assert.deepEqual(
    sanitizedSupportNarrativeItem.correlationSummary?.items.map((entry) => entry.label),
    ['TT SLA'],
    'Korelasi lintas-domain yang tidak sesuai role harus dibuang dari panel detail.',
  )
  assert.deepEqual(
    sanitizedSupportNarrativeItem.decisionTrail?.items.map((entry) => entry.label),
    ['Isolir aktif'],
    'Jejak keputusan yang hanya relevan untuk tim lain harus disaring.',
  )
  assert.deepEqual(
    sanitizedSupportNarrativeItem.evidencePanel?.items.map((entry) => entry.label),
    ['Status isolir'],
    'Evidence panel harus menyisakan bukti yang masih relevan untuk role aktif.',
  )
  assert.equal(sanitizedSupportNarrativeItem.healthSignal, undefined)
  assert.equal(sanitizedSupportNarrativeItem.actionOutcomeSummary, undefined)

  const importOverview = await getImportOverview()
  assert.equal(importOverview.overview.items.length, 4)
  assert.equal(importOverview.overview.importedBatches, 1)
  assert.equal(importOverview.overview.items[0]?.sourceFileName?.includes('.'), true)
  assert.equal(importOverview.source.isFallback, true)

  const importDetail = await getImportBatchDetail('sample-webpsb-user-001')
  assert.equal(importDetail.batch?.sourceSystem, 'WEB_PSB')
  assert.ok(importDetail.detail?.rows.length, 'Detail batch harus tersedia dari service layer.')
  assert.equal((importDetail.detail?.actions.length ?? 0) > 0, true)
  assert.equal(importDetail.source.isFallback, true)

  const authUsersPage = await getAuthUsersPageData()
  assert.equal(authUsersPage.users.length >= 2, true)
  assert.equal(authUsersPage.summary.totalUsers >= authUsersPage.summary.activeUsers, true)
  assert.equal(authUsersPage.users[0]?.source.length > 0, true)
  assert.equal(authUsersPage.roleOptions.length > 0, true)
  assert.equal(authUsersPage.branchOptions.length > 0, true)
  assert.equal((authUsersPage.auditItems.length ?? 0) > 0, true)
  assert.equal((authUsersPage.auditItems[0]?.targetUser.length ?? 0) > 0, true)

  const buildTestSession = (role: Parameters<typeof getDefaultLandingPath>[0]) => ({
    username: 'test.user',
    displayName: 'Test User',
    role,
    branchId: 1,
    branchIds: [1],
  })

  const supportDomain = await getDomainPageData('support', buildTestSession('NOC_OPERATOR'))
  assert.equal(supportDomain?.content.resource, 'support')
  assert.equal(supportDomain?.source.effectiveMode, 'mock')
  assert.equal(supportDomain?.capabilities.find((item) => item.action === 'create')?.enabled, true)
  assert.equal(supportDomain?.capabilities.find((item) => item.action === 'approve')?.enabled, false)
  assert.equal((supportDomain?.content.reviewSections?.length ?? 0) >= 4, true)
  assert.equal(supportDomain?.content.reviewSections?.[0]?.rows.length, 3)
  assert.equal(supportDomain?.content.reviewSections?.[2]?.title, 'SLA Trouble Ticket')
  assert.equal(supportDomain?.content.reviewSections?.[3]?.title, 'Histori Dismantle')
  assert.equal(supportDomain?.supportFocus?.defaultLane, 'tt')
  assert.equal(supportDomain?.supportFocus?.selectedLane, null)
  assert.equal(supportDomain?.supportFocus?.activeLane, 'tt')
  assert.equal(supportDomain?.supportFocus?.activeWorkspace.lane, 'tt')
  assert.equal((supportDomain?.supportFocus?.activeWorkspace.actionKeys.length ?? 0) > 0, true)
  assert.equal((supportDomain?.supportFocus?.reviewSummary.totalRows ?? 0) > 0, true)
  assert.equal((supportDomain?.supportFocus?.reviewSummary.topItems.length ?? 0) > 0, true)
  assert.equal((supportDomain?.supportFocus?.visibleSections.length ?? 0) >= 4, true)
  assert.equal(normalizeSupportLane('TT'), 'tt')
  assert.equal(normalizeSupportLane('trouble-ticket'), 'tt')
  assert.equal(normalizeSupportLane('invalid'), null)
  assert.equal(getSupportLanePath('tt'), '/support/tt')
  assert.equal(getSupportLaneSections(supportDomain?.content.reviewSections ?? [], 'tt')[0]?.title, 'Trouble Ticket Open')
  assert.equal(getSupportLaneSections(supportDomain?.content.reviewSections ?? [], 'isolations')[0]?.title, 'Isolir Aktif')
  assert.equal(getSupportLaneSections(supportDomain?.content.reviewSections ?? [], 'dismantle')[0]?.title, 'Histori Dismantle')
  assert.equal(buildSupportLaneReviewSummary(getSupportLaneSections(supportDomain?.content.reviewSections ?? [], 'tt')).dominantStatus.length > 0, true)
  const focusedSupportDomain = await getDomainPageData('support', buildTestSession('DISMANTLE_OPERATOR'), {
    supportLane: 'dismantle',
  })
  assert.equal(focusedSupportDomain?.supportFocus?.defaultLane, 'dismantle')
  assert.equal(focusedSupportDomain?.supportFocus?.selectedLane, 'dismantle')
  assert.equal(focusedSupportDomain?.supportFocus?.activeLane, 'dismantle')
  assert.equal(focusedSupportDomain?.supportFocus?.activeWorkspace.lane, 'dismantle')
  assert.equal(focusedSupportDomain?.supportFocus?.visibleSections[0]?.title, 'Histori Dismantle')
  assert.equal(focusedSupportDomain?.supportFocus?.lanes[0]?.key, 'dismantle')

  const salesDomain = await getDomainPageData('sales', buildTestSession('SALES_MARKETING'))
  assert.equal(salesDomain?.content.resource, 'sales')
  assert.equal((salesDomain?.content.reviewSections?.length ?? 0) >= 5, true)
  assert.equal(salesDomain?.content.reviewSections?.[1]?.title, 'Coverage Terbaru')
  assert.equal(salesDomain?.content.reviewSections?.[2]?.rows.length, 3)
  assert.equal(salesDomain?.content.reviewSections?.[3]?.title, 'Work Order Aktif')
  assert.equal(salesDomain?.content.reviewSections?.[4]?.title, 'Subscription Aktivasi Terbaru')

  const customerDomain = await getDomainPageData('customers', buildTestSession('CS_ADMIN'))
  assert.equal(customerDomain?.content.resource, 'customers')
  const csWorkspaceDashboard = await getDashboardPageData(buildTestSession('CS_ADMIN'))
  assert.equal(
    csWorkspaceDashboard.roleQueues.some((item) => item.href === '/customers/cs-admin/odp-port'),
    false,
    'Role queue CS tidak perlu dipaksa ke route ODP/Port baru.',
  )
  assert.equal((customerDomain?.content.reviewSections?.length ?? 0) > 0, true)
  assert.equal(customerDomain?.content.reviewSections?.[1]?.rows.length, 3)
  assert.equal((customerDomain?.content.reviewSections?.[0]?.rows[0]?.status.length ?? 0) > 0, true)

  const billingDomain = await getDomainPageData('billing', buildTestSession('SUPER_ADMIN'))
  assert.equal(billingDomain?.capabilities.find((item) => item.action === 'export')?.enabled, true)
  assert.equal(billingDomain?.capabilities.find((item) => item.action === 'manage')?.enabled, false)
  assert.equal((billingDomain?.content.reviewSections?.length ?? 0) >= 6, true)
  assert.equal(billingDomain?.content.reviewSections?.[0]?.title, 'Subscription Billing-Ready')
  assert.equal(billingDomain?.content.reviewSections?.[1]?.title, 'Invoice Perlu Tindak Lanjut')
  assert.equal(billingDomain?.content.reviewSections?.[2]?.title, 'Invoice Terbaru')
  assert.equal(billingDomain?.content.reviewSections?.[3]?.title, 'Invoice Dibatalkan Terbaru')
  assert.equal(billingDomain?.content.reviewSections?.[5]?.title, 'Payment Terbaru')

  const inventoryDomain = await getDomainPageData('inventory', buildTestSession('SUPER_ADMIN'))
  assert.equal(inventoryDomain?.content.resource, 'inventory')
  const inventoryTitles = (inventoryDomain?.content.reviewSections ?? []).map((section) => section.title)
  assert.equal(inventoryTitles.length >= 7, true)
  assert.equal(inventoryTitles[0], 'Item Inventory Terbaru')
  assert.equal(inventoryTitles.includes('Stock Movement Terbaru'), true)
  assert.equal(inventoryTitles.includes('Request Inventory Teknisi'), true)
  assert.equal(inventoryTitles.includes('ODP Terbaru'), true)
  assert.equal(inventoryTitles.includes('Port Terpakai'), true)
  assert.equal(inventoryTitles.includes('Device Assignment Terbaru'), true)
  assert.equal(inventoryTitles.includes('Port Bermasalah'), true)
  assert.equal(inventoryTitles.includes('Device Return Terbaru'), true)

  const hrDomain = await getDomainPageData('hr', buildTestSession('SUPER_ADMIN'))
  assert.equal(hrDomain?.content.resource, 'hr')
  const hrTitles = (hrDomain?.content.reviewSections ?? []).map((section) => section.title)
  assert.equal(hrTitles.length >= 4, true)
  assert.equal(hrTitles[0], 'Employee Terbaru')
  assert.equal(hrTitles.includes('Attendance Hari Ini'), true)
  assert.equal(hrTitles.includes('Loan Aktif'), true)
  assert.equal(hrTitles.includes('KPI Bulanan Terbaru'), true)
  assert.equal(hrTitles.includes('Slip Gaji Terbaru'), true)

  console.log('mock-data.test.ts passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
