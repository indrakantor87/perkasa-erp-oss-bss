import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'
import { CaseActionOutcomeSummaryCard } from '@/components/case-action-outcome-summary'
import { BillingCollectionActionForm } from '@/components/billing-collection-action-form'
import { BillingCollectionResolveForm } from '@/components/billing-collection-resolve-form'
import { CaseDecisionTrailPanel } from '@/components/case-decision-trail'
import { CaseEvidencePanelCard } from '@/components/case-evidence-panel'
import { CaseHealthSignalCard } from '@/components/case-health-signal'
import { CaseNextActionMatrixCard } from '@/components/case-next-action-matrix'
import { CaseCorrelationSummaryPanel } from '@/components/case-correlation-summary'
import { BillingInvoiceGenerateForm } from '@/components/billing-invoice-generate-form'
import { BillingInvoiceStatusForm } from '@/components/billing-invoice-status-form'
import { BillingPaymentForm } from '@/components/billing-payment-form'
import { CustomerCreateForm } from '@/components/customer-create-form'
import { HrAttendanceForm } from '@/components/hr-attendance-form'
import { HrAttendanceFaceConfigForm } from '@/components/hr-attendance-face-config-form'
import { HrAttendanceFaceReviewForm } from '@/components/hr-attendance-face-review-form'
import { HrAttendanceGeofenceForm } from '@/components/hr-attendance-geofence-form'
import { HrAttendanceUpdateForm } from '@/components/hr-attendance-update-form'
import { HrEmployeeArchiveForm } from '@/components/hr-employee-archive-form'
import { HrEmployeeCreateForm } from '@/components/hr-employee-create-form'
import { HrEmployeeKpiForm } from '@/components/hr-employee-kpi-form'
import { HrEmployeeFaceReferenceForm } from '@/components/hr-employee-face-reference-form'
import { HrEmployeeReactivateForm } from '@/components/hr-employee-reactivate-form'
import { HrLoanCreateForm } from '@/components/hr-loan-create-form'
import { HrLoanStatusForm } from '@/components/hr-loan-status-form'
import { HrLoanVoidForm } from '@/components/hr-loan-void-form'
import { HrSalarySlipReleaseForm } from '@/components/hr-salary-slip-release-form'
import { HrSalarySlipForm } from '@/components/hr-salary-slip-form'
import { HrSalarySlipVoidForm } from '@/components/hr-salary-slip-void-form'
import { InventoryNetworkOpsPanel } from '@/components/inventory-network-ops-panel'
import { InventoryItemBarcodePanel } from '@/components/inventory-item-barcode-panel'
import { InventoryLoanOpsPanel } from '@/components/inventory-loan-ops-panel'
import { InventoryRequestOpsPanel } from '@/components/inventory-request-ops-panel'
import { InventoryStockReceiptPanel } from '@/components/inventory-stock-receipt-panel'
import { SalesCoverageCreateForm } from '@/components/sales-coverage-create-form'
import { SalesLeadCreateForm } from '@/components/sales-lead-create-form'
import { SalesOrderCreateForm } from '@/components/sales-order-create-form'
import { SalesSubscriptionActivateForm } from '@/components/sales-subscription-activate-form'
import { SalesSurveyCreateForm } from '@/components/sales-survey-create-form'
import { SalesWorkOrderCreateForm } from '@/components/sales-work-order-create-form'
import { SupportDismantleCloseForm } from '@/components/support-dismantle-close-form'
import { SupportDismantleForm } from '@/components/support-dismantle-form'
import { SupportDismantleReopenForm } from '@/components/support-dismantle-reopen-form'
import { SupportActionFormModal } from '@/components/support-action-form-modal'
import { SupportLaneDetailPanel } from '@/components/support-lane-detail-panel'
import { SupportIsolationForm } from '@/components/support-isolation-form'
import { SupportIsolationRestoreForm } from '@/components/support-isolation-restore-form'
import { SupportTicketCloseForm } from '@/components/support-ticket-close-form'
import { SupportTicketCreateForm } from '@/components/support-ticket-create-form'
import { SupportTicketEscalateForm } from '@/components/support-ticket-escalate-form'
import { SupportTicketProgressForm } from '@/components/support-ticket-progress-form'
import { SupportLaneWorkspacePanel } from '@/components/support-lane-workspace-panel'
import { SupportRoleQueueBoard } from '@/components/support-role-queue-board'
import { SupportSlaForm } from '@/components/support-sla-form'
import { SupportDismantleQueuePanel } from '@/components/support-dismantle-queue-panel'
import { SupportIsolationQueuePanel } from '@/components/support-isolation-queue-panel'
import { SupportSlaQueuePanel } from '@/components/support-sla-queue-panel'
import { SupportTroubleTicketQueuePanel } from '@/components/support-tt-queue-panel'
import { DataSourceStatus } from '@/components/data-source-status'
import { getRoleMeta } from '@/lib/role-meta'
import type { DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { buildSupportLaneHref, getSupportActionAnchorId } from '@/lib/support-action-links'
import { canProcessSupportDismantle, canUseSupportAction, getSupportLanePath } from '@/lib/support-lanes'
import { extractInventoryItemCodeFromScan } from '@/lib/inventory-barcode-utils'
import type {
  AppRole,
  CaseActionOutcomeSummary,
  CaseCorrelationSummary,
  CaseDecisionTrail,
  CaseEvidencePanel,
  CaseHealthSignal,
  CaseRecommendedActionMatrix,
  DomainCapability,
  DomainFormPrefill,
  DomainKey,
  DomainPageContent,
  DataSourceSnapshot,
  DomainReviewRow,
  DomainReviewSection,
  SupportActionLink,
  SupportDrilldownContext,
  SupportFormPrefill,
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

const supportActionCopyMap: Record<
  SupportLaneActionKey,
  {
    label: string
    description: string
  }
> = {
  'ticket-create': {
    label: 'Buat Trouble Ticket',
    description: 'Catat ticket baru begitu gangguan tervalidasi agar antrian TT langsung terbentuk.',
  },
  'ticket-progress': {
    label: 'Update Progress Ticket',
    description: 'Catat PIC, follow-up, dan status kerja terbaru tanpa menutup ticket lebih dulu.',
  },
  'ticket-escalate': {
    label: 'Eskalasi Ticket',
    description: 'Catat eskalasi formal untuk ticket yang overdue atau butuh prioritas lebih tinggi.',
  },
  'ticket-close': {
    label: 'Update atau Close Ticket',
    description: 'Selesaikan tindak lanjut ticket aktif tanpa berpindah lane atau membuka screen lain.',
  },
  'sla-manage': {
    label: 'Kelola Aturan SLA',
    description: 'Samakan prioritas penanganan dengan target waktu yang berlaku untuk ticket aktif.',
  },
  'isolation-create': {
    label: 'Buat Suspend Isolir',
    description: 'Input suspend baru setelah identitas pelanggan, radbox, dan alasan isolir tervalidasi.',
  },
  'isolation-restore': {
    label: 'Proses Restore',
    description: 'Pulihkan pelanggan yang sudah siap recover langsung dari workspace isolir atau dismantle.',
  },
  'dismantle-approve': {
    label: 'Approve Dismantle',
    description: 'Transfer pelanggan dari isolir aktif ke queue dismantle agar terminasi final diproses bertahap.',
  },
  'dismantle-close': {
    label: 'Close Dismantle',
    description: 'Tutup queue dismantle aktif ke histori permanen setelah terminasi lapangan benar-benar selesai.',
  },
  'dismantle-reopen': {
    label: 'Reopen Dismantle',
    description: 'Buka kembali histori dismantle ke queue aktif saat kasus perlu dikoreksi atau dibuka ulang.',
  },
}

type BillingActionKey = 'invoice-generate' | 'invoice-status' | 'collection-action' | 'collection-resolve' | 'payment-entry'

function getBillingActionAnchorId(key: BillingActionKey) {
  return `billing-action-${key}`
}

function getBillingSectionAction(params: {
  sectionTitle: string
  canCreate: boolean
  canUpdate: boolean
}) {
  const title = params.sectionTitle.trim().toUpperCase()

  if (title.includes('SUBSCRIPTION BILLING-READY') && params.canCreate) {
    return {
      key: 'invoice-generate' as const,
      label: 'Generate Invoice',
      description: 'Bentuk invoice dari subscription yang sudah siap billing.',
    }
  }

  if (title.includes('RECONNECT READY QUEUE') && params.canUpdate) {
    return {
      key: 'invoice-status' as const,
      label: 'Proses Reconnect',
      description: 'Ubah status invoice agar keluar dari jalur reconnect yang masih aktif.',
    }
  }

  if (title.includes('SUSPEND READY QUEUE') && params.canUpdate) {
    return {
      key: 'invoice-status' as const,
      label: 'Proses Suspend',
      description: 'Dorong invoice siap suspend ke status operasional yang benar.',
    }
  }

  if (title.includes('COLLECTION FOLLOW UP QUEUE') && params.canUpdate) {
    return {
      key: 'collection-resolve' as const,
      label: 'Resolve Follow Up',
      description: 'Tutup janji bayar atau follow up yang sudah selesai ditangani.',
    }
  }

  if ((title.includes('PROMISE TO PAY QUEUE') || title.includes('PERLU TINDAK LANJUT')) && params.canCreate) {
    return {
      key: 'collection-action' as const,
      label: 'Tindak Collection',
      description: 'Buat action collection baru dari antrean overdue atau janji bayar aktif.',
    }
  }

  if (title.includes('INVOICE') && params.canCreate) {
    return {
      key: 'payment-entry' as const,
      label: 'Catat Payment',
      description: 'Masukkan pembayaran untuk invoice yang sedang dimonitor pada review billing.',
    }
  }

  return null
}

function isBillingSectionAction(
  value: ReturnType<typeof getBillingSectionAction>,
): value is NonNullable<ReturnType<typeof getBillingSectionAction>> {
  return value !== null
}

type SalesActionKey =
  | 'lead-create'
  | 'coverage-create'
  | 'survey-create'
  | 'order-create'
  | 'work-order-create'
  | 'subscription-activate'

function getSalesActionAnchorId(key: SalesActionKey) {
  return `sales-action-${key}`
}

function getSalesSectionAction(params: { sectionTitle: string; canCreate: boolean }) {
  const title = params.sectionTitle.trim().toUpperCase()
  if (!params.canCreate) return null

  if (title.includes('LEAD') && title.includes('COVERAGE')) {
    return {
      key: 'coverage-create' as const,
      label: 'Input Coverage',
      description: 'Lanjutkan lead yang perlu validasi cakupan area.',
    }
  }
  if (title.includes('SURVEY')) {
    return {
      key: 'survey-create' as const,
      label: 'Jadwalkan Survey',
      description: 'Dorong prospek yang sudah lolos coverage ke survey lapangan.',
    }
  }
  if (title.includes('WORK ORDER')) {
    return {
      key: 'work-order-create' as const,
      label: 'Buat Work Order',
      description: 'Turunkan order siap instalasi menjadi work order lapangan.',
    }
  }
  if (title.includes('SUBSCRIPTION') || title.includes('AKTIVASI')) {
    return {
      key: 'subscription-activate' as const,
      label: 'Aktivasi Subscription',
      description: 'Finalisasi order yang sudah siap masuk ke billing aktif.',
    }
  }
  if (title.includes('ORDER')) {
    return {
      key: 'order-create' as const,
      label: 'Buat Order',
      description: 'Konversi lead atau survey yang siap menjadi order operasional.',
    }
  }
  if (title.includes('LEAD')) {
    return {
      key: 'lead-create' as const,
      label: 'Tambah Lead',
      description: 'Catat prospek baru agar pipeline penjualan tetap terisi.',
    }
  }

  return null
}

function isSalesSectionAction(
  value: ReturnType<typeof getSalesSectionAction>,
): value is NonNullable<ReturnType<typeof getSalesSectionAction>> {
  return value !== null
}

type InventoryActionKey =
  | 'item-request'
  | 'request-status'
  | 'stock-receipt'
  | 'item-loan'
  | 'loan-return'
  | 'rack-layout'
  | 'item-create'
  | 'stock-movement'
  | 'odp-create'
  | 'odp-port-assign'
  | 'odp-port-status'
  | 'device-assignment'
  | 'device-return'

function getInventoryActionAnchorId(key: InventoryActionKey) {
  return `inventory-action-${key}`
}

function getInventorySectionAction(params: {
  sectionTitle: string
  canRequestInventory: boolean
  canProcessInventoryRequest: boolean
  canCreate: boolean
  canUpdate: boolean
  isFieldTechnicianInventory: boolean
}) {
  const title = params.sectionTitle.trim().toUpperCase()

  if (title.includes('REQUEST') && params.canProcessInventoryRequest) {
    return {
      key: 'request-status' as const,
      label: 'Proses Request',
      description: 'Tindak request barang teknisi yang masih menunggu proses gudang.',
    }
  }
  if (title.includes('REQUEST') && params.canRequestInventory) {
    return {
      key: 'item-request' as const,
      label: 'Ajukan Request',
      description: 'Buat request barang baru dari kebutuhan lapangan aktif.',
    }
  }
  if (title.includes('LOAN') && params.canUpdate && !params.isFieldTechnicianInventory) {
    return {
      key: 'loan-return' as const,
      label: 'Proses Pengembalian',
      description: 'Tutup pinjaman barang yang sudah kembali ke gudang.',
    }
  }
  if (title.includes('LOAN') && params.canCreate && !params.isFieldTechnicianInventory) {
    return {
      key: 'item-loan' as const,
      label: 'Pinjamkan Barang',
      description: 'Keluarkan alat pinjam pakai dari stok gudang yang tersedia.',
    }
  }
  if ((title.includes('STOCK') || title.includes('RECEIPT')) && params.canCreate && !params.isFieldTechnicianInventory) {
    return {
      key: 'stock-receipt' as const,
      label: 'Barang Masuk',
      description: 'Catat stok masuk sebelum dipakai oleh proses lapangan.',
    }
  }
  if (title.includes('PORT') && params.canUpdate && !params.isFieldTechnicianInventory) {
    return {
      key: 'odp-port-assign' as const,
      label: 'Assign Port',
      description: 'Hubungkan port ODP ke kebutuhan instalasi atau penataan jaringan.',
    }
  }
  if (title.includes('ODP') && params.canCreate && !params.isFieldTechnicianInventory) {
    return {
      key: 'odp-create' as const,
      label: 'Tambah ODP',
      description: 'Lengkapi master ODP sebelum dipakai tim lapangan dan sales.',
    }
  }
  if (title.includes('ASSIGNMENT') && params.canCreate && !params.isFieldTechnicianInventory) {
    return {
      key: 'device-return' as const,
      label: 'Return Perangkat',
      description: 'Tindak perangkat assignment yang sudah selesai dipakai di lapangan.',
    }
  }
  if (title.includes('ITEM') && params.canUpdate && !params.isFieldTechnicianInventory) {
    return {
      key: 'rack-layout' as const,
      label: 'Penataan Rak',
      description: 'Rapikan lokasi rak per item dan siapkan barcode rak untuk pengambilan barang.',
    }
  }
  if (title.includes('ITEM') && params.canCreate && !params.isFieldTechnicianInventory) {
    return {
      key: 'item-create' as const,
      label: 'Tambah Item',
      description: 'Lengkapi item master untuk proses gudang, request, dan assignment.',
    }
  }

  return null
}

function isInventorySectionAction(
  value: ReturnType<typeof getInventorySectionAction>,
): value is NonNullable<ReturnType<typeof getInventorySectionAction>> {
  return value !== null
}

type HrActionKey =
  | 'employee-create'
  | 'employee-archive'
  | 'employee-reactivate'
  | 'kpi-entry'
  | 'face-reference'
  | 'attendance-create'
  | 'face-config'
  | 'face-review'
  | 'geofence-config'
  | 'attendance-update'
  | 'loan-create'
  | 'salary-create'
  | 'loan-status'
  | 'loan-void'
  | 'salary-release'
  | 'salary-void'

function getHrActionAnchorId(key: HrActionKey) {
  return `hr-action-${key}`
}

function getHrSectionAction(params: {
  sectionTitle: string
  canCreate: boolean
  canUpdate: boolean
}) {
  const title = params.sectionTitle.trim().toUpperCase()

  if (title.includes('FACE') && title.includes('REVIEW') && params.canUpdate) {
    return {
      key: 'face-review' as const,
      label: 'Review Verifikasi Wajah',
      description: 'Validasi capture attendance wajah yang masih menunggu keputusan HR.',
    }
  }
  if (title.includes('FACE') && params.canUpdate) {
    return {
      key: 'face-reference' as const,
      label: 'Kelola Referensi Wajah',
      description: 'Perkuat baseline wajah employee untuk akurasi verifikasi attendance.',
    }
  }
  if (title.includes('GEOFENCE') && params.canUpdate) {
    return {
      key: 'geofence-config' as const,
      label: 'Atur Geofence',
      description: 'Sesuaikan titik kerja dan radius attendance sesuai operasi lapangan.',
    }
  }
  if (title.includes('ATTENDANCE') && params.canUpdate) {
    return {
      key: 'attendance-update' as const,
      label: 'Koreksi Attendance',
      description: 'Perbaiki attendance yang perlu koreksi operasional atau penyesuaian data.',
    }
  }
  if (title.includes('ATTENDANCE') && params.canCreate) {
    return {
      key: 'attendance-create' as const,
      label: 'Input Attendance',
      description: 'Catat attendance baru untuk employee yang sudah siap diproses.',
    }
  }
  if ((title.includes('SALARY') || title.includes('PAYROLL')) && params.canUpdate) {
    return {
      key: 'salary-release' as const,
      label: 'Rilis Payroll',
      description: 'Finalisasi slip gaji yang sudah siap dirilis ke employee.',
    }
  }
  if ((title.includes('SALARY') || title.includes('PAYROLL')) && params.canCreate) {
    return {
      key: 'salary-create' as const,
      label: 'Buat Payroll',
      description: 'Susun slip gaji baru dari employee yang sudah siap diproses.',
    }
  }
  if (title.includes('KPI') && params.canUpdate) {
    return {
      key: 'kpi-entry' as const,
      label: 'Input KPI Manual',
      description: 'Catat KPI manual per employee dan bonus performa untuk periode payroll.',
    }
  }
  if (title.includes('LOAN') && title.includes('VOID') && params.canUpdate) {
    return {
      key: 'loan-void' as const,
      label: 'Void Loan',
      description: 'Batalkan pinjaman yang memang tidak boleh lanjut ke proses berikutnya.',
    }
  }
  if (title.includes('LOAN') && params.canUpdate) {
    return {
      key: 'loan-status' as const,
      label: 'Update Loan',
      description: 'Perbarui status pinjaman employee sesuai kondisi operasional terbaru.',
    }
  }
  if (title.includes('LOAN') && params.canCreate) {
    return {
      key: 'loan-create' as const,
      label: 'Buat Loan',
      description: 'Input pinjaman employee baru dari kebutuhan HR yang valid.',
    }
  }
  if (title.includes('REACTIVATE') && params.canUpdate) {
    return {
      key: 'employee-reactivate' as const,
      label: 'Reaktifkan Employee',
      description: 'Kembalikan employee ke status aktif bila sudah siap bekerja kembali.',
    }
  }
  if (title.includes('ARCHIVE') && params.canUpdate) {
    return {
      key: 'employee-archive' as const,
      label: 'Arsipkan Employee',
      description: 'Nonaktifkan employee secara formal tanpa menghapus histori HR.',
    }
  }
  if (title.includes('EMPLOYEE') && params.canCreate) {
    return {
      key: 'employee-create' as const,
      label: 'Tambah Employee',
      description: 'Tambahkan employee baru ke master HR untuk attendance, payroll, dan loan.',
    }
  }

  return null
}

function isHrSectionAction(
  value: ReturnType<typeof getHrSectionAction>,
): value is NonNullable<ReturnType<typeof getHrSectionAction>> {
  return value !== null
}

function getDomainReviewSectionAction(params: {
  domainKey: DomainKey
  sectionTitle: string
  canCreate: boolean
  canUpdate: boolean
  canRequestInventory: boolean
  canProcessInventoryRequest: boolean
  isFieldTechnicianInventory: boolean
}) {
  if (params.domainKey === 'sales') {
    const action = getSalesSectionAction({
      sectionTitle: params.sectionTitle,
      canCreate: params.canCreate,
    })

    return action
      ? {
          label: action.label,
          href: `#${getSalesActionAnchorId(action.key)}`,
        }
      : null
  }

  if (params.domainKey === 'billing') {
    const action = getBillingSectionAction({
      sectionTitle: params.sectionTitle,
      canCreate: params.canCreate,
      canUpdate: params.canUpdate,
    })

    return action
      ? {
          label: action.label,
          href: `#${getBillingActionAnchorId(action.key)}`,
        }
      : null
  }

  if (params.domainKey === 'inventory') {
    const action = getInventorySectionAction({
      sectionTitle: params.sectionTitle,
      canRequestInventory: params.canRequestInventory,
      canProcessInventoryRequest: params.canProcessInventoryRequest,
      canCreate: params.canCreate,
      canUpdate: params.canUpdate,
      isFieldTechnicianInventory: params.isFieldTechnicianInventory,
    })

    return action
      ? {
          label: action.label,
          href: getInventoryWorkspaceHref(
            mapInventoryActionToWorkspaceView(action.key),
            getInventoryActionAnchorId(action.key),
          ),
        }
      : null
  }

  if (params.domainKey === 'hr') {
    const action = getHrSectionAction({
      sectionTitle: params.sectionTitle,
      canCreate: params.canCreate,
      canUpdate: params.canUpdate,
    })

    return action
      ? {
          label: action.label,
          href: `#${getHrActionAnchorId(action.key)}`,
        }
      : null
  }

  return null
}

function pickReviewMetaValue(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.replace(prefix, '').trim() || ''
}

function extractEntityValueFromRowId(rowId: string, prefix: string) {
  const normalizedPrefix = `${prefix.trim().toUpperCase()}-`
  const normalizedRowId = rowId.trim().toUpperCase()
  if (!normalizedRowId.startsWith(normalizedPrefix)) {
    return ''
  }

  return rowId.slice(normalizedPrefix.length).trim()
}

function buildPrefillHref(anchorId: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim()
    if (normalized) {
      searchParams.set(key, normalized)
    }
  })

  const queryText = searchParams.toString()
  return `${queryText ? `?${queryText}` : ''}#${anchorId}`
}

function buildSupportCaseHref(params: {
  lane: SupportLaneKey
  focus: string
  customer?: string
  service?: string
}) {
  return buildSupportLaneHref(params.lane, {
    focus: params.focus,
    customer: params.customer,
    service: params.service,
  })
}

function getReviewRowStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('OVERDUE') || normalized.includes('FAILED') || normalized.includes('BLOCKED')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (normalized.includes('ACTIVE') || normalized.includes('OPEN') || normalized.includes('PROGRESS')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  if (normalized.includes('PENDING') || normalized.includes('REVIEW') || normalized.includes('HOLD')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('DONE') || normalized.includes('CLOSE') || normalized.includes('PAID') || normalized.includes('SUCCESS')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  return 'border-line bg-[var(--color-card-subtle)] text-mute'
}

function getReviewRowMetaHighlights(meta: string[]) {
  return meta.slice(0, 4)
}

type DomainReviewRowAction = {
  label: string
  href: string
  secondaryLabel?: string
  secondaryHref?: string
}

type InventoryWorkspaceView = 'overview' | 'items' | 'requests' | 'movements' | 'network'

function normalizeInventoryWorkspaceView(value: string | undefined): InventoryWorkspaceView {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (normalized === 'items' || normalized === 'requests' || normalized === 'movements' || normalized === 'network') {
    return normalized
  }

  return 'overview'
}

function normalizeInventoryActionKey(value: string | undefined): InventoryActionKey | null {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (!normalized) {
    return null
  }

  const allowed: InventoryActionKey[] = [
    'item-request',
    'request-status',
    'stock-receipt',
    'item-loan',
    'loan-return',
    'rack-layout',
    'item-create',
    'stock-movement',
    'odp-create',
    'odp-port-assign',
    'odp-port-status',
    'device-assignment',
    'device-return',
  ]

  return allowed.includes(normalized as InventoryActionKey) ? (normalized as InventoryActionKey) : null
}

function isInventoryActionInScope(scope: InventoryActionKey, candidate: InventoryActionKey) {
  if ((scope === 'item-request' || scope === 'request-status') && (candidate === 'item-request' || candidate === 'request-status')) {
    return true
  }
  return scope === candidate
}

function getInventoryWorkspaceHref(view: InventoryWorkspaceView, anchorId?: string, params?: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams()
  searchParams.set('inventoryView', view)

  if (anchorId?.startsWith('inventory-action-')) {
    const actionKey = anchorId.replace(/^inventory-action-/, '').trim()
    if (actionKey) {
      searchParams.set('inventoryAction', actionKey)
    }
  }

  Object.entries(params ?? {}).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim()
    if (normalized) {
      searchParams.set(key, normalized)
    }
  })

  const queryText = searchParams.toString()
  return `${queryText ? `?${queryText}` : ''}${anchorId ? `#${anchorId}` : ''}`
}

function mapInventoryActionToWorkspaceView(key: InventoryActionKey): InventoryWorkspaceView {
  switch (key) {
    case 'item-create':
    case 'rack-layout':
      return 'items'
    case 'item-request':
    case 'request-status':
      return 'requests'
    case 'stock-receipt':
    case 'item-loan':
    case 'loan-return':
    case 'stock-movement':
      return 'movements'
    case 'odp-create':
    case 'odp-port-assign':
    case 'odp-port-status':
    case 'device-assignment':
    case 'device-return':
      return 'network'
    default:
      return 'overview'
  }
}

function matchesInventoryWorkspaceView(title: string, view: InventoryWorkspaceView) {
  if (view === 'overview') {
    return true
  }

  const normalized = title.trim().toUpperCase()

  if (view === 'items') {
    return normalized.includes('ITEM') || normalized.includes('REQUEST INVENTORY')
  }

  if (view === 'requests') {
    return normalized.includes('REQUEST')
  }

  if (view === 'movements') {
    return normalized.includes('LOAN') || normalized.includes('PINJAMAN') || normalized.includes('STOCK')
  }

  return (
    normalized.includes('ODP') ||
    normalized.includes('PORT') ||
    normalized.includes('ASSIGNMENT') ||
    normalized.includes('DEVICE')
  )
}

function buildBillingDecisionTrail(row: DomainReviewRow, sectionTitle: string): CaseDecisionTrail | null {
  const title = sectionTitle.trim().toUpperCase()
  const invoiceStatus = pickReviewMetaValue(row.meta, 'Invoice Status: ') || row.status
  const collectionStatus = pickReviewMetaValue(row.meta, 'Collection Status: ')
  const followUpState = pickReviewMetaValue(row.meta, 'Follow Up State: ')
  const actionType = pickReviewMetaValue(row.meta, 'Action Type: ') || row.primary
  const invoiceDue = pickReviewMetaValue(row.meta, 'Invoice Due: ')
  const followUp = pickReviewMetaValue(row.meta, 'Follow Up: ')
  const actionAt = pickReviewMetaValue(row.meta, 'Action At: ')
  const updatedAt = pickReviewMetaValue(row.meta, 'Updated: ')
  const isReconnect = title.includes('RECONNECT') || collectionStatus.toUpperCase() === 'RECONNECT'
  const isSuspend = title.includes('SUSPEND') || pickReviewMetaValue(row.meta, 'Suspend Candidate: ').toUpperCase() === 'YA'
  const isTerminate = title.includes('WRITE OFF') || row.detail.toUpperCase().includes('TERMINASI')

  if (!title.includes('INVOICE') && !title.includes('COLLECTION') && !title.includes('PAYMENT')) {
    return null
  }

  return {
    owner: isReconnect ? 'Billing / Recovery' : isTerminate ? 'Billing + CS & Admin CS' : 'Billing / Collection',
    items: [
      {
        label: 'Status Billing terakhir',
        detail: `Status saat ini ${collectionStatus || invoiceStatus || actionType}.`,
        happenedAt: actionAt || updatedAt || invoiceDue || undefined,
        tone: 'border-violet-200 bg-violet-50 text-violet-700',
      },
      {
        label: 'Kontrol follow-up aktif',
        detail:
          followUpState
            ? `Follow-up terbaca sebagai ${followUpState} dan tetap perlu dijaga agar keputusan layanan tidak melompat terlalu cepat.`
            : isSuspend
              ? 'Billing sedang berada di jalur suspend sehingga Isolir perlu dibaca sebagai dampak layanan yang mungkin aktif.'
              : isReconnect
                ? 'Billing berada di jalur reconnect sehingga fokus utamanya adalah pemulihan layanan, bukan terminate.'
                : 'Billing tetap memegang kontrol awal sebelum kasus diserahkan ke lane support yang lebih spesifik.',
        happenedAt: followUp || invoiceDue || updatedAt || undefined,
        tone: 'border-sky-200 bg-sky-50 text-sky-700',
      },
      {
        label: 'Keputusan lintas domain berikutnya',
        detail: isTerminate
          ? 'Kasus mulai mendekati jalur terminate sehingga CS & Admin CS dan Dismantle perlu ikut membaca disposition terakhir.'
          : isReconnect
            ? 'Kasus mengarah ke restore atau recovery sehingga Isolir menjadi jalur tindak lanjut paling dekat.'
            : 'Kasus tetap perlu diselaraskan ke TT/SLA atau Isolir tergantung dampak operasional pelanggan.',
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
      },
    ],
  }
}

function buildBillingEvidencePanel(row: DomainReviewRow, sectionTitle: string): CaseEvidencePanel | null {
  const title = sectionTitle.trim().toUpperCase()
  const actionNotes = pickReviewMetaValue(row.meta, 'Action Notes: ')
  const invoiceDue = pickReviewMetaValue(row.meta, 'Invoice Due: ')
  const followUp = pickReviewMetaValue(row.meta, 'Follow Up: ')
  const actionAt = pickReviewMetaValue(row.meta, 'Action At: ')
  const updatedAt = pickReviewMetaValue(row.meta, 'Updated: ')
  const service = pickReviewMetaValue(row.meta, 'Service: ')
  const collectionStatus = pickReviewMetaValue(row.meta, 'Collection Status: ')
  const invoiceStatus = pickReviewMetaValue(row.meta, 'Invoice Status: ') || row.status

  if (!title.includes('INVOICE') && !title.includes('COLLECTION') && !title.includes('PAYMENT')) {
    return null
  }

  return {
    owner: title.includes('RECONNECT') ? 'Billing / Recovery' : 'Billing / Collection',
    items: [
      {
        label: 'Catatan action terakhir',
        detail:
          actionNotes && actionNotes !== '-'
            ? actionNotes
            : row.detail,
        happenedAt: actionAt || updatedAt || undefined,
        tone: 'border-violet-200 bg-violet-50 text-violet-700',
      },
      {
        label: 'Batas due atau follow-up',
        detail:
          followUp && followUp !== '-'
            ? `Follow-up aktif tercatat pada ${followUp}.`
            : invoiceDue && invoiceDue !== '-'
              ? `Invoice due tercatat pada ${invoiceDue}.`
              : `Status tagihan saat ini ${collectionStatus || invoiceStatus}.`,
        happenedAt: followUp || invoiceDue || updatedAt || undefined,
        tone: 'border-sky-200 bg-sky-50 text-sky-700',
      },
      {
        label: 'Scope service terkait',
        detail: service ? `Kasus terkait service ${service}.` : 'Service belum terbaca pada row Billing ini.',
        tone: 'border-slate-200 bg-slate-50 text-slate-700',
      },
    ],
  }
}

function buildBillingHealthSignal(row: DomainReviewRow, sectionTitle: string): CaseHealthSignal | null {
  const title = sectionTitle.trim().toUpperCase()
  const collectionStatus = pickReviewMetaValue(row.meta, 'Collection Status: ').toUpperCase()
  const followUpState = pickReviewMetaValue(row.meta, 'Follow Up State: ').toUpperCase()
  const suspendCandidate = pickReviewMetaValue(row.meta, 'Suspend Candidate: ').toUpperCase()
  const actionType = pickReviewMetaValue(row.meta, 'Action Type: ').toUpperCase()
  const isReconnect = title.includes('RECONNECT') || collectionStatus === 'RECONNECT'
  const isTerminate = title.includes('WRITE OFF') || row.detail.toUpperCase().includes('TERMINASI')
  const isSuspend = title.includes('SUSPEND') || suspendCandidate === 'YA'

  if (!title.includes('INVOICE') && !title.includes('COLLECTION') && !title.includes('PAYMENT')) {
    return null
  }

  if (isReconnect) {
    return {
      label: 'Aman Direstore',
      detail:
        'Billing sudah bergerak ke jalur recovery atau reconnect, sehingga kasus paling dekat untuk dibaca sebagai kandidat restore layanan.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (isTerminate || actionType === 'WRITE_OFF') {
    return {
      label: 'Siap Terminate',
      detail:
        'Kasus sudah mendekati jalur terminate atau write-off sehingga CS & Admin CS dan Dismantle perlu ikut membaca keputusan akhir.',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
    }
  }

  if (isSuspend || followUpState === 'OVERDUE' || followUpState === 'SCHEDULED') {
    return {
      label: 'Butuh Follow-Up Billing',
      detail:
        'Billing masih menjadi domain utama yang harus menutup follow-up sebelum kasus aman bergerak ke restore atau terminate.',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
    }
  }

  return {
    label: 'Perlu Review Supervisor',
    detail:
      'Sinyal kasus belum cukup tegas untuk masuk ke restore atau terminate, sehingga supervisor dan Billing tetap perlu membaca konteks lintas domain.',
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  }
}

function buildBillingRecommendedActionMatrix(
  row: DomainReviewRow,
  sectionTitle: string,
  rowAction: DomainReviewRowAction | null,
): CaseRecommendedActionMatrix | null {
  const title = sectionTitle.trim().toUpperCase()
  const customerName = pickReviewMetaValue(row.meta, 'Customer: ') || row.secondary
  const serviceNo = pickReviewMetaValue(row.meta, 'Service: ')
  const collectionStatus = pickReviewMetaValue(row.meta, 'Collection Status: ').toUpperCase()
  const followUpState = pickReviewMetaValue(row.meta, 'Follow Up State: ').toUpperCase()
  const suspendCandidate = pickReviewMetaValue(row.meta, 'Suspend Candidate: ').toUpperCase()
  const actionType = pickReviewMetaValue(row.meta, 'Action Type: ').toUpperCase()
  const isReconnect = title.includes('RECONNECT') || collectionStatus === 'RECONNECT'
  const isTerminate = title.includes('WRITE OFF') || row.detail.toUpperCase().includes('TERMINASI')
  const isSuspend = title.includes('SUSPEND') || suspendCandidate === 'YA'
  const preferSla = followUpState === 'OVERDUE'

  if (!title.includes('INVOICE') && !title.includes('COLLECTION') && !title.includes('PAYMENT')) {
    return null
  }

  const supportLink = isReconnect || isSuspend
    ? {
        label: rowAction?.secondaryLabel || 'Buka Isolir Terkait',
        detail: isReconnect
          ? 'Pastikan recovery di Billing sinkron dengan kasus isolir aktif agar restore tidak kehilangan konteks layanan.'
          : 'Baca isolir aktif untuk memastikan suspend atau hold billing benar-benar sesuai kondisi layanan pelanggan.',
        href:
          rowAction?.secondaryHref ||
          buildSupportCaseHref({
            lane: 'isolations',
            focus: 'ACTIVE_ISOLATIONS',
            customer: customerName,
            service: serviceNo,
          }),
        tone: isReconnect
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
      }
    : isTerminate || actionType === 'WRITE_OFF'
      ? {
          label: rowAction?.secondaryLabel || 'Buka Dismantle Terkait',
          detail: 'Sambungkan keputusan write-off atau terminate Billing dengan queue CS & Admin CS yang akan menutup kasus di lapangan.',
          href:
            rowAction?.secondaryHref ||
            buildSupportCaseHref({
              lane: 'dismantle',
              focus: 'RECENT_DISMANTLE',
              customer: customerName,
              service: serviceNo,
            }),
          tone: 'border-rose-200 bg-rose-50 text-rose-700',
        }
      : {
          label: rowAction?.secondaryLabel || (preferSla ? 'Buka SLA Terkait' : 'Buka TT Terkait'),
          detail: preferSla
            ? 'Pantau tekanan SLA agar follow-up collection tidak berjalan tanpa konteks gangguan layanan yang masih aktif.'
            : 'Buka ticket support terkait untuk membaca dampak teknis sebelum keputusan Billing diteruskan.',
          href:
            rowAction?.secondaryHref ||
            buildSupportCaseHref({
              lane: preferSla ? 'sla' : 'tt',
              focus: preferSla ? 'SLA_OVERDUE' : 'OPEN_TICKETS',
              customer: customerName,
              service: serviceNo,
            }),
          tone: preferSla
            ? 'border-orange-200 bg-orange-50 text-orange-700'
            : 'border-sky-200 bg-sky-50 text-sky-700',
        }

  const primaryAction = rowAction
    ? {
        label: rowAction.label,
        detail: isReconnect
          ? 'Gunakan action Billing ini untuk mengunci keputusan recovery sebelum layanan benar-benar direstore.'
          : isTerminate || actionType === 'WRITE_OFF'
            ? 'Tegaskan disposition akhir Billing agar terminate tidak berhenti di tengah antara collection dan penutupan lapangan.'
            : isSuspend || followUpState === 'OVERDUE' || followUpState === 'SCHEDULED'
              ? 'Selesaikan follow-up Billing terlebih dulu supaya jalur suspend, restore, atau terminate punya dasar keputusan yang jelas.'
              : 'Perbarui status Billing agar supervisor dan lane support membaca keputusan yang sama.',
        href: rowAction.href,
        tone: isReconnect
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : isTerminate || actionType === 'WRITE_OFF'
            ? 'border-violet-200 bg-violet-50 text-violet-700'
            : 'border-violet-200 bg-violet-50 text-violet-700',
      }
    : {
        label: 'Buka Antrean Billing',
        detail: 'Mulai dari review Billing untuk memastikan status invoice, collection, dan follow-up tidak tertinggal.',
        href: '/billing',
        tone: 'border-violet-200 bg-violet-50 text-violet-700',
      }

  const reviewAction = {
    label: isReconnect ? 'Audit Recovery Billing' : isTerminate ? 'Audit Disposition Billing' : 'Review Antrean Billing',
    detail: isReconnect
      ? 'Periksa invoice, payment, dan follow-up agar reconnect benar-benar siap tanpa blocker administratif.'
      : isTerminate
        ? 'Pastikan write-off, tagihan akhir, dan catatan customer sinkron sebelum kasus ditutup permanen.'
        : 'Baca kembali meta Billing, due date, dan follow-up agar keputusan lintas lane tetap satu arah.',
    href: '/billing',
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  const items = [primaryAction, supportLink, reviewAction].filter(
    (item, index, array) => array.findIndex((candidate) => candidate.href === item.href && candidate.label === item.label) === index,
  )

  return {
    owner: isReconnect ? 'Billing / Recovery' : isTerminate ? 'Billing + CS & Admin CS' : 'Billing / Collection',
    items,
  }
}

function buildBillingActionOutcomeSummary(
  row: DomainReviewRow,
  sectionTitle: string,
): CaseActionOutcomeSummary | null {
  const title = sectionTitle.trim().toUpperCase()
  const collectionStatus = pickReviewMetaValue(row.meta, 'Collection Status: ').toUpperCase()
  const followUpState = pickReviewMetaValue(row.meta, 'Follow Up State: ').toUpperCase()
  const suspendCandidate = pickReviewMetaValue(row.meta, 'Suspend Candidate: ').toUpperCase()
  const actionType = pickReviewMetaValue(row.meta, 'Action Type: ').toUpperCase()
  const isReconnect = title.includes('RECONNECT') || collectionStatus === 'RECONNECT'
  const isTerminate = title.includes('WRITE OFF') || row.detail.toUpperCase().includes('TERMINASI')
  const isSuspend = title.includes('SUSPEND') || suspendCandidate === 'YA'

  if (!title.includes('INVOICE') && !title.includes('COLLECTION') && !title.includes('PAYMENT')) {
    return null
  }

  if (isReconnect) {
    return {
      owner: 'Billing / Recovery',
      items: [
        {
          label: 'Target Hasil',
          detail: 'Billing mengunci recovery atau reconnect sehingga kasus siap dibaca sebagai kandidat restore layanan.',
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        },
        {
          label: 'Sinyal Berhasil',
          detail: 'Tagihan, payment, dan follow-up tidak lagi menjadi blocker administratif untuk pemulihan layanan.',
          tone: 'border-violet-200 bg-violet-50 text-violet-700',
        },
        {
          label: 'Fallback',
          detail: 'Jika recovery gagal, kembalikan kasus ke review Billing yang lebih ketat atau arahkan ke terminate sesuai disposition baru.',
          tone: 'border-amber-200 bg-amber-50 text-amber-700',
        },
      ],
    }
  }

  if (isTerminate || actionType === 'WRITE_OFF') {
    return {
      owner: 'Billing + CS & Admin CS',
      items: [
        {
          label: 'Target Hasil',
          detail: 'Disposition Billing cukup kuat untuk diteruskan ke terminate dan tidak berhenti di antara collection dan close lapangan.',
          tone: 'border-rose-200 bg-rose-50 text-rose-700',
        },
        {
          label: 'Sinyal Berhasil',
          detail: 'Write-off atau keputusan akhir pelanggan sudah sinkron sehingga CS & Admin CS dapat menutup lifecycle tanpa bolak-balik review.',
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        },
        {
          label: 'Fallback',
          detail: 'Jika disposition belum matang, tahan dulu close akhir dan bawa kembali ke antrean Billing atau supervisor untuk keputusan final.',
          tone: 'border-violet-200 bg-violet-50 text-violet-700',
        },
      ],
    }
  }

  if (isSuspend || followUpState === 'OVERDUE' || followUpState === 'SCHEDULED') {
    return {
      owner: 'Billing / Collection',
      items: [
        {
          label: 'Target Hasil',
          detail: 'Follow-up Billing selesai dengan arah keputusan yang jelas: tetap suspend, siap restore, atau naik ke terminate.',
          tone: 'border-violet-200 bg-violet-50 text-violet-700',
        },
        {
          label: 'Sinyal Berhasil',
          detail: 'Operator tidak lagi menebak lane berikutnya karena status follow-up dan dampak layanan sudah sinkron.',
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        },
        {
          label: 'Fallback',
          detail: 'Jika follow-up tetap abu-abu, eskalasi ke supervisor atau baca TT/SLA dan isolir terkait sebelum memaksa keputusan layanan.',
          tone: 'border-slate-200 bg-slate-50 text-slate-700',
        },
      ],
    }
  }

  return {
    owner: 'Billing / Collection',
    items: [
      {
        label: 'Target Hasil',
        detail: 'Billing dan supervisor mencapai pembacaan kasus yang sama sebelum jalur restore atau terminate dipilih.',
        tone: 'border-slate-200 bg-slate-50 text-slate-700',
      },
      {
        label: 'Sinyal Berhasil',
        detail: 'Meta review, due date, dan action type sudah cukup jelas untuk diteruskan ke lane support yang paling relevan.',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      },
      {
        label: 'Fallback',
        detail: 'Jika konteks masih lemah, tahan keputusan besar dan lanjutkan audit Billing lebih dulu.',
        tone: 'border-violet-200 bg-violet-50 text-violet-700',
      },
    ],
  }
}

function buildBillingCorrelationSummary(row: DomainReviewRow, sectionTitle: string): CaseCorrelationSummary | null {
  const title = sectionTitle.trim().toUpperCase()
  const invoiceStatus = pickReviewMetaValue(row.meta, 'Invoice Status: ').toUpperCase() || row.status.trim().toUpperCase()
  const collectionStatus = pickReviewMetaValue(row.meta, 'Collection Status: ').toUpperCase()
  const followUpState = pickReviewMetaValue(row.meta, 'Follow Up State: ').toUpperCase()
  const actionType = pickReviewMetaValue(row.meta, 'Action Type: ').toUpperCase() || row.primary.trim().toUpperCase()
  const customer = pickReviewMetaValue(row.meta, 'Customer: ') || row.secondary
  const service = pickReviewMetaValue(row.meta, 'Service: ')
  const isReconnect = title.includes('RECONNECT') || collectionStatus === 'RECONNECT'
  const isSuspend = title.includes('SUSPEND') || pickReviewMetaValue(row.meta, 'Suspend Candidate: ').toUpperCase() === 'YA'
  const isTerminate = title.includes('WRITE OFF') || row.detail.toUpperCase().includes('TERMINASI')

  if (!customer && !service && !title.includes('INVOICE') && !title.includes('COLLECTION')) {
    return null
  }

  return {
    customer,
    service: service || undefined,
    owner: isReconnect ? 'Billing / Recovery' : isTerminate ? 'Billing + CS & Admin CS' : 'Billing / Collection',
    items: [
      {
        label: 'Billing',
        value: collectionStatus || invoiceStatus || actionType || 'Perlu review',
        tone: 'border-violet-200 bg-violet-50 text-violet-700',
      },
      {
        label: 'Isolir',
        value: isReconnect ? 'Siap restore' : isSuspend ? 'Potensi aktif' : 'Monitor',
        tone: 'border-amber-200 bg-amber-50 text-amber-700',
      },
      {
        label: 'TT/SLA',
        value: followUpState === 'OVERDUE' ? 'Perlu kontrol SLA' : 'Cek ticket terkait',
        tone: 'border-sky-200 bg-sky-50 text-sky-700',
      },
      {
        label: 'Dismantle',
        value: isTerminate ? 'Review terminate' : isReconnect ? 'Belum aktif' : 'Belum prioritas',
        tone: 'border-rose-200 bg-rose-50 text-rose-700',
      },
      {
        label: 'Owner Aktif',
        value: isReconnect ? 'Billing / Recovery' : isTerminate ? 'Billing + CS & Admin CS' : 'Billing / Collection',
        tone: 'border-slate-200 bg-slate-50 text-slate-700',
      },
    ],
  }
}

function resolveSuggestionByTokens(suggestions: string[], ...tokens: Array<string | undefined>) {
  const normalizedTokens = tokens.map((item) => String(item ?? '').trim().toUpperCase()).filter(Boolean)
  if (!normalizedTokens.length) {
    return suggestions[0] ?? ''
  }

  return (
    suggestions.find((item) => {
      const normalizedItem = item.trim().toUpperCase()
      return normalizedTokens.some(
        (token) =>
          normalizedItem === token ||
          normalizedItem.startsWith(`${token} |`) ||
          normalizedItem.includes(`| ${token} |`) ||
          normalizedItem.includes(`| ${token}`) ||
          normalizedItem.includes(token),
      )
    }) ??
    suggestions[0] ??
    ''
  )
}

function getDomainReviewRowAction(params: {
  domainKey: DomainKey
  sectionTitle: string
  row: DomainReviewRow
  canCreate: boolean
  canUpdate: boolean
  canRequestInventory: boolean
  canProcessInventoryRequest: boolean
  isFieldTechnicianInventory: boolean
}): DomainReviewRowAction | null {
  const title = params.sectionTitle.trim().toUpperCase()
  const rowStatus = params.row.status.trim().toUpperCase()
  const collectionStatus = pickReviewMetaValue(params.row.meta, 'Collection Status: ').toUpperCase()
  const followUpState = pickReviewMetaValue(params.row.meta, 'Follow Up State: ').toUpperCase()
  const suspendCandidate = pickReviewMetaValue(params.row.meta, 'Suspend Candidate: ').toUpperCase()
  const actionType = pickReviewMetaValue(params.row.meta, 'Action Type: ').toUpperCase()
  const orderId = pickReviewMetaValue(params.row.meta, 'Order ID: ')
  const orderCode = pickReviewMetaValue(params.row.meta, 'Order: ')
  const customerName = pickReviewMetaValue(params.row.meta, 'Customer: ') || params.row.secondary
  const serviceNo =
    pickReviewMetaValue(params.row.meta, 'Service: ') || (title.includes('SUBSCRIPTION BILLING-READY') ? params.row.primary : '')

  if (params.domainKey === 'sales' && params.canCreate) {
    if (title.includes('WORK ORDER') || rowStatus.includes('WORK_ORDER')) {
      return {
        label: 'Lanjutkan WO',
        href: buildPrefillHref(getSalesActionAnchorId('work-order-create'), {
          order: orderCode || orderId || params.row.primary,
        }),
      }
    }
    if (title.includes('SUBSCRIPTION') || title.includes('AKTIVASI') || rowStatus.includes('ACTIV')) {
      return {
        label: 'Aktivasi',
        href: buildPrefillHref(getSalesActionAnchorId('subscription-activate'), {
          order: orderCode || orderId || params.row.primary,
        }),
      }
    }
    if (title.includes('ORDER') || rowStatus.includes('ORDER')) {
      return {
        label: 'Proses Order',
        href: buildPrefillHref(getSalesActionAnchorId('order-create'), {
          lead: extractEntityValueFromRowId(params.row.id, 'LEAD') || params.row.primary,
          order: orderId || params.row.primary,
        }),
      }
    }
    if (title.includes('SURVEY') || rowStatus.includes('SURVEY')) {
      return {
        label: 'Proses Survey',
        href: buildPrefillHref(getSalesActionAnchorId('survey-create'), {
          lead: extractEntityValueFromRowId(params.row.id, 'LEAD') || params.row.primary,
        }),
      }
    }
    if (title.includes('COVERAGE') || rowStatus.includes('COVERAGE')) {
      return {
        label: 'Proses Coverage',
        href: buildPrefillHref(getSalesActionAnchorId('coverage-create'), {
          lead: extractEntityValueFromRowId(params.row.id, 'LEAD') || params.row.primary,
        }),
      }
    }
    if (title.includes('LEAD') || rowStatus.includes('LEAD')) {
      return {
        label: 'Tindak Lead',
        href: buildPrefillHref(getSalesActionAnchorId('lead-create'), {
          lead: extractEntityValueFromRowId(params.row.id, 'LEAD') || params.row.primary,
        }),
      }
    }
  }

  if (params.domainKey === 'billing') {
    if (params.canUpdate && (title.includes('RECONNECT') || collectionStatus === 'RECONNECT')) {
      return {
        label: 'Proses Reconnect',
        href: buildPrefillHref(getBillingActionAnchorId('invoice-status'), { invoice: params.row.primary }),
        secondaryLabel: 'Buka Isolir Terkait',
        secondaryHref: buildSupportCaseHref({
          lane: 'isolations',
          focus: 'ACTIVE_ISOLATIONS',
          customer: customerName,
          service: serviceNo,
        }),
      }
    }
    if (params.canUpdate && (title.includes('SUSPEND') || suspendCandidate === 'YA')) {
      return {
        label: 'Proses Suspend',
        href: buildPrefillHref(getBillingActionAnchorId('invoice-status'), { invoice: params.row.primary }),
        secondaryLabel: 'Buka Isolir Terkait',
        secondaryHref: buildSupportCaseHref({
          lane: 'isolations',
          focus: 'ACTIVE_ISOLATIONS',
          customer: customerName,
          service: serviceNo,
        }),
      }
    }
    if (params.canUpdate && (title.includes('COLLECTION FOLLOW UP') || followUpState === 'OVERDUE' || followUpState === 'SCHEDULED')) {
      const preferSla = followUpState === 'OVERDUE'
      return {
        label: 'Resolve Follow Up',
        href: buildPrefillHref(getBillingActionAnchorId('collection-resolve'), { invoice: params.row.primary }),
        secondaryLabel: preferSla ? 'Buka SLA Terkait' : 'Buka TT Terkait',
        secondaryHref: buildSupportCaseHref({
          lane: preferSla ? 'sla' : 'tt',
          focus: preferSla ? 'SLA_OVERDUE' : 'OPEN_TICKETS',
          customer: customerName,
          service: serviceNo,
        }),
      }
    }
    if (params.canCreate && (title.includes('PROMISE TO PAY') || title.includes('PERLU TINDAK LANJUT'))) {
      const preferDismantle = title.includes('ONE-TIME') && (actionType === 'WRITE_OFF' || rowStatus === 'OVERDUE')
      return {
        label: 'Tindak Collection',
        href: buildPrefillHref(getBillingActionAnchorId('collection-action'), { invoice: params.row.primary }),
        secondaryLabel: preferDismantle ? 'Buka Dismantle Terkait' : 'Buka TT Terkait',
        secondaryHref: buildSupportCaseHref({
          lane: preferDismantle ? 'dismantle' : 'tt',
          focus: preferDismantle ? 'RECENT_DISMANTLE' : 'OPEN_TICKETS',
          customer: customerName,
          service: serviceNo,
        }),
      }
    }
    if (params.canCreate && title.includes('SUBSCRIPTION BILLING-READY')) {
      return {
        label: 'Generate Invoice',
        href: buildPrefillHref(getBillingActionAnchorId('invoice-generate'), { service: params.row.primary }),
        secondaryLabel: 'Buka TT Terkait',
        secondaryHref: buildSupportCaseHref({
          lane: 'tt',
          focus: 'OPEN_TICKETS',
          customer: customerName,
          service: serviceNo || params.row.primary,
        }),
      }
    }
    if (params.canCreate && title.includes('INVOICE')) {
      const preferDismantle = title.includes('ONE-TIME') && params.row.detail.toUpperCase().includes('TERMINASI')
      return {
        label: 'Catat Payment',
        href: buildPrefillHref(getBillingActionAnchorId('payment-entry'), { invoice: params.row.primary }),
        secondaryLabel: preferDismantle ? 'Buka Dismantle Terkait' : 'Buka Isolir Terkait',
        secondaryHref: buildSupportCaseHref({
          lane: preferDismantle ? 'dismantle' : 'isolations',
          focus: preferDismantle ? 'RECENT_DISMANTLE' : 'ACTIVE_ISOLATIONS',
          customer: customerName,
          service: serviceNo,
        }),
      }
    }
  }

  if (params.domainKey === 'inventory') {
    if (title.includes('REQUEST') && params.canProcessInventoryRequest) {
      return {
        label: 'Proses Request',
        href: getInventoryWorkspaceHref('requests', getInventoryActionAnchorId('request-status'), {
          request: extractEntityValueFromRowId(params.row.id, 'REQ') || params.row.primary,
        }),
      }
    }
    if (title.includes('REQUEST') && params.canRequestInventory) {
      return {
        label: 'Ajukan Request',
        href: getInventoryWorkspaceHref('requests', getInventoryActionAnchorId('item-request')),
      }
    }
    if ((title.includes('RETURN') || title.includes('DEVICE RETURN')) && params.canCreate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Return Perangkat',
        href: getInventoryWorkspaceHref('network', getInventoryActionAnchorId('device-return')),
      }
    }
    if (title.includes('ASSIGNMENT') && params.canCreate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Assign Perangkat',
        href: getInventoryWorkspaceHref('network', getInventoryActionAnchorId('device-assignment')),
      }
    }
    if (title.includes('LOAN') && params.canUpdate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Proses Pengembalian',
        href: getInventoryWorkspaceHref('movements', getInventoryActionAnchorId('loan-return'), {
          loan: extractEntityValueFromRowId(params.row.id, 'LOAN') || params.row.primary,
        }),
      }
    }
    if (title.includes('LOAN') && params.canCreate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Pinjamkan Barang',
        href: getInventoryWorkspaceHref('movements', getInventoryActionAnchorId('item-loan')),
      }
    }
    if (title.includes('PORT') && params.canUpdate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Atur Port',
        href: getInventoryWorkspaceHref('network', getInventoryActionAnchorId('odp-port-status')),
      }
    }
    if (title.includes('ODP') && params.canCreate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Kelola ODP',
        href: getInventoryWorkspaceHref('network', getInventoryActionAnchorId('odp-create')),
      }
    }
    if (title.includes('STOCK MOVEMENT') && params.canCreate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Gerakkan Stok',
        href: getInventoryWorkspaceHref('movements', getInventoryActionAnchorId('stock-movement')),
      }
    }
    if ((title.includes('STOCK') || title.includes('RECEIPT')) && params.canCreate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Barang Masuk',
        href: getInventoryWorkspaceHref('movements', getInventoryActionAnchorId('stock-receipt')),
      }
    }
    if (title.includes('ITEM') && params.canUpdate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Penataan Rak',
        href: getInventoryWorkspaceHref('items', getInventoryActionAnchorId('rack-layout')),
      }
    }
    if (title.includes('ITEM') && params.canCreate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Kelola Item',
        href: getInventoryWorkspaceHref('items', getInventoryActionAnchorId('item-create')),
      }
    }
  }

  if (params.domainKey === 'hr') {
    if (params.canUpdate && (title.includes('FACE') && title.includes('REVIEW') || rowStatus.includes('PENDING_REVIEW'))) {
      return { label: 'Review Wajah', href: `#${getHrActionAnchorId('face-review')}` }
    }
    if (params.canUpdate && title.includes('FACE')) {
      return { label: 'Kelola Referensi', href: `#${getHrActionAnchorId('face-reference')}` }
    }
    if (params.canUpdate && title.includes('GEOFENCE')) {
      return { label: 'Atur Geofence', href: `#${getHrActionAnchorId('geofence-config')}` }
    }
    if (params.canUpdate && title.includes('ATTENDANCE')) {
      return {
        label: 'Koreksi Attendance',
        href: buildPrefillHref(getHrActionAnchorId('attendance-update'), {
          attendance: extractEntityValueFromRowId(params.row.id, 'ATT') || params.row.primary,
        }),
      }
    }
    if (params.canCreate && title.includes('ATTENDANCE')) {
      return { label: 'Input Attendance', href: `#${getHrActionAnchorId('attendance-create')}` }
    }
    if (params.canUpdate && (title.includes('SALARY') || title.includes('PAYROLL'))) {
      return {
        label: 'Rilis Payroll',
        href: buildPrefillHref(getHrActionAnchorId('salary-release'), {
          payroll: extractEntityValueFromRowId(params.row.id, 'PAYROLL') || params.row.primary,
          employee: params.row.primary,
        }),
      }
    }
    if (params.canCreate && (title.includes('SALARY') || title.includes('PAYROLL'))) {
      return {
        label: 'Buat Payroll',
        href: buildPrefillHref(getHrActionAnchorId('salary-create'), { employee: params.row.primary }),
      }
    }
    if (params.canUpdate && title.includes('LOAN')) {
      return {
        label: 'Update Loan',
        href: buildPrefillHref(getHrActionAnchorId('loan-status'), {
          loan: extractEntityValueFromRowId(params.row.id, 'LOAN') || params.row.primary,
        }),
      }
    }
    if (params.canCreate && title.includes('LOAN')) {
      return { label: 'Buat Loan', href: `#${getHrActionAnchorId('loan-create')}` }
    }
    if (params.canUpdate && title.includes('ARCHIVE')) {
      return {
        label: 'Arsipkan Employee',
        href: buildPrefillHref(getHrActionAnchorId('employee-archive'), { employee: params.row.primary }),
      }
    }
    if (params.canUpdate && title.includes('REACTIVATE')) {
      return {
        label: 'Reaktifkan Employee',
        href: buildPrefillHref(getHrActionAnchorId('employee-reactivate'), { employee: params.row.primary }),
      }
    }
    if (params.canCreate && title.includes('EMPLOYEE')) {
      return { label: 'Tambah Employee', href: `#${getHrActionAnchorId('employee-create')}` }
    }
  }

  return null
}

const domainMenuLinks: Array<{
  key: DomainKey
  label: string
  href: string
}> = [
  { key: 'sales', label: 'Penjualan', href: '/sales' },
  { key: 'customers', label: 'Customer', href: '/customers' },
  { key: 'support', label: 'Support', href: '/support' },
  { key: 'inventory', label: 'Inventory', href: '/inventory' },
  { key: 'hr', label: 'HR', href: '/hr' },
  { key: 'billing', label: 'Billing', href: '/billing' },
]

const domainOperationalBlueprints: Record<
  DomainKey,
  {
    focusTitle: string
    focusDescription: string
    flows: Array<{ title: string; detail: string }>
    integrations: Array<{ label: string; href: string; description: string }>
  }
> = {
  sales: {
    focusTitle: 'Alur akuisisi pelanggan sampai aktivasi layanan',
    focusDescription:
      'Menu Penjualan diposisikan sebagai pintu masuk order baru, lalu terhubung ke customer, inventory lapangan, dan billing setelah aktivasi selesai.',
    flows: [
      { title: 'Lead -> Coverage', detail: 'Validasi prospek dan cakupan area sebelum order diterima.' },
      { title: 'Survey -> Order', detail: 'Ubah feasibility lapangan menjadi order yang siap dijadwalkan.' },
      { title: 'WO -> Activation', detail: 'Dorong work order hingga subscription aktif untuk diserahkan ke billing.' },
    ],
    integrations: [
      { label: 'Customer', href: '/customers', description: 'Customer master dan alamat terbentuk setelah order tervalidasi.' },
      { label: 'Inventory', href: '/inventory', description: 'ODP, port, dan perangkat mengikuti kebutuhan instalasi lapangan.' },
      { label: 'Billing', href: '/billing', description: 'Subscription aktif menjadi sumber invoice recurring dan one-time.' },
    ],
  },
  customers: {
    focusTitle: 'Master customer tunggal untuk seluruh lifecycle layanan',
    focusDescription:
      'Menu Customer menjadi basis identitas pelanggan, alamat, dan layanan aktif agar sales, support, dan billing tidak menggandakan data.',
    flows: [
      { title: 'Customer Master', detail: 'Simpan identitas pelanggan dan kontak utama dalam satu record.' },
      { title: 'Address -> Subscription', detail: 'Hubungkan alamat layanan dengan subscription aktif per customer.' },
      { title: 'History Layanan', detail: 'Siapkan jejak perubahan paket dan status untuk support dan billing.' },
    ],
    integrations: [
      { label: 'Sales', href: '/sales', description: 'Order baru mendorong pembentukan customer dan layanan aktif.' },
      { label: 'Support', href: '/support', description: 'Trouble ticket dan isolir membaca customer dan service yang sama.' },
      { label: 'Billing', href: '/billing', description: 'Invoice dan collection membaca subscription tanpa duplikasi data.' },
    ],
  },
  support: {
    focusTitle: 'Kontrol trouble ticket, isolir, dismantle, dan SLA dalam satu workspace',
    focusDescription:
      'Menu Support dipusatkan untuk lane operasional lapangan dan NOC agar ticket, SLA, isolir, dan dismantle dapat dibaca dari ritme kerja yang sama.',
    flows: [
      { title: 'Ticket -> Progress', detail: 'Catat PIC, follow-up, dan progres kerja tanpa menutup ticket terlalu cepat.' },
      { title: 'SLA -> Escalation', detail: 'Prioritaskan ticket berdasar due state dan jalur eskalasi formal.' },
      { title: 'Isolation -> Dismantle', detail: 'Pisahkan suspend aktif, restore, dan terminasi layanan secara operasional.' },
    ],
    integrations: [
      { label: 'Customer', href: '/customers', description: 'TT dan isolir memakai identitas customer dan service yang konsisten.' },
      { label: 'Billing', href: '/billing', description: 'Isolir, suspend, dan reconnect perlu sinkron dengan collection billing.' },
      { label: 'Inventory', href: '/inventory', description: 'Dismantle dan gangguan jaringan terkait ODP, port, dan perangkat.' },
    ],
  },
  inventory: {
    focusTitle: 'Kontrol stok, ODP, perangkat, dan kebutuhan teknisi lapangan',
    focusDescription:
      'Menu Inventory diarahkan sebagai pusat kesiapan barang, perangkat layanan, dan infrastruktur jaringan yang menopang sales, support, dan teknisi.',
    flows: [
      { title: 'Stock -> Receipt', detail: 'Jaga barang masuk dan pergerakan stok gudang tetap rapi.' },
      { title: 'ODP -> Port -> Device', detail: 'Kelola titik jaringan, port, dan assignment perangkat ke layanan aktif.' },
      { title: 'Request -> Loan -> Return', detail: 'Penuhi kebutuhan harian teknisi dengan status proses yang bisa dipantau.' },
    ],
    integrations: [
      { label: 'Sales', href: '/sales', description: 'Coverage, work order, dan aktivasi butuh data ODP dan perangkat.' },
      { label: 'Support', href: '/support', description: 'Gangguan, isolir, dan dismantle terkait perangkat serta titik jaringan.' },
      { label: 'HR', href: '/hr', description: 'Teknisi lapangan dan divisi terkait memengaruhi request dan pinjaman barang.' },
    ],
  },
  hr: {
    focusTitle: 'Operasional SDM, attendance, payroll, dan kontrol lapangan',
    focusDescription:
      'Menu HR menggabungkan employee lifecycle, attendance, loan, payroll, dan fondasi geofence/wajah untuk mendukung operasi harian ERP.',
    flows: [
      { title: 'Employee -> Attendance', detail: 'Hubungkan master karyawan dengan kehadiran dan kontrol lokasi.' },
      { title: 'Face/Geo Review', detail: 'Gunakan review manual dan konfigurasi threshold sebagai fondasi verifikasi lapangan.' },
      { title: 'Loan -> Payroll', detail: 'Jaga pinjaman dan slip gaji tetap sinkron dengan status karyawan aktif.' },
    ],
    integrations: [
      { label: 'Inventory', href: '/inventory', description: 'Teknisi dan divisi memengaruhi request dan pinjaman barang lapangan.' },
      { label: 'Dashboard', href: '/dashboard/daily-activity', description: 'Daily Activity dan approval manager menutup ritme kerja harian.' },
      { label: 'Settings Users', href: '/settings/users', description: 'Profil user internal mengikat role, divisi, dan approval scope.' },
    ],
  },
  access: {
    focusTitle: 'Kontrol akses, permission, dan tata kelola role dalam satu pusat pengaturan',
    focusDescription:
      'Menu Access diposisikan sebagai pusat kontrol permission agar semua domain tetap mengikuti rule akses yang sama saat ERP dipakai lintas divisi.',
    flows: [
      { title: 'Role -> Capability', detail: 'Tentukan aksi yang boleh dibuka per role dan domain.' },
      { title: 'Permission -> Review', detail: 'Cek perubahan permission sebelum memengaruhi operasional user.' },
      { title: 'Governance -> Audit', detail: 'Jaga tata kelola akses tetap sinkron dengan settings users dan audit dashboard.' },
    ],
    integrations: [
      { label: 'Settings Users', href: '/settings/users', description: 'Permission user internal bergantung pada role dan mapping akses yang aktif.' },
      { label: 'Dashboard', href: '/dashboard', description: 'Akses menu dan queue dashboard mengikuti policy role yang disimpan di sini.' },
      { label: 'Support', href: '/support', description: 'Aksi kritis domain seperti update, approve, atau manage mengikuti permission aktif.' },
    ],
  },
  billing: {
    focusTitle: 'Invoice, payment, collection, suspend, dan reconnect secara operasional',
    focusDescription:
      'Menu Billing diarahkan untuk mengendalikan invoice recurring maupun one-time, customer aktif, kasus isolir, pembayaran, collection follow-up, serta jalur suspend/reconnect.',
    flows: [
      { title: 'Customer -> Invoice', detail: 'Bentuk invoice recurring atau one-time dari customer dan layanan aktif yang valid.' },
      { title: 'Isolir -> Suspend', detail: 'Samakan kasus isolir aktif dengan keputusan suspend, collection, dan restore secara jelas.' },
      { title: 'Payment -> Reconnect', detail: 'Bersihkan action terbuka dan dorong pemulihan layanan saat syarat pembayaran terpenuhi.' },
    ],
    integrations: [
      { label: 'Customer', href: '/customers', description: 'Invoice, payment, dan aging tagihan membaca customer serta subscription yang sama.' },
      { label: 'Support', href: '/support', description: 'Isolir, suspend, reconnect, dan keputusan restore perlu ritme operasional yang sinkron.' },
      { label: 'Sales', href: '/sales', description: 'Aktivasi subscription baru dan charge one-time berasal dari proses komersial.' },
    ],
  },
}

export function DomainShell({
  content,
  source,
  capabilities,
  role,
  supportFocus,
  supportPageMode = 'domain',
  supportPrefill,
  domainPrefill,
  domainDrilldown,
  supportDrilldown,
  inventoryView,
  inventoryAction,
  inventoryLifecycleItems = [],
  hideInventoryWorkspaceTabs = false,
}: {
  content: DomainPageContent
  source: DataSourceSnapshot
  capabilities: DomainCapability[]
  role: AppRole
  supportFocus?: DomainSupportFocus
  supportPageMode?: 'domain' | 'lane'
  supportPrefill?: SupportFormPrefill
  domainPrefill?: DomainFormPrefill
  domainDrilldown?: {
    key: string
    label: string
    detail: string
    clearHref: string
    month?: number
    year?: number
  }
  supportDrilldown?: SupportDrilldownContext
  inventoryView?: string
  inventoryAction?: string
  inventoryLifecycleItems?: DeviceLifecycleLogRow[]
  hideInventoryWorkspaceTabs?: boolean
}) {
  const enabledCapabilities = capabilities.filter((item) => item.enabled)
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canApprove = capabilities.some((item) => item.action === 'approve' && item.enabled)
  const canRequestInventory = content.key === 'inventory' ? role === 'FIELD_TECHNICIAN' || canCreate : false
  const canProcessInventoryRequest =
    content.key === 'inventory' ? role !== 'FIELD_TECHNICIAN' && (canApprove || canUpdate || canCreate) : false
  const isFieldTechnicianInventory = content.key === 'inventory' && role === 'FIELD_TECHNICIAN'
  const requireInventoryPickupScan =
    content.key === 'inventory' ? !['OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(role) : false
  const activeInventoryView = content.key === 'inventory' ? normalizeInventoryWorkspaceView(inventoryView) : 'overview'
  const activeInventoryAction = content.key === 'inventory' ? normalizeInventoryActionKey(inventoryAction) : null
  const shouldShowInventoryAction = (key: InventoryActionKey) =>
    !activeInventoryAction || isInventoryActionInScope(activeInventoryAction, key)
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
  const billingCollectionSuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('PERLU TINDAK LANJUT'))
              .flatMap((section) => section.rows)
              .map((row) => row.primary)
              .filter(Boolean),
          ),
        )
      : []
  const billingCollectionFollowUpSuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('COLLECTION FOLLOW UP QUEUE'))
              .flatMap((section) => section.rows)
              .map((row) => {
                const invoiceNo = row.primary.trim()
                const invoiceStatus =
                  row.meta.find((item) => item.startsWith('Invoice Status: '))?.replace('Invoice Status: ', '').trim() || '-'
                const total = row.meta.find((item) => item.startsWith('Total: '))?.replace('Total: ', '').trim() || 'Rp0'
                const paid = row.meta.find((item) => item.startsWith('Paid: '))?.replace('Paid: ', '').trim() || 'Rp0'
                const remaining =
                  row.meta.find((item) => item.startsWith('Remaining: '))?.replace('Remaining: ', '').trim() || 'Rp0'
                const invoiceDue =
                  row.meta.find((item) => item.startsWith('Invoice Due: '))?.replace('Invoice Due: ', '').trim() || '-'
                const followUp = row.meta.find((item) => item.startsWith('Follow Up: '))?.replace('Follow Up: ', '').trim() || '-'
                const followUpState =
                  row.meta.find((item) => item.startsWith('Follow Up State: '))?.replace('Follow Up State: ', '').trim() || 'UNSET'
                const actionType =
                  row.meta.find((item) => item.startsWith('Action Type: '))?.replace('Action Type: ', '').trim() || '-'
                const collectionStatus =
                  row.meta.find((item) => item.startsWith('Collection Status: '))?.replace('Collection Status: ', '').trim() || '-'
                const suspendCandidate =
                  row.meta.find((item) => item.startsWith('Suspend Candidate: '))?.replace('Suspend Candidate: ', '').trim() || 'Tidak'
                const actionNotes =
                  row.meta.find((item) => item.startsWith('Action Notes: '))?.replace('Action Notes: ', '').trim() || '-'
                return invoiceNo
                  ? `${invoiceNo} | ${row.secondary} | ${invoiceStatus} | ${total} | ${paid} | ${remaining} | ${invoiceDue} | ${followUp} | ${followUpState} | ${actionType} | ${collectionStatus} | ${suspendCandidate} | ${actionNotes}`
                  : ''
              })
              .filter(Boolean),
          ),
        )
      : []
  const billingSuspendReadySuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('SUSPEND READY QUEUE'))
              .flatMap((section) => section.rows)
              .map((row) => row.primary.trim())
              .filter(Boolean),
          ),
        )
      : []
  const billingPromiseToPaySuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('PROMISE TO PAY QUEUE'))
              .flatMap((section) => section.rows)
              .map((row) => row.primary.trim())
              .filter(Boolean),
          ),
        )
      : []
  const billingReconnectReadySuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('RECONNECT READY QUEUE'))
              .flatMap((section) => section.rows)
              .map((row) => row.primary.trim())
              .filter(Boolean),
          ),
        )
      : []
  const billingReconnectContextSuggestions =
    content.key === 'billing'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .filter((section) => section.title.toUpperCase().includes('RECONNECT READY QUEUE'))
              .flatMap((section) => section.rows)
              .map((row) => {
                const invoiceNo = row.primary.trim()
                const invoiceStatus =
                  row.meta.find((item) => item.startsWith('Invoice Status: '))?.replace('Invoice Status: ', '').trim() || '-'
                const collectionStatus =
                  row.meta.find((item) => item.startsWith('Collection Status: '))?.replace('Collection Status: ', '').trim() || '-'
                const total = row.meta.find((item) => item.startsWith('Total: '))?.replace('Total: ', '').trim() || 'Rp0'
                const paid = row.meta.find((item) => item.startsWith('Paid: '))?.replace('Paid: ', '').trim() || 'Rp0'
                const remaining =
                  row.meta.find((item) => item.startsWith('Remaining: '))?.replace('Remaining: ', '').trim() || 'Rp0'
                const invoiceDue =
                  row.meta.find((item) => item.startsWith('Invoice Due: '))?.replace('Invoice Due: ', '').trim() || '-'
                const updated = row.meta.find((item) => item.startsWith('Updated: '))?.replace('Updated: ', '').trim() || '-'
                return invoiceNo
                  ? `${invoiceNo} | ${row.secondary} | ${invoiceStatus} | ${total} | ${paid} | ${remaining} | ${invoiceDue} | ${updated} | READY_RECONNECT | RECONNECT | ${collectionStatus} | Tidak | ${row.detail}`
                  : ''
              })
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
  const billingSectionActions =
    content.key === 'billing'
      ? Array.from(
          new Map(
            (content.reviewSections ?? [])
              .map((section) =>
                getBillingSectionAction({
                  sectionTitle: section.title,
                  canCreate,
                  canUpdate,
                }),
              )
              .filter(isBillingSectionAction)
              .map((item) => [item.key, item]),
          ).values(),
        )
      : []
  const salesSectionActions =
    content.key === 'sales'
      ? Array.from(
          new Map(
            (content.reviewSections ?? [])
              .map((section) =>
                getSalesSectionAction({
                  sectionTitle: section.title,
                  canCreate,
                }),
              )
              .filter(isSalesSectionAction)
              .map((item) => [item.key, item]),
          ).values(),
        )
      : []
  const inventoryItemSuggestions =
    content.key === 'inventory'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('ITEM'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.primary} | ${row.secondary}`)
      : []
  const inventoryRackSuggestions =
    content.key === 'inventory'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('ITEM'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const rack = row.meta.find((item) => item.startsWith('Rack: '))?.replace('Rack: ', '').trim() || '-'
            const rackBarcode =
              row.meta.find((item) => item.startsWith('Rack Barcode: '))?.replace('Rack Barcode: ', '').trim() || row.primary
            return `${rackBarcode} | ${row.primary} | ${row.secondary} | ${rack}`
          })
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
  const inventoryRequestSuggestions =
    content.key === 'inventory'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('REQUEST INVENTORY'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const requestId = row.id.replace(/^REQ-/, '').trim()
            const subdivision =
              row.meta.find((item) => item.startsWith('Sub-divisi: '))?.replace('Sub-divisi: ', '').trim() || '-'
            const rackBarcode =
              row.meta.find((item) => item.startsWith('Rack Barcode: '))?.replace('Rack Barcode: ', '').trim() || row.primary
            return requestId ? `${requestId} | ${row.primary} | ${rackBarcode} | ${row.secondary} | ${subdivision} | ${row.status}` : ''
          })
          .filter(Boolean)
      : []
  const inventoryLoanSuggestions =
    content.key === 'inventory'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('PINJAMAN INVENTORY'))
          .flatMap((section) => section.rows)
          .filter((row) => !row.status.toUpperCase().includes('RETURNED') && !row.status.toUpperCase().includes('DIKEMBALIKAN'))
          .map((row) => {
            const loanId = row.id.replace(/^LOAN-/, '').trim()
            const remaining =
              row.meta.find((item) => item.startsWith('Sisa Pinjam: '))?.replace('Sisa Pinjam: ', '').trim() || '-'
            return loanId ? `${loanId} | ${row.primary} | ${row.status} | Sisa ${remaining}` : ''
          })
          .filter(Boolean)
      : []
  const inventoryMovementRows =
    content.key === 'inventory'
      ? (content.reviewSections ?? []).find((section) => section.title.toUpperCase().includes('STOCK MOVEMENT'))?.rows ?? []
      : []
  const hrEmployeeSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('EMPLOYEE TERBARU'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.primary} | ${row.secondary}`)
      : []
  const hrEmployeeArchiveSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('EMPLOYEE TERBARU'))
          .flatMap((section) => section.rows)
          .filter((row) => row.status.toUpperCase() !== 'ARCHIVED')
          .map((row) => `${row.id.replace(/^EMP-/, '')} | ${row.primary} | ${row.secondary} | ${row.status}`)
      : []
  const hrEmployeeReactivateSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('EMPLOYEE TERBARU'))
          .flatMap((section) => section.rows)
          .filter((row) => row.status.toUpperCase() === 'ARCHIVED')
          .map((row) => `${row.id.replace(/^EMP-/, '')} | ${row.primary} | ${row.secondary} | ${row.status}`)
      : []
  const hrEmployeeFaceReferenceSuggestions =
    content.key === 'hr'
      ? (() => {
          const referenceRows = (content.reviewSections ?? [])
            .filter((section) => section.title.toUpperCase().includes('EMPLOYEE FACE REFERENCES'))
            .flatMap((section) => section.rows)

          const referenceMap = new Map(
            referenceRows
              .map((row) => {
                const employeeId = row.meta.find((item) => item.startsWith('Employee ID: '))?.replace('Employee ID: ', '').trim() || ''
                if (!employeeId || employeeId === '-') {
                  return null
                }

                const referenceRef =
                  row.meta.find((item) => item.startsWith('Reference Ref: '))?.replace('Reference Ref: ', '').trim() || '-'
                const verificationMode = row.meta.find((item) => item.startsWith('Mode: '))?.replace('Mode: ', '').trim() || 'CAMERA_CAPTURE'

                return [employeeId, { referenceRef, verificationMode }] as const
              })
              .filter((item): item is readonly [string, { referenceRef: string; verificationMode: string }] => Boolean(item)),
          )

          return (content.reviewSections ?? [])
            .filter((section) => section.title.toUpperCase().includes('EMPLOYEE TERBARU'))
            .flatMap((section) => section.rows)
            .filter((row) => row.status.toUpperCase() !== 'ARCHIVED')
            .map((row) => {
              const employeeId = row.id.replace(/^EMP-/, '').trim()
              const reference = referenceMap.get(employeeId)
              return employeeId
                ? `${employeeId} | ${row.primary} | ${row.secondary} | ${row.status} | ${reference?.referenceRef || '-'} | ${reference?.verificationMode || 'CAMERA_CAPTURE'}`
                : ''
            })
            .filter(Boolean)
        })()
      : []
  const hrEmployeeFaceReferenceTrendSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('FACE REFERENCE TRENDS'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const employeeId = row.id.replace(/^FACE-TREND-/, '').trim()
            const historyCount = row.meta.find((item) => item.startsWith('History Count: '))?.replace('History Count: ', '').trim() || '0'
            const averageScore = row.meta.find((item) => item.startsWith('Average Score: '))?.replace('Average Score: ', '').trim() || '0.0'
            const latestScore = row.meta.find((item) => item.startsWith('Latest Score: '))?.replace('Latest Score: ', '').trim() || '0'
            const bestScore = row.meta.find((item) => item.startsWith('Best Score: '))?.replace('Best Score: ', '').trim() || '0'
            const latestSource = row.meta.find((item) => item.startsWith('Latest Source: '))?.replace('Latest Source: ', '').trim() || '-'
            const driftStatus = row.meta.find((item) => item.startsWith('Drift Status: '))?.replace('Drift Status: ', '').trim() || 'INSUFFICIENT_DATA'
            const gapFromAverage =
              row.meta.find((item) => item.startsWith('Gap From Average: '))?.replace('Gap From Average: ', '').trim() || '0.0'
            const gapFromBest = row.meta.find((item) => item.startsWith('Gap From Best: '))?.replace('Gap From Best: ', '').trim() || '0'
            return employeeId
              ? `${employeeId} | ${historyCount} | ${averageScore} | ${latestScore} | ${bestScore} | ${latestSource} | ${driftStatus} | ${gapFromAverage} | ${gapFromBest}`
              : ''
          })
          .filter(Boolean)
      : []
  const hrEmployeeVerifiedFaceCandidateSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('VERIFIED FACE CANDIDATES'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const employeeId = row.meta.find((item) => item.startsWith('Employee ID: '))?.replace('Employee ID: ', '').trim() || ''
            const captureRef = row.meta.find((item) => item.startsWith('Capture Ref: '))?.replace('Capture Ref: ', '').trim() || ''
            const verificationMode = row.meta.find((item) => item.startsWith('Mode: '))?.replace('Mode: ', '').trim() || 'CAMERA_CAPTURE'
            const reviewedAt = row.meta.find((item) => item.startsWith('Reviewed At: '))?.replace('Reviewed At: ', '').trim() || '-'
            return employeeId && captureRef ? `${employeeId} | ${captureRef} | ${verificationMode} | ${reviewedAt}` : ''
          })
          .filter(Boolean)
      : []
  const hrAttendanceSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('ATTENDANCE'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const attendanceId = row.id.replace(/^ATT-/, '').trim()
            const attendanceDate = row.meta.find((item) => item.startsWith('Date: '))?.replace('Date: ', '').trim() || '-'
            const checkIn = row.meta.find((item) => item.startsWith('Check In Raw: '))?.replace('Check In Raw: ', '').trim() || '-'
            const checkOut = row.meta.find((item) => item.startsWith('Check Out Raw: '))?.replace('Check Out Raw: ', '').trim() || '-'
            const overtime = row.meta.find((item) => item.startsWith('Overtime Raw: '))?.replace('Overtime Raw: ', '').trim() || '0.00'
            const lock = row.meta.find((item) => item.startsWith('Lock Raw: '))?.replace('Lock Raw: ', '').trim() || '0'
            return attendanceId
              ? `${attendanceId} | ${row.primary} | ${row.status} | ${attendanceDate} | ${checkIn} | ${checkOut} | ${overtime} | ${lock}`
              : ''
          })
          .filter(Boolean)
      : []
  const hrAttendanceGeofenceConfig =
    content.key === 'hr'
      ? (() => {
          const row = (content.reviewSections ?? [])
            .filter((section) => section.title.toUpperCase().includes('GEOFENCE ATTENDANCE'))
            .flatMap((section) => section.rows)[0]

          if (!row || row.status.toUpperCase() === 'NOT_SET') {
            return null
          }

          return {
            locationName: row.primary,
            latitude: row.meta.find((item) => item.startsWith('Latitude: '))?.replace('Latitude: ', '').trim() || '',
            longitude: row.meta.find((item) => item.startsWith('Longitude: '))?.replace('Longitude: ', '').trim() || '',
            radiusMeters: row.meta.find((item) => item.startsWith('Radius: '))?.replace('Radius: ', '').replace(' meter', '').trim() || '100',
            isRequired:
              (row.meta.find((item) => item.startsWith('Required: '))?.replace('Required: ', '').trim() || '').toUpperCase() ===
              'YA',
            notes: row.meta.find((item) => item.startsWith('Notes: '))?.replace('Notes: ', '').trim() || '',
          }
        })()
      : null
  const hrAttendanceFaceConfig =
    content.key === 'hr'
      ? (() => {
          const row = (content.reviewSections ?? [])
            .filter((section) => section.title.toUpperCase().includes('FACE ATTENDANCE'))
            .flatMap((section) => section.rows)[0]

          if (!row || row.status.toUpperCase() === 'NOT_SET') {
            return null
          }

          return {
            isRequired:
              (row.meta.find((item) => item.startsWith('Required: '))?.replace('Required: ', '').trim() || '').toUpperCase() ===
              'YA',
            verificationMode: row.meta.find((item) => item.startsWith('Mode: '))?.replace('Mode: ', '').trim() || 'MANUAL_REVIEW',
            autoVerifyHighConfidence:
              (row.meta.find((item) => item.startsWith('Auto Verify: '))?.replace('Auto Verify: ', '').trim() || '').toUpperCase() ===
              'YA',
            autoVerifyMinScore: Number.parseInt(
              row.meta.find((item) => item.startsWith('Auto Verify Min Score: '))?.replace('Auto Verify Min Score: ', '').trim() ||
                '85',
              10,
            ),
            notes: row.meta.find((item) => item.startsWith('Notes: '))?.replace('Notes: ', '').trim() || '',
          }
        })()
      : null
  const hrAttendanceFaceReviewSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('REVIEW FACE ATTENDANCE'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const faceLogId = row.id.replace(/^FACE-/, '').trim()
            const captureRef = row.meta.find((item) => item.startsWith('Capture Ref: '))?.replace('Capture Ref: ', '').trim() || '-'
            const mode = row.meta.find((item) => item.startsWith('Mode: '))?.replace('Mode: ', '').trim() || row.secondary || '-'
            const matchScore = row.meta.find((item) => item.startsWith('Match Score: '))?.replace('Match Score: ', '').trim() || '0'
            const confidenceBand =
              row.meta.find((item) => item.startsWith('Confidence Band: '))?.replace('Confidence Band: ', '').trim() || 'LOW'
            const baselineReferenceRef =
              row.meta.find((item) => item.startsWith('Baseline Reference Ref: '))?.replace('Baseline Reference Ref: ', '').trim() || '-'
            const baselineMatchScore =
              row.meta.find((item) => item.startsWith('Baseline Match Score: '))?.replace('Baseline Match Score: ', '').trim() || '0'
            const baselineMatchBand =
              row.meta.find((item) => item.startsWith('Baseline Match Band: '))?.replace('Baseline Match Band: ', '').trim() || 'NO_BASELINE'
            const baselineMatchOutcome =
              row.meta.find((item) => item.startsWith('Baseline Match Outcome: '))?.replace('Baseline Match Outcome: ', '').trim() ||
              'NO_BASELINE'
            const recommendation =
              row.meta.find((item) => item.startsWith('Recommendation: '))?.replace('Recommendation: ', '').trim() || 'PENDING_REVIEW'
            const recommendationReason =
              row.meta.find((item) => item.startsWith('Recommendation Reason: '))?.replace('Recommendation Reason: ', '').trim() || '-'
            const autoReviewEligible =
              row.meta.find((item) => item.startsWith('Auto Review Eligible: '))?.replace('Auto Review Eligible: ', '').trim() || 'Tidak'
            return faceLogId
              ? `${faceLogId} | ${row.primary} | ${row.status} | ${captureRef} | ${mode} | ${matchScore} | ${confidenceBand} | ${recommendation} | ${autoReviewEligible} | ${baselineReferenceRef} | ${baselineMatchScore} | ${baselineMatchBand} | ${baselineMatchOutcome} | ${recommendationReason}`
              : ''
          })
          .filter(Boolean)
      : []
  const hrLoanSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('LOAN'))
          .flatMap((section) => section.rows)
          .filter(
            (row) =>
              !row.status.toUpperCase().includes('PAID') &&
              !row.status.toUpperCase().includes('REJECTED') &&
              !row.status.toUpperCase().includes('CANCELLED'),
          )
          .map((row) => {
            const loanId = row.id.replace(/^LOAN-/, '').trim()
            const amount = row.meta.find((item) => item.startsWith('Amount: '))?.replace('Amount: ', '').trim() || '-'
            const installment =
              row.meta.find((item) => item.startsWith('Installment: '))?.replace('Installment: ', '').trim() || '-'
            return loanId ? `${loanId} | ${row.primary} | ${row.status} | ${row.secondary} | ${amount} | ${installment}` : ''
          })
          .filter(Boolean)
      : []
  const hrLoanVoidSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('LOAN'))
          .flatMap((section) => section.rows)
          .filter(
            (row) =>
              !row.status.toUpperCase().includes('PAID') &&
              !row.status.toUpperCase().includes('REJECTED') &&
              !row.status.toUpperCase().includes('CANCELLED'),
          )
          .map((row) => {
            const loanId = row.id.replace(/^LOAN-/, '').trim()
            const amount = row.meta.find((item) => item.startsWith('Amount: '))?.replace('Amount: ', '').trim() || '-'
            const installment =
              row.meta.find((item) => item.startsWith('Installment: '))?.replace('Installment: ', '').trim() || '-'
            return loanId ? `${loanId} | ${row.primary} | ${row.status} | ${row.secondary} | ${amount} | ${installment}` : ''
          })
          .filter(Boolean)
      : []
  const hrSalarySlipSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('SLIP GAJI'))
          .flatMap((section) => section.rows)
          .filter((row) => row.status.toUpperCase() === 'DRAFT')
          .map((row) => {
            const salarySlipId = row.id.replace(/^PAYROLL-/, '').trim()
            const income = row.meta.find((item) => item.startsWith('Income: '))?.replace('Income: ', '').trim() || '-'
            const deduction =
              row.meta.find((item) => item.startsWith('Deduction: '))?.replace('Deduction: ', '').trim() || '-'
            return salarySlipId
              ? `${salarySlipId} | ${row.primary} | ${row.secondary} | ${row.status} | ${income} | ${deduction}`
              : ''
          })
          .filter(Boolean)
      : []
  const hrSalarySlipVoidSuggestions =
    content.key === 'hr'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('SLIP GAJI'))
          .flatMap((section) => section.rows)
          .filter((row) => row.status.toUpperCase() !== 'VOIDED')
          .map((row) => {
            const salarySlipId = row.id.replace(/^PAYROLL-/, '').trim()
            const income = row.meta.find((item) => item.startsWith('Income: '))?.replace('Income: ', '').trim() || '-'
            const deduction =
              row.meta.find((item) => item.startsWith('Deduction: '))?.replace('Deduction: ', '').trim() || '-'
            return salarySlipId
              ? `${salarySlipId} | ${row.primary} | ${row.secondary} | ${row.status} | ${income} | ${deduction}`
              : ''
          })
          .filter(Boolean)
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
  const inventorySectionActions =
    content.key === 'inventory'
      ? Array.from(
          new Map(
            (content.reviewSections ?? [])
              .map((section) =>
                getInventorySectionAction({
                  sectionTitle: section.title,
                  canRequestInventory,
                  canProcessInventoryRequest,
                  canCreate,
                  canUpdate,
                  isFieldTechnicianInventory,
                }),
              )
              .filter(isInventorySectionAction)
              .map((item) => [item.key, item]),
          ).values(),
        )
      : []
  const hrSectionActions =
    content.key === 'hr'
      ? Array.from(
          new Map(
            (content.reviewSections ?? [])
              .map((section) =>
                getHrSectionAction({
                  sectionTitle: section.title,
                  canCreate,
                  canUpdate,
                }),
              )
              .filter(isHrSectionAction)
              .map((item) => [item.key, item]),
          ).values(),
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
  const salesLeadPrefillValue = resolveSuggestionByTokens(salesLeadSuggestions, domainPrefill?.lead)
  const salesOrderPrefillValue = resolveSuggestionByTokens(salesOrderSuggestions, domainPrefill?.order)
  const billingServicePrefillValue = resolveSuggestionByTokens(billingSubscriptionSuggestions, domainPrefill?.service)
  const inventoryItemPrefillCode = extractInventoryItemCodeFromScan(String(domainPrefill?.itemCode ?? ''))
  const inventoryItemPrefillValue =
    resolveSuggestionByTokens(inventoryItemSuggestions, inventoryItemPrefillCode) || inventoryItemPrefillCode
  const billingInvoicePrefillValue = resolveSuggestionByTokens(
    Array.from(new Set([...billingInvoiceSuggestions, ...billingCollectionFollowUpSuggestions, ...billingReconnectContextSuggestions])),
    domainPrefill?.invoice,
  )
  const inventoryRequestPrefillValue = resolveSuggestionByTokens(
    inventoryRequestSuggestions,
    domainPrefill?.request,
    extractEntityValueFromRowId(String(domainPrefill?.request ?? ''), 'REQ'),
  )
  const inventoryLoanPrefillValue = resolveSuggestionByTokens(
    inventoryLoanSuggestions,
    domainPrefill?.loan,
    extractEntityValueFromRowId(String(domainPrefill?.loan ?? ''), 'LOAN'),
  )
  const hrAttendancePrefillValue = resolveSuggestionByTokens(
    hrAttendanceSuggestions,
    domainPrefill?.attendance,
    extractEntityValueFromRowId(String(domainPrefill?.attendance ?? ''), 'ATT'),
  )
  const hrLoanPrefillValue = resolveSuggestionByTokens(
    hrLoanSuggestions,
    domainPrefill?.loan,
    extractEntityValueFromRowId(String(domainPrefill?.loan ?? ''), 'LOAN'),
  )
  const hrEmployeePrefillValue = resolveSuggestionByTokens(
    Array.from(new Set([...hrEmployeeSuggestions, ...hrEmployeeArchiveSuggestions, ...hrEmployeeReactivateSuggestions])),
    domainPrefill?.employee,
  )
  const hrSalarySlipPrefillValue = resolveSuggestionByTokens(
    hrSalarySlipSuggestions,
    domainPrefill?.payroll,
    extractEntityValueFromRowId(String(domainPrefill?.payroll ?? ''), 'PAYROLL'),
  )
  const supportTypeSuggestions =
    content.key === 'support'
      ? Array.from(
          new Set(
            (content.reviewSections ?? []).flatMap((section) => {
              if (section.title.toUpperCase().includes('SLA TROUBLE TICKET')) {
                return section.rows.map((row) => row.primary.trim()).filter(Boolean)
              }

              return section.rows.flatMap((row) =>
                row.meta
                  .filter((item) => item.startsWith('Type: '))
                  .map((item) => item.replace('Type: ', '').trim())
                  .filter(Boolean),
              )
            }),
          ),
        )
      : []
  const supportTicketSuggestions =
    content.key === 'support'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('TROUBLE'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const ticketCode = row.primary.trim()
            const slaDays = row.meta.find((item) => item.startsWith('SLA Days: '))?.replace('SLA Days: ', '').trim() || '-'
            const slaDue = row.meta.find((item) => item.startsWith('SLA Due: '))?.replace('SLA Due: ', '').trim() || '-'
            const slaState = row.meta.find((item) => item.startsWith('SLA State: '))?.replace('SLA State: ', '').trim() || 'UNSET'
            const owner = row.meta.find((item) => item.startsWith('PIC: '))?.replace('PIC: ', '').trim() || '-'
            const followUp =
              row.meta.find((item) => item.startsWith('Next Follow Up: '))?.replace('Next Follow Up: ', '').trim() || '-'
            const latestProgress =
              row.meta.find((item) => item.startsWith('Latest Progress: '))?.replace('Latest Progress: ', '').trim() || '-'
            const type = row.meta.find((item) => item.startsWith('Type: '))?.replace('Type: ', '').trim() || '-'
            return ticketCode
              ? `${ticketCode} | ${row.secondary} | ${row.status} | ${type} | ${slaDays} | ${slaDue} | ${slaState} | ${owner} | ${followUp} | ${latestProgress}`
              : ''
          })
          .filter(Boolean)
      : []
  const supportTicketProgressSuggestions =
    content.key === 'support'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('TROUBLE'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const ticketCode = row.primary.trim()
            const slaDays = row.meta.find((item) => item.startsWith('SLA Days: '))?.replace('SLA Days: ', '').trim() || '-'
            const slaDue = row.meta.find((item) => item.startsWith('SLA Due: '))?.replace('SLA Due: ', '').trim() || '-'
            const slaState = row.meta.find((item) => item.startsWith('SLA State: '))?.replace('SLA State: ', '').trim() || 'UNSET'
            const owner = row.meta.find((item) => item.startsWith('PIC: '))?.replace('PIC: ', '').trim() || '-'
            const followUp =
              row.meta.find((item) => item.startsWith('Next Follow Up: '))?.replace('Next Follow Up: ', '').trim() || '-'
            const latestProgress =
              row.meta.find((item) => item.startsWith('Latest Progress: '))?.replace('Latest Progress: ', '').trim() || '-'
            const type = row.meta.find((item) => item.startsWith('Type: '))?.replace('Type: ', '').trim() || '-'
            return ticketCode
              ? `${ticketCode} | ${row.secondary} | ${row.status} | ${type} | ${slaDays} | ${slaDue} | ${slaState} | ${owner} | ${followUp} | ${latestProgress}`
              : ''
          })
          .filter(Boolean)
      : []
  const supportTicketEscalationSuggestions =
    content.key === 'support'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('TROUBLE'))
          .flatMap((section) => section.rows)
          .map((row) => {
            const ticketCode = row.primary.trim()
            const slaDays = row.meta.find((item) => item.startsWith('SLA Days: '))?.replace('SLA Days: ', '').trim() || '-'
            const slaDue = row.meta.find((item) => item.startsWith('SLA Due: '))?.replace('SLA Due: ', '').trim() || '-'
            const slaState = row.meta.find((item) => item.startsWith('SLA State: '))?.replace('SLA State: ', '').trim() || 'UNSET'
            const owner = row.meta.find((item) => item.startsWith('PIC: '))?.replace('PIC: ', '').trim() || '-'
            const followUp =
              row.meta.find((item) => item.startsWith('Next Follow Up: '))?.replace('Next Follow Up: ', '').trim() || '-'
            const latestProgress =
              row.meta.find((item) => item.startsWith('Latest Progress: '))?.replace('Latest Progress: ', '').trim() || '-'
            const escalationTarget =
              row.meta.find((item) => item.startsWith('Escalation Target: '))?.replace('Escalation Target: ', '').trim() || '-'
            const escalationLevel =
              row.meta.find((item) => item.startsWith('Escalation Level: '))?.replace('Escalation Level: ', '').trim() || '-'
            const escalationAt =
              row.meta.find((item) => item.startsWith('Escalated At: '))?.replace('Escalated At: ', '').trim() || '-'
            const escalationReason =
              row.meta.find((item) => item.startsWith('Escalation Reason: '))?.replace('Escalation Reason: ', '').trim() || '-'
            const type = row.meta.find((item) => item.startsWith('Type: '))?.replace('Type: ', '').trim() || '-'
            return ticketCode
              ? `${ticketCode} | ${row.secondary} | ${row.status} | ${type} | ${slaDays} | ${slaDue} | ${slaState} | ${owner} | ${followUp} | ${latestProgress} | ${escalationTarget} | ${escalationLevel} | ${escalationAt} | ${escalationReason}`
              : ''
          })
          .filter(Boolean)
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
  const supportServiceSuggestions =
    content.key === 'support'
      ? Array.from(
          new Set(
            (content.reviewSections ?? [])
              .flatMap((section) => section.rows)
              .flatMap((row) =>
                row.meta
                  .flatMap((item) => {
                    if (item.startsWith('Service No: ')) {
                      return [item.replace('Service No: ', '').trim()]
                    }
                    if (item.startsWith('Customer Code: ')) {
                      return [item.replace('Customer Code: ', '').trim()]
                    }
                    return []
                  })
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
  const supportDismantleQueueSuggestions =
    content.key === 'support'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('QUEUE DISMANTLE OPEN'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.id.replace(/^DISMANTLE-QUEUE-/, '')} | ${row.primary} | ${row.secondary}`)
      : []
  const supportDismantleHistorySuggestions =
    content.key === 'support'
      ? (content.reviewSections ?? [])
          .filter((section) => section.title.toUpperCase().includes('HISTORI DISMANTLE'))
          .flatMap((section) => section.rows)
          .map((row) => `${row.id.replace(/^DIS-/, '')} | ${row.primary} | ${row.secondary}`)
      : []
  const selectedSupportLane = supportFocus?.selectedLane ?? null
  const activeSupportLane = supportFocus?.activeLane ?? null
  const activeSupportLaneMeta =
    activeSupportLane ? supportFocus?.lanes.find((lane) => lane.key === activeSupportLane) ?? null : null
  const activeSupportWorkspace = supportFocus?.activeWorkspace
  const supportFocusCopy =
    content.key === 'support' && activeSupportLane ? getSupportLaneFocusCopy(activeSupportLane) : null
  const supportRoleMeta = content.key === 'support' ? getRoleMeta(role) : null
  const headerCopy = supportPageMode === 'lane' && content.key === 'support' ? supportFocusCopy : null
  const headerEyebrow = headerCopy ? headerCopy.eyebrow : content.eyebrow
  const headerTitle = headerCopy ? headerCopy.title : content.title
  const headerDescription = headerCopy ? headerCopy.description : content.description
  const headerPrimaryAction =
    supportPageMode === 'lane' && content.key === 'support'
      ? { label: 'Kembali ke Support', href: '/support' }
      : content.primaryAction
  const headerSecondaryAction =
    supportPageMode === 'lane' && content.key === 'support'
      ? { label: 'Lihat Dashboard', href: '/dashboard' }
      : content.secondaryAction
  const domainBlueprint = domainOperationalBlueprints[content.key]
  const visibleReviewSectionsBase =
    content.key === 'support' ? supportFocus?.visibleSections ?? (content.reviewSections ?? []) : (content.reviewSections ?? [])
  const visibleReviewSections =
    content.key === 'support' && supportDrilldown
      ? visibleReviewSectionsBase
          .map((section) => {
            if (supportDrilldown.key === 'SLA_OVERDUE') {
              return {
                ...section,
                rows: section.rows.filter((row) => row.meta.some((item) => item === 'SLA State: OVERDUE')),
              }
            }

            if (supportDrilldown.key === 'OVERDUE_RATE') {
              if (
                !section.title.toUpperCase().includes('SLA TICKET OPEN AKTIF') &&
                !section.title.toUpperCase().includes('SLA TICKET OVERDUE') &&
                !section.title.toUpperCase().includes('SLA TROUBLE TICKET')
              ) {
                return {
                  ...section,
                  rows: [],
                }
              }
            }

            if (supportDrilldown.key === 'OPEN_TICKETS') {
              return {
                ...section,
                rows: section.rows.filter((row) => row.meta.every((item) => item !== 'Close Candidate: Ya')),
              }
            }

            return section
          })
          .filter((section) => section.rows.length > 0)
      : visibleReviewSectionsBase
  const inventoryWorkspaceTabs =
    content.key === 'inventory'
      ? [
          {
            key: 'overview' as const,
            label: 'Overview',
            description: 'Buka ringkasan inventory lintas proses.',
          },
          {
            key: 'items' as const,
            label: 'Item & Rak',
            description: 'Kelola item master, barcode, dan penataan rak.',
          },
          {
            key: 'requests' as const,
            label: 'Request',
            description: 'Fokus ke permintaan barang dan proses pengambilan.',
          },
          {
            key: 'movements' as const,
            label: 'Movement & Loan',
            description: 'Kontrol barang masuk, movement, pinjaman, dan return.',
          },
          {
            key: 'network' as const,
            label: 'Network & Device',
            description: 'Kelola ODP, port, dan assignment perangkat layanan.',
          },
        ]
      : []
  const visibleSectionsBase: DomainReviewSection[] =
    content.key === 'inventory' && activeInventoryView !== 'overview'
      ? visibleReviewSections.filter((section) => matchesInventoryWorkspaceView(section.title, activeInventoryView))
      : visibleReviewSections
  const inventoryRequestFallbackSection: DomainReviewSection | null =
    content.key === 'inventory' &&
    activeInventoryView === 'requests' &&
    !visibleSectionsBase.some((section) => section.title.toUpperCase().includes('REQUEST INVENTORY'))
      ? {
          title: 'Request Inventory Teknisi',
          description:
            'Request barang harian dari teknisi/internal inventory dengan alur mirip marketplace untuk diproses sampai selesai.',
          rows: [] as DomainReviewRow[],
        }
      : null
  const visibleSections: DomainReviewSection[] = inventoryRequestFallbackSection
    ? [inventoryRequestFallbackSection, ...visibleSectionsBase]
    : visibleSectionsBase
  const supportForms: Array<{
    key: SupportLaneActionKey
    lanes: SupportLaneKey[]
    element: ReactNode
  }> = []

  if (content.key === 'support') {
    if (canUseSupportAction({ role, actionKey: 'ticket-create', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'ticket-create',
        lanes: ['tt'],
        element: (
          <SupportTicketCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            typeSuggestions={supportTypeSuggestions}
            serviceSuggestions={supportServiceSuggestions}
          />
        ),
      })
    }

    if (canUseSupportAction({ role, actionKey: 'ticket-progress', canCreate, canUpdate, canApprove })) {
      supportForms.push(
        {
          key: 'ticket-progress',
          lanes: ['tt', 'sla'],
          element: (
            <SupportTicketProgressForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              ticketSuggestions={supportTicketProgressSuggestions}
              initialTicketCode={supportPrefill?.ticket}
            />
          ),
        },
        {
          key: 'ticket-escalate',
          lanes: ['tt', 'sla'],
          element: (
            <SupportTicketEscalateForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              ticketSuggestions={supportTicketEscalationSuggestions}
              initialTicketCode={supportPrefill?.ticket}
            />
          ),
        },
        {
          key: 'ticket-close',
          lanes: ['tt'],
          element: (
            <SupportTicketCloseForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              ticketSuggestions={supportTicketSuggestions}
              initialTicketCode={supportPrefill?.ticket}
            />
          ),
        },
      )
    }

    if (canUseSupportAction({ role, actionKey: 'sla-manage', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'sla-manage',
        lanes: ['tt', 'sla'],
        element: (
          <SupportSlaForm
            canApprove={canApprove}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            typeSuggestions={supportTypeSuggestions}
            initialTroubleType={supportPrefill?.type}
          />
        ),
      })
    }

    if (canUseSupportAction({ role, actionKey: 'isolation-create', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'isolation-create',
        lanes: ['isolations'],
        element: (
          <SupportIsolationForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            radboxSuggestions={supportRadboxSuggestions}
            marketingSuggestions={supportMarketingSuggestions}
            serviceSuggestions={supportServiceSuggestions}
          />
        ),
      })
    }

    if (canUseSupportAction({ role, actionKey: 'isolation-restore', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'isolation-restore',
        lanes: ['isolations', 'dismantle'],
        element: (
          <SupportIsolationRestoreForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            isolationSuggestions={supportIsolationSuggestions}
            initialIsolationValue={supportPrefill?.isolation}
          />
        ),
      })
    }

    if (canUseSupportAction({ role, actionKey: 'dismantle-approve', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'dismantle-approve',
        lanes: ['isolations', 'dismantle'],
        element: (
          <SupportDismantleForm
            canProcess={canProcessSupportDismantle(role, canApprove)}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            isolationSuggestions={supportIsolationSuggestions}
            initialIsolationValue={supportPrefill?.isolation}
          />
        ),
      })
    }

    if (canUseSupportAction({ role, actionKey: 'dismantle-close', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'dismantle-close',
        lanes: ['dismantle'],
        element: (
          <SupportDismantleCloseForm
            canProcess={canProcessSupportDismantle(role, canApprove)}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            dismantleSuggestions={supportDismantleQueueSuggestions}
            initialDismantleValue={supportPrefill?.dismantle}
          />
        ),
      })
    }

    if (canUseSupportAction({ role, actionKey: 'dismantle-reopen', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'dismantle-reopen',
        lanes: ['dismantle'],
        element: (
          <SupportDismantleReopenForm
            canProcess={canProcessSupportDismantle(role, canApprove)}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            historySuggestions={supportDismantleHistorySuggestions}
            initialHistoryValue={supportPrefill?.dismantleHistory}
          />
        ),
      })
    }
  }
  const primarySupportForms =
    activeSupportWorkspace && content.key === 'support'
      ? supportForms.filter((item) => activeSupportWorkspace.actionKeys.includes(item.key))
      : supportForms
  const laneActionLinks: SupportActionLink[] =
    content.key === 'support' && activeSupportWorkspace
      ? activeSupportWorkspace.actionKeys
          .filter((key) => primarySupportForms.some((item) => item.key === key))
          .map((key) => ({
            key,
            ...supportActionCopyMap[key],
            href: `#${getSupportActionAnchorId(key)}`,
          }))
      : []
  const supportActionModalItems =
    content.key === 'support'
      ? supportForms.map((item) => ({
          key: item.key,
          title: supportActionCopyMap[item.key].label,
          description: supportActionCopyMap[item.key].description,
          element: item.element,
        }))
      : []
  const supportPreventiveOpenCount =
    content.key === 'support'
      ? Number(content.summaries.find((item) => item.label.toLowerCase().includes('preventive open'))?.value.replace(/\D/g, '') ?? '0') || 0
      : 0

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <div className="flex flex-wrap gap-2">
          {domainMenuLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                item.key === content.key
                  ? 'bg-panel text-surface'
                  : 'border border-line bg-surface text-ink'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <p className="section-title">{headerEyebrow}</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
              {headerTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{headerDescription}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={headerPrimaryAction.href}
              className="rounded-full bg-panel px-5 py-3 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
            >
              {headerPrimaryAction.label}
            </Link>
            <Link
              href={headerSecondaryAction.href}
              className="rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-[var(--color-card-subtle)]"
            >
              {headerSecondaryAction.label}
            </Link>
          </div>
        </div>
      </section>

      {content.key === 'support' && supportDrilldown ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-title">{supportDrilldown.label}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{supportDrilldown.detail}</p>
            </div>
            <Link
              href={supportDrilldown.clearHref}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[var(--color-card-subtle)]"
            >
              Reset Fokus
            </Link>
          </div>
        </section>
      ) : null}

      {content.key !== 'support' && domainDrilldown ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-title">{domainDrilldown.label}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{domainDrilldown.detail}</p>
            </div>
            <Link
              href={domainDrilldown.clearHref}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[var(--color-card-subtle)]"
            >
              Reset Fokus
            </Link>
          </div>
        </section>
      ) : null}

      {visibleSections.length > 0 ? (
        <section className="space-y-6">
          {visibleSections.map((section) => {
            const sectionAction = getDomainReviewSectionAction({
              domainKey: content.key,
              sectionTitle: section.title,
              canCreate,
              canUpdate,
              canRequestInventory,
              canProcessInventoryRequest,
              isFieldTechnicianInventory,
            })

            return (
              <div key={section.title} className="panel p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="section-title">{section.title}</p>
                    <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
                      Tabel kerja utama menu
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-mute">{section.description}</p>
                    {section.summary?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {section.summary.map((item) => (
                          <span key={`${section.title}-${item.label}`} className="badge border-line bg-surface text-mute">
                            {item.label}: {item.value}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {sectionAction ? (
                    <Link
                      href={sectionAction.href}
                      className="inline-flex rounded-full border border-panel bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
                    >
                      {sectionAction.label}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-6 overflow-x-auto rounded-3xl border border-line">
                  <table className="min-w-[1080px] w-full divide-y divide-line">
                    <thead className="bg-[var(--color-card-subtle)]">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Ringkasan</th>
                        <th className="px-4 py-3">Metadata</th>
                        <th className="px-4 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {section.rows.length ? (
                        section.rows.map((row) => {
                          const rowAction = getDomainReviewRowAction({
                            domainKey: content.key,
                            sectionTitle: section.title,
                            row,
                            canCreate,
                            canUpdate,
                            canRequestInventory,
                            canProcessInventoryRequest,
                            isFieldTechnicianInventory,
                          })
                          const billingCorrelationSummary =
                            content.key === 'billing' ? buildBillingCorrelationSummary(row, section.title) : null
                          const billingDecisionTrail =
                            content.key === 'billing' ? buildBillingDecisionTrail(row, section.title) : null
                          const billingEvidencePanel =
                            content.key === 'billing' ? buildBillingEvidencePanel(row, section.title) : null
                          const billingHealthSignal =
                            content.key === 'billing' ? buildBillingHealthSignal(row, section.title) : null
                          const billingRecommendedActions =
                            content.key === 'billing' ? buildBillingRecommendedActionMatrix(row, section.title, rowAction) : null
                          const billingActionOutcomeSummary =
                            content.key === 'billing' ? buildBillingActionOutcomeSummary(row, section.title) : null
                          const metaHighlights = getReviewRowMetaHighlights(row.meta)
                          const hiddenMetaCount = Math.max(row.meta.length - metaHighlights.length, 0)
                          const hasBillingContext =
                            Boolean(billingCorrelationSummary) ||
                            Boolean(billingDecisionTrail) ||
                            Boolean(billingEvidencePanel) ||
                            Boolean(billingHealthSignal) ||
                            Boolean(billingRecommendedActions) ||
                            Boolean(billingActionOutcomeSummary)

                          return (
                            <Fragment key={row.id}>
                              <tr className="align-top">
                                <td className="px-4 py-4">
                                  <div className="min-w-[220px]">
                                    <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{row.primary}</p>
                                    <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`badge ${getReviewRowStatusTone(row.status)}`}>{row.status}</span>
                                </td>
                                <td className="px-4 py-4">
                                  <p className="max-w-xl text-sm leading-6 text-mute">{row.detail}</p>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex max-w-sm flex-wrap gap-2">
                                    {metaHighlights.map((item) => (
                                      <span key={`${row.id}-${item}`} className="badge border-line bg-surface text-mute">
                                        {item}
                                      </span>
                                    ))}
                                    {hiddenMetaCount > 0 ? (
                                      <span className="badge border-dashed border-line bg-[var(--color-card-subtle)] text-mute">
                                        +{hiddenMetaCount} meta
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  {rowAction ? (
                                    <div className="flex min-w-[210px] flex-col gap-2">
                                      <Link
                                        href={rowAction.href}
                                        className="inline-flex items-center justify-center rounded-2xl bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
                                      >
                                        {rowAction.label}
                                      </Link>
                                      {rowAction.secondaryLabel && rowAction.secondaryHref ? (
                                        <Link
                                          href={rowAction.secondaryHref}
                                          className="inline-flex items-center justify-center rounded-2xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[var(--color-card-subtle)]"
                                        >
                                          {rowAction.secondaryLabel}
                                        </Link>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-mute">Tidak ada aksi langsung</span>
                                  )}
                                </td>
                              </tr>
                              {hasBillingContext ? (
                                <tr className="bg-[var(--color-card-subtle)]">
                                  <td colSpan={5} className="px-4 py-4">
                                    <div className="grid gap-4 xl:grid-cols-2">
                                      {billingHealthSignal ? (
                                        <CaseHealthSignalCard signal={billingHealthSignal} title="Case Health Signal" />
                                      ) : null}
                                      {billingRecommendedActions ? (
                                        <CaseNextActionMatrixCard
                                          matrix={billingRecommendedActions}
                                          title="Recommended Next Action"
                                        />
                                      ) : null}
                                      {billingActionOutcomeSummary ? (
                                        <CaseActionOutcomeSummaryCard
                                          summary={billingActionOutcomeSummary}
                                          title="Action Outcome Summary"
                                        />
                                      ) : null}
                                      {billingCorrelationSummary ? (
                                        <CaseCorrelationSummaryPanel
                                          summary={billingCorrelationSummary}
                                          title="Ringkasan Korelasi Customer / Service"
                                        />
                                      ) : null}
                                      {billingDecisionTrail ? (
                                        <CaseDecisionTrailPanel
                                          trail={billingDecisionTrail}
                                          title="Decision Trail Billing / Kasus"
                                        />
                                      ) : null}
                                      {billingEvidencePanel ? (
                                        <CaseEvidencePanelCard
                                          evidence={billingEvidencePanel}
                                          title="Evidence Billing / Kasus"
                                        />
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-sm text-mute">
                            Belum ada data review pada section ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </section>
      ) : (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Tabel kerja</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
                Belum ada tabel kerja yang siap ditampilkan
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                Saat ini belum ada section review yang tersedia untuk domain ini. Biasanya karena sumber data belum siap,
                belum ada data yang lolos filter, atau domain belum terintegrasi penuh untuk role ini.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={headerPrimaryAction.href}
                className="inline-flex rounded-full border border-panel bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
              >
                {headerPrimaryAction.label}
              </Link>
              <Link
                href="/import"
                className="inline-flex rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[var(--color-card-subtle)]"
              >
                Buka Import Center
              </Link>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-line">
            <table className="min-w-[1080px] w-full divide-y divide-line">
              <thead className="bg-[var(--color-card-subtle)]">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ringkasan</th>
                  <th className="px-4 py-3">Metadata</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-mute">
                    Tidak ada section tabel kerja untuk domain ini.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {content.summaries.map((item) => (
          <article key={item.label} className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{item.label}</p>
            <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="panel p-6">
          <p className="section-title">Alur utama menu</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            {domainBlueprint.focusTitle}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{domainBlueprint.focusDescription}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {domainBlueprint.flows.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="section-title">Integrasi ERP</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
            Menu ini terhubung langsung dengan proses domain lain
          </h3>
          <p className="mt-3 text-sm leading-6 text-mute">
            Tampilan domain mengikuti PRD: tiap menu tidak berdiri sendiri, tetapi menjadi pintu kerja
            yang terhubung ke modul lain dalam satu ritme operasional ERP.
          </p>
          <div className="mt-6 space-y-3">
            {domainBlueprint.integrations.map((item) => (
              <Link
                key={`${content.key}-${item.label}`}
                href={item.href}
                className="block rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5 transition hover:bg-surface"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.label}</p>
                  <span className="badge border-line bg-surface text-mute">Terhubung</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Status landing</p>
            <p className="mt-3 text-sm leading-6 text-mute">
              {visibleSections.length} section review aktif dan {enabledCapabilities.length} aksi tersedia
              untuk role ini. Artinya menu ini sudah menjadi landing operasional domain, bukan hanya placeholder.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-6">
          <p className="section-title">Highlight domain</p>
          <div className="mt-6 space-y-4">
            {content.highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
                <h3 className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="section-title">Capability aktif</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
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
                    : 'border-line bg-[var(--color-card-subtle)] text-mute'
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Catatan</p>
            <p className="mt-3 text-sm leading-6 text-mute">
              {enabledCapabilities.length} aksi aktif tersedia untuk role ini. Semua modul tetap
              berada dalam satu website agar akses lintas divisi, mobile web, dan Android wrapper
              mengikuti fondasi yang sama.
            </p>
          </div>
        </div>
      </section>

      {content.key === 'inventory' && !hideInventoryWorkspaceTabs ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Workspace Inventory</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
                Pilih area kerja sesuai kebutuhan proses harian
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                Sub menu ini memecah inventory menjadi area kerja yang lebih fokus agar gudang, teknisi, dan operator tidak
                perlu membaca seluruh halaman sekaligus.
              </p>
            </div>
            <span className="badge border-line bg-surface text-mute">
              View aktif: {inventoryWorkspaceTabs.find((item) => item.key === activeInventoryView)?.label || 'Overview'}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {inventoryWorkspaceTabs.map((item) => {
              const active = item.key === activeInventoryView
              return (
                <Link
                  key={item.key}
                  href={getInventoryWorkspaceHref(item.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-panel text-surface'
                      : 'border border-line bg-surface text-ink hover:bg-[var(--color-card-subtle)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-5">
            {inventoryWorkspaceTabs.map((item) => (
              <article
                key={`${item.key}-copy`}
                className={`rounded-2xl border p-4 ${
                  item.key === activeInventoryView ? 'border-panel bg-panel text-surface' : 'border-line bg-[var(--color-card-subtle)]'
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    item.key === activeInventoryView ? 'text-surface' : 'text-[var(--color-ink-strong)]'
                  }`}
                >
                  {item.label}
                </p>
                <p className={`mt-2 text-sm leading-6 ${item.key === activeInventoryView ? 'text-slate-200' : 'text-mute'}`}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {content.key === 'sales' && salesSectionActions.length ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Aksi Sales Prioritas</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
                Review penjualan langsung diarahkan ke langkah pipeline yang sesuai
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                CTA ini membaca antrean lead, coverage, survey, order, work order, dan aktivasi agar tim sales
                tidak perlu menebak form mana yang paling relevan untuk role aktif.
              </p>
            </div>
            <span className="badge border-line bg-surface text-mute">{salesSectionActions.length} aksi tersedia</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {salesSectionActions.map((item) => (
              <article key={item.key} className="rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                <Link
                  href={`#${getSalesActionAnchorId(item.key)}`}
                  className="mt-4 inline-flex rounded-full bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
                >
                  Buka Form
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {content.key === 'inventory' && inventorySectionActions.length ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Aksi Inventory Prioritas</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Review stok, request, dan ODP langsung dihubungkan ke form operasional role aktif
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                Gudang, teknisi, dan operator inventory hanya melihat CTA yang benar-benar bisa mereka kerjakan
                dari antrean request, pinjaman, stok masuk, item master, atau ODP.
              </p>
            </div>
            <span className="badge border-line bg-surface text-mute">{inventorySectionActions.length} aksi tersedia</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {inventorySectionActions
              .filter((item) => activeInventoryView === 'overview' || mapInventoryActionToWorkspaceView(item.key) === activeInventoryView)
              .filter((item) => activeInventoryView === 'overview' || shouldShowInventoryAction(item.key))
              .map((item) => (
              <article key={item.key} className="rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                <Link
                  href={getInventoryWorkspaceHref(mapInventoryActionToWorkspaceView(item.key), getInventoryActionAnchorId(item.key))}
                  className="mt-4 inline-flex rounded-full bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
                >
                  Buka Form
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {content.key === 'hr' && hrSectionActions.length ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Aksi HR Prioritas</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Review employee, attendance, payroll, dan loan langsung mengarah ke form tindak lanjut
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                Panel ini membuat workflow HR lebih fokus karena CTA mengikuti permission create/update serta
                membaca antrean yang memang sedang aktif di review domain.
              </p>
            </div>
            <span className="badge border-line bg-surface text-mute">{hrSectionActions.length} aksi tersedia</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {hrSectionActions.map((item) => (
              <article key={item.key} className="rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
                <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                <Link
                  href={`#${getHrActionAnchorId(item.key)}`}
                  className="mt-4 inline-flex rounded-full bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
                >
                  Buka Form
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {content.key === 'billing' ? (
        <>
          {billingSectionActions.length ? (
            <section className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="section-title">Aksi Billing Prioritas</p>
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                    Antrean review billing langsung dihubungkan ke form yang tersedia untuk role aktif
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                    Panel ini menyaring CTA billing berdasarkan permission create/update agar operator hanya melihat tindakan
                    yang benar-benar bisa dieksekusi dari antrean overdue, promise to pay, suspend, reconnect, dan invoice.
                  </p>
                </div>
                <span className="badge border-slate-200 bg-white text-slate-600">
                  {billingSectionActions.length} aksi tersedia
                </span>
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {billingSectionActions.map((item) => (
                  <article key={item.key} className="rounded-2xl border border-line bg-[var(--color-card-subtle)] p-5">
                    <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.label}</p>
                    <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                    <Link
                      href={`#${getBillingActionAnchorId(item.key)}`}
                      className="mt-4 inline-flex rounded-full bg-panel px-4 py-2 text-sm font-semibold text-surface transition opacity-100 hover:opacity-90"
                    >
                      Buka Form
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {!canCreate && !canUpdate ? (
            <section className="panel p-6">
              <p className="section-title">Mode baca saja</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Role aktif hanya melihat status dan review billing
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                Modul Billing tetap bisa dipantau untuk sinkron lintas domain, tetapi aksi write-side seperti generate invoice,
                update status, payment, dan collection disembunyikan karena permission role ini terbatas.
              </p>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            {canCreate ? (
              <div id={getBillingActionAnchorId('invoice-generate')} className="scroll-mt-24">
                <BillingInvoiceGenerateForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  subscriptionSuggestions={billingSubscriptionSuggestions}
                  initialServiceNo={billingServicePrefillValue}
                />
              </div>
            ) : null}
            {canUpdate ? (
              <div id={getBillingActionAnchorId('invoice-status')} className="scroll-mt-24">
                <BillingInvoiceStatusForm
                  canUpdate={canUpdate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  invoiceSuggestions={billingInvoiceSuggestions}
                  followUpSuggestions={billingCollectionFollowUpSuggestions}
                  reconnectSuggestions={billingReconnectContextSuggestions}
                  suspendBatchSuggestions={billingSuspendReadySuggestions}
                  reconnectBatchSuggestions={billingReconnectReadySuggestions}
                  initialInvoiceNo={billingInvoicePrefillValue}
                />
              </div>
            ) : null}
            {canCreate ? (
              <div id={getBillingActionAnchorId('collection-action')} className="scroll-mt-24">
                <BillingCollectionActionForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  invoiceSuggestions={billingInvoiceSuggestions}
                  batchInvoiceSuggestions={billingCollectionSuggestions}
                  followUpSuggestions={billingCollectionFollowUpSuggestions}
                  promiseToPayBatchSuggestions={billingPromiseToPaySuggestions}
                  suspendBatchSuggestions={billingSuspendReadySuggestions}
                  reconnectBatchSuggestions={billingReconnectReadySuggestions}
                  initialInvoiceNo={billingInvoicePrefillValue}
                />
              </div>
            ) : null}
            {canUpdate ? (
              <div id={getBillingActionAnchorId('collection-resolve')} className="scroll-mt-24">
                <BillingCollectionResolveForm
                  canUpdate={canUpdate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  followUpSuggestions={billingCollectionFollowUpSuggestions}
                  initialInvoiceNo={billingInvoicePrefillValue}
                />
              </div>
            ) : null}
            {canCreate ? (
              <div id={getBillingActionAnchorId('payment-entry')} className="scroll-mt-24">
                <BillingPaymentForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  invoiceSuggestions={billingInvoiceSuggestions}
                  followUpSuggestions={billingCollectionFollowUpSuggestions}
                  initialInvoiceNo={billingInvoicePrefillValue}
                />
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {content.key === 'sales' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <div id={getSalesActionAnchorId('lead-create')} className="scroll-mt-24">
            <SalesLeadCreateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              marketingSuggestions={salesMarketingSuggestions}
            />
          </div>
          <div id={getSalesActionAnchorId('coverage-create')} className="scroll-mt-24">
            <SalesCoverageCreateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              leadSuggestions={salesLeadSuggestions}
              initialLeadValue={salesLeadPrefillValue}
            />
          </div>
          <div id={getSalesActionAnchorId('survey-create')} className="scroll-mt-24">
            <SalesSurveyCreateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              leadSuggestions={salesLeadSuggestions}
              initialLeadValue={salesLeadPrefillValue}
            />
          </div>
          <div id={getSalesActionAnchorId('order-create')} className="scroll-mt-24">
            <SalesOrderCreateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              leadSuggestions={salesLeadSuggestions}
              marketingSuggestions={salesMarketingSuggestions}
              initialLeadValue={salesLeadPrefillValue}
            />
          </div>
          <div id={getSalesActionAnchorId('work-order-create')} className="scroll-mt-24">
            <SalesWorkOrderCreateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              orderSuggestions={salesOrderSuggestions}
              initialOrderValue={salesOrderPrefillValue}
            />
          </div>
          <div id={getSalesActionAnchorId('subscription-activate')} className="scroll-mt-24">
            <SalesSubscriptionActivateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              orderSuggestions={salesOrderSuggestions}
              initialOrderValue={salesOrderPrefillValue}
            />
          </div>
        </section>
      ) : null}

      {content.key === 'customers' ? (
        <CustomerCreateForm
          canCreate={canCreate}
          reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
        />
      ) : null}

      {content.key === 'inventory' ? (
        <>
          {shouldShowInventoryAction('odp-create') ||
          shouldShowInventoryAction('odp-port-assign') ||
          shouldShowInventoryAction('odp-port-status') ||
          shouldShowInventoryAction('device-assignment') ||
          shouldShowInventoryAction('device-return') ? (
            <InventoryNetworkOpsPanel
              sections={visibleSections}
              canCreate={canCreate}
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              itemSuggestions={inventoryItemSuggestions}
              odpSuggestions={inventoryOdpSuggestions}
              assignmentSuggestions={inventoryAssignmentSuggestions}
              lifecycleItems={inventoryLifecycleItems}
              showDeviceReturnForm={!isFieldTechnicianInventory && shouldShowInventoryAction('device-return')}
            />
          ) : null}
          {shouldShowInventoryAction('item-request') || shouldShowInventoryAction('request-status') ? (
            <InventoryRequestOpsPanel
              sections={visibleSections}
              canRequestCreate={canRequestInventory}
              canProcessRequest={canProcessInventoryRequest}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              itemSuggestions={inventoryItemSuggestions}
              requestSuggestions={inventoryRequestSuggestions}
              rackSuggestions={inventoryRackSuggestions}
              movementRows={inventoryMovementRows}
              requireScan={requireInventoryPickupScan}
              initialItemValue={inventoryItemPrefillValue}
              initialRequestValue={inventoryRequestPrefillValue}
            />
          ) : null}
          {shouldShowInventoryAction('item-loan') || shouldShowInventoryAction('loan-return') ? (
            <InventoryLoanOpsPanel
              sections={visibleSections}
              canCreate={canCreate}
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              itemSuggestions={inventoryItemSuggestions}
              rackSuggestions={inventoryRackSuggestions}
              loanSuggestions={inventoryLoanSuggestions}
              requireScan={requireInventoryPickupScan}
              initialItemValue={inventoryItemPrefillValue}
              initialLoanValue={inventoryLoanPrefillValue}
            />
          ) : null}
          {shouldShowInventoryAction('stock-receipt') || shouldShowInventoryAction('stock-movement') ? (
            <InventoryStockReceiptPanel
              sections={visibleSections}
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              itemSuggestions={inventoryItemSuggestions}
              rackSuggestions={inventoryRackSuggestions}
              requireScan={requireInventoryPickupScan}
              initialItemValue={inventoryItemPrefillValue}
            />
          ) : null}
          {shouldShowInventoryAction('rack-layout') || shouldShowInventoryAction('item-create') ? (
            <InventoryItemBarcodePanel
              sections={content.reviewSections ?? visibleSections}
              canCreate={canCreate}
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              lifecycleItems={inventoryLifecycleItems}
            />
          ) : null}
        </>
      ) : null}

      {content.key === 'hr' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <div id={getHrActionAnchorId('kpi-entry')} className="scroll-mt-24">
            <HrEmployeeKpiForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              employeeSuggestions={hrEmployeeSuggestions}
              initialEmployeeValue={hrEmployeePrefillValue}
            />
          </div>
          <div id={getHrActionAnchorId('employee-create')} className="scroll-mt-24">
            <HrEmployeeCreateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            />
          </div>
          <div id={getHrActionAnchorId('employee-archive')} className="scroll-mt-24">
            <HrEmployeeArchiveForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              employeeSuggestions={hrEmployeeArchiveSuggestions}
              initialEmployeeValue={hrEmployeePrefillValue}
            />
          </div>
          <div id={getHrActionAnchorId('employee-reactivate')} className="scroll-mt-24">
            <HrEmployeeReactivateForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              employeeSuggestions={hrEmployeeReactivateSuggestions}
              initialEmployeeValue={hrEmployeePrefillValue}
            />
          </div>
          <div id={getHrActionAnchorId('face-reference')} className="scroll-mt-24">
            <HrEmployeeFaceReferenceForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              employeeSuggestions={hrEmployeeFaceReferenceSuggestions}
              trendSuggestions={hrEmployeeFaceReferenceTrendSuggestions}
              verifiedCaptureSuggestions={hrEmployeeVerifiedFaceCandidateSuggestions}
            />
          </div>
          <div id={getHrActionAnchorId('attendance-create')} className="scroll-mt-24">
            <HrAttendanceForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              employeeSuggestions={hrEmployeeSuggestions}
              geofenceConfig={hrAttendanceGeofenceConfig}
              faceConfig={hrAttendanceFaceConfig}
            />
          </div>
          <div id={getHrActionAnchorId('face-config')} className="scroll-mt-24">
            <HrAttendanceFaceConfigForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              initialConfig={hrAttendanceFaceConfig}
            />
          </div>
          <div id={getHrActionAnchorId('face-review')} className="scroll-mt-24">
            <HrAttendanceFaceReviewForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              reviewSuggestions={hrAttendanceFaceReviewSuggestions}
            />
          </div>
          <div id={getHrActionAnchorId('geofence-config')} className="scroll-mt-24">
            <HrAttendanceGeofenceForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              initialConfig={hrAttendanceGeofenceConfig}
            />
          </div>
          <div id={getHrActionAnchorId('attendance-update')} className="scroll-mt-24">
            <HrAttendanceUpdateForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              attendanceSuggestions={hrAttendanceSuggestions}
              initialAttendanceValue={hrAttendancePrefillValue}
            />
          </div>
          <div id={getHrActionAnchorId('loan-create')} className="scroll-mt-24">
            <HrLoanCreateForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              employeeSuggestions={hrEmployeeSuggestions}
            />
          </div>
          <div id={getHrActionAnchorId('salary-create')} className="scroll-mt-24">
            <HrSalarySlipForm
              canCreate={canCreate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              employeeSuggestions={hrEmployeeSuggestions}
              initialEmployeeValue={hrEmployeePrefillValue}
            />
          </div>
          <div id={getHrActionAnchorId('loan-status')} className="scroll-mt-24">
            <HrLoanStatusForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              loanSuggestions={hrLoanSuggestions}
              initialLoanValue={hrLoanPrefillValue}
            />
          </div>
          <div id={getHrActionAnchorId('loan-void')} className="scroll-mt-24">
            <HrLoanVoidForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              loanSuggestions={hrLoanVoidSuggestions}
            />
          </div>
          <div id={getHrActionAnchorId('salary-release')} className="scroll-mt-24">
            <HrSalarySlipReleaseForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              salarySlipSuggestions={hrSalarySlipSuggestions}
              initialSalarySlipValue={hrSalarySlipPrefillValue}
            />
          </div>
          <div id={getHrActionAnchorId('salary-void')} className="scroll-mt-24">
            <HrSalarySlipVoidForm
              canUpdate={canUpdate}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              salarySlipSuggestions={hrSalarySlipVoidSuggestions}
            />
          </div>
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
          {supportPageMode === 'lane' && activeSupportLane === 'tt' ? (
            <SupportTroubleTicketQueuePanel
              sections={visibleSections}
              role={role}
              canUpdate={canUpdate}
              canApprove={canApprove}
              preventiveOpenCount={supportPreventiveOpenCount}
            />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'isolations' ? (
            <SupportIsolationQueuePanel
              sections={visibleSections}
              actionLinks={laneActionLinks}
              role={role}
              canUpdate={canUpdate}
              canApprove={canApprove}
            />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'dismantle' ? (
            <SupportDismantleQueuePanel
              sections={visibleSections}
              actionLinks={laneActionLinks}
              role={role}
              canUpdate={canUpdate}
              canApprove={canApprove}
            />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'sla' ? (
            <SupportSlaQueuePanel sections={visibleSections} actionLinks={laneActionLinks} role={role} />
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
          {supportPageMode === 'domain' && supportFocusCopy && activeSupportLaneMeta && supportRoleMeta ? (
            <section className="panel p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="section-title">
                    {selectedSupportLane ? supportFocusCopy.eyebrow : `Default role: ${supportFocusCopy.eyebrow}`}
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
                    {supportFocusCopy.title}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{supportFocusCopy.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${activeSupportLaneMeta.accent}`}>{activeSupportLaneMeta.shortLabel}</span>
                  <span className={`badge border-transparent ${supportRoleMeta.tone}`}>{supportRoleMeta.shortLabel}</span>
                  {!selectedSupportLane ? <span className="badge border-line bg-surface text-mute">workspace default</span> : null}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/support" className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink">
                  Semua lane
                </Link>
                {(supportFocus?.lanes ?? []).map((lane) => {
                  return (
                    <Link
                      key={lane.key}
                      href={getSupportLanePath(lane.key)}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        lane.key === activeSupportLane
                          ? 'bg-panel text-surface'
                          : 'border border-line bg-surface text-ink'
                      }`}
                    >
                      {lane.shortLabel}
                    </Link>
                  )
                })}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {supportActionModalItems.length ? (
        <SupportActionFormModal
          items={supportActionModalItems}
          heading={activeSupportLane ? `Form aksi lane ${activeSupportLaneMeta?.shortLabel ?? activeSupportLane}` : 'Form aksi support'}
        />
      ) : null}

    </div>
  )
}
