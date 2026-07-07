import assert from 'node:assert/strict'
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
  mockAuthUsers,
  parseSessionToken,
} from '@/lib/auth-session'
import { dashboardSummary } from '@/lib/mock-dashboard'
import { domainPages } from '@/lib/mock-domains'
import { getBatchDetail, getImportBatch, importBatches, transformStages } from '@/lib/mock-import'
import { getDashboardPageData, getDashboardSummary } from '@/lib/services/dashboard-service'
import { getAuthUsersPageData } from '@/lib/services/auth-user-service'
import { getDomainPageData } from '@/lib/services/domain-service'
import { getImportBatchDetail, getImportOverview } from '@/lib/services/import-service'

async function main() {
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
  const session = authenticateMockUser('admin.perkasa', 'Perkasa123!')
  assert.ok(session, 'Login mock utama harus valid.')
  assert.equal(authenticateMockUser('admin.perkasa', 'salah'), null)
  const hybridMockLogin = await authenticateUser('admin.perkasa', 'Perkasa123!')
  assert.ok(hybridMockLogin.session, 'Hybrid auth harus tetap mengizinkan fallback mock.')
  assert.equal(hybridMockLogin.source, 'mock')
  const invalidHybridLogin = await authenticateUser('admin.perkasa', 'salah')
  assert.equal(invalidHybridLogin.session, null)
  assert.deepEqual(parseSessionToken(createSessionToken(session!)), session)
  assert.equal(parseSessionToken('invalid.token.value'), null)
  assert.equal(getDefaultLandingPath('SUPER_ADMIN'), '/dashboard')
  assert.equal(canAccessPath('ADMIN_DIVISI', '/hr'), false)
  assert.equal(canAccessPath('SUPER_ADMIN', '/settings/users'), true)
  assert.equal(canAccessPath('ADMIN_DIVISI', '/settings/users'), false)
  assert.equal(canAccessPath('OPERATOR', '/support'), true)
  assert.equal(canAccessPath('OPERATOR', '/import'), false)
  assert.equal(canAccessPath('ADMIN_DIVISI', '/billing'), true)
  assert.equal(getPermissionMatrix('SUPER_ADMIN').length >= 8, true)
  assert.equal(canPerformAction('ADMIN_DIVISI', 'import_center', 'create'), true)
  assert.equal(canPerformAction('ADMIN_DIVISI', 'import_center', 'approve'), true)
  assert.equal(canPerformAction('OPERATOR', 'import_center', 'approve'), false)
  assert.equal(canPerformAction('OPERATOR', 'import_center', 'create'), false)
  assert.equal(canPerformAction('OPERATOR', 'support', 'create'), true)
  assert.equal(canPerformAction('OPERATOR', 'billing', 'view'), false)
  assert.equal(getPermissionSummary('SUPER_ADMIN').manageCount > 0, true)

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

  const dashboardData = await getDashboardPageData()
  assert.equal(dashboardData.summary.customers, 10284)
  assert.equal(dashboardData.source.effectiveMode, 'mock')
  assert.equal(dashboardData.source.isFallback, true)
  assert.equal((await getDashboardSummary()).source.effectiveMode, 'mock')

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

  const supportDomain = await getDomainPageData('support', 'OPERATOR')
  assert.equal(supportDomain?.content.resource, 'support')
  assert.equal(supportDomain?.source.effectiveMode, 'mock')
  assert.equal(supportDomain?.capabilities.find((item) => item.action === 'create')?.enabled, true)
  assert.equal(supportDomain?.capabilities.find((item) => item.action === 'approve')?.enabled, false)
  assert.equal((supportDomain?.content.reviewSections?.length ?? 0) >= 4, true)
  assert.equal(supportDomain?.content.reviewSections?.[0]?.rows.length, 3)
  assert.equal(supportDomain?.content.reviewSections?.[2]?.title, 'SLA Trouble Ticket')
  assert.equal(supportDomain?.content.reviewSections?.[3]?.title, 'Histori Dismantle')

  const salesDomain = await getDomainPageData('sales', 'ADMIN_DIVISI')
  assert.equal(salesDomain?.content.resource, 'sales')
  assert.equal((salesDomain?.content.reviewSections?.length ?? 0) >= 5, true)
  assert.equal(salesDomain?.content.reviewSections?.[1]?.title, 'Coverage Terbaru')
  assert.equal(salesDomain?.content.reviewSections?.[2]?.rows.length, 3)
  assert.equal(salesDomain?.content.reviewSections?.[3]?.title, 'Work Order Aktif')
  assert.equal(salesDomain?.content.reviewSections?.[4]?.title, 'Subscription Aktivasi Terbaru')

  const customerDomain = await getDomainPageData('customers', 'ADMIN_DIVISI')
  assert.equal(customerDomain?.content.resource, 'customers')
  assert.equal((customerDomain?.content.reviewSections?.length ?? 0) > 0, true)
  assert.equal(customerDomain?.content.reviewSections?.[1]?.rows.length, 3)
  assert.equal((customerDomain?.content.reviewSections?.[0]?.rows[0]?.status.length ?? 0) > 0, true)

  const billingDomain = await getDomainPageData('billing', 'ADMIN_DIVISI')
  assert.equal(billingDomain?.capabilities.find((item) => item.action === 'export')?.enabled, true)
  assert.equal(billingDomain?.capabilities.find((item) => item.action === 'manage')?.enabled, false)
  assert.equal((billingDomain?.content.reviewSections?.length ?? 0) >= 5, true)
  assert.equal(billingDomain?.content.reviewSections?.[0]?.title, 'Subscription Billing-Ready')
  assert.equal(billingDomain?.content.reviewSections?.[1]?.title, 'Invoice Perlu Tindak Lanjut')
  assert.equal(billingDomain?.content.reviewSections?.[2]?.title, 'Invoice Terbaru')
  assert.equal(billingDomain?.content.reviewSections?.[4]?.title, 'Payment Terbaru')

  const inventoryDomain = await getDomainPageData('inventory', 'SUPER_ADMIN')
  assert.equal(inventoryDomain?.content.resource, 'inventory')
  assert.equal((inventoryDomain?.content.reviewSections?.length ?? 0) >= 7, true)
  assert.equal(inventoryDomain?.content.reviewSections?.[0]?.title, 'Item Inventory Terbaru')
  assert.equal(inventoryDomain?.content.reviewSections?.[1]?.title, 'Stock Movement Terbaru')
  assert.equal(inventoryDomain?.content.reviewSections?.[2]?.title, 'ODP Terbaru')
  assert.equal(inventoryDomain?.content.reviewSections?.[3]?.title, 'Port Terpakai')
  assert.equal(inventoryDomain?.content.reviewSections?.[4]?.title, 'Device Assignment Terbaru')
  assert.equal(inventoryDomain?.content.reviewSections?.[5]?.title, 'Port Bermasalah')
  assert.equal(inventoryDomain?.content.reviewSections?.[6]?.title, 'Device Return Terbaru')

  const hrDomain = await getDomainPageData('hr', 'SUPER_ADMIN')
  assert.equal(hrDomain?.content.resource, 'hr')
  assert.equal((hrDomain?.content.reviewSections?.length ?? 0) >= 4, true)
  assert.equal(hrDomain?.content.reviewSections?.[0]?.title, 'Employee Terbaru')
  assert.equal(hrDomain?.content.reviewSections?.[1]?.title, 'Attendance Hari Ini')
  assert.equal(hrDomain?.content.reviewSections?.[2]?.title, 'Loan Aktif')
  assert.equal(hrDomain?.content.reviewSections?.[3]?.title, 'Slip Gaji Terbaru')

  console.log('mock-data.test.ts passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
