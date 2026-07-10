import Link from 'next/link'
import type { ReactNode } from 'react'
import { BillingCollectionActionForm } from '@/components/billing-collection-action-form'
import { BillingCollectionResolveForm } from '@/components/billing-collection-resolve-form'
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
import { HrEmployeeFaceReferenceForm } from '@/components/hr-employee-face-reference-form'
import { HrEmployeeReactivateForm } from '@/components/hr-employee-reactivate-form'
import { HrLoanCreateForm } from '@/components/hr-loan-create-form'
import { HrLoanStatusForm } from '@/components/hr-loan-status-form'
import { HrLoanVoidForm } from '@/components/hr-loan-void-form'
import { HrSalarySlipReleaseForm } from '@/components/hr-salary-slip-release-form'
import { HrSalarySlipForm } from '@/components/hr-salary-slip-form'
import { HrSalarySlipVoidForm } from '@/components/hr-salary-slip-void-form'
import { InventoryDeviceAssignmentForm } from '@/components/inventory-device-assignment-form'
import { InventoryNetworkOpsPanel } from '@/components/inventory-network-ops-panel'
import { InventoryDeviceReturnForm } from '@/components/inventory-device-return-form'
import { InventoryItemRequestForm } from '@/components/inventory-item-request-form'
import { InventoryItemCreateForm } from '@/components/inventory-item-create-form'
import { InventoryItemLoanForm } from '@/components/inventory-item-loan-form'
import { InventoryLoanOpsPanel } from '@/components/inventory-loan-ops-panel'
import { InventoryLoanReturnForm } from '@/components/inventory-loan-return-form'
import { InventoryOdpCreateForm } from '@/components/inventory-odp-create-form'
import { InventoryOdpPortAssignForm } from '@/components/inventory-odp-port-assign-form'
import { InventoryOdpPortStatusForm } from '@/components/inventory-odp-port-status-form'
import { InventoryRequestOpsPanel } from '@/components/inventory-request-ops-panel'
import { InventoryRequestStatusForm } from '@/components/inventory-request-status-form'
import { InventoryStockReceiptForm } from '@/components/inventory-stock-receipt-form'
import { InventoryStockReceiptPanel } from '@/components/inventory-stock-receipt-panel'
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
import { getSupportActionAnchorId } from '@/lib/support-action-links'
import { canProcessSupportDismantle, canUseSupportAction, getSupportLanePath } from '@/lib/support-lanes'
import type {
  AppRole,
  DomainCapability,
  DomainFormPrefill,
  DomainKey,
  DomainPageContent,
  DataSourceSnapshot,
  DomainReviewRow,
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
    description: 'Finalisasi terminasi pelanggan yang memang sudah siap dipindahkan ke proses dismantle.',
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
  if (title.includes('PORT') && params.canCreate && !params.isFieldTechnicianInventory) {
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
          href: `#${getInventoryActionAnchorId(action.key)}`,
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
}) {
  const title = params.sectionTitle.trim().toUpperCase()
  const rowStatus = params.row.status.trim().toUpperCase()
  const collectionStatus = pickReviewMetaValue(params.row.meta, 'Collection Status: ').toUpperCase()
  const followUpState = pickReviewMetaValue(params.row.meta, 'Follow Up State: ').toUpperCase()
  const suspendCandidate = pickReviewMetaValue(params.row.meta, 'Suspend Candidate: ').toUpperCase()
  const orderId = pickReviewMetaValue(params.row.meta, 'Order ID: ')
  const orderCode = pickReviewMetaValue(params.row.meta, 'Order: ')

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
      }
    }
    if (params.canUpdate && (title.includes('SUSPEND') || suspendCandidate === 'YA')) {
      return {
        label: 'Proses Suspend',
        href: buildPrefillHref(getBillingActionAnchorId('invoice-status'), { invoice: params.row.primary }),
      }
    }
    if (params.canUpdate && (title.includes('COLLECTION FOLLOW UP') || followUpState === 'OVERDUE' || followUpState === 'SCHEDULED')) {
      return {
        label: 'Resolve Follow Up',
        href: buildPrefillHref(getBillingActionAnchorId('collection-resolve'), { invoice: params.row.primary }),
      }
    }
    if (params.canCreate && (title.includes('PROMISE TO PAY') || title.includes('PERLU TINDAK LANJUT'))) {
      return {
        label: 'Tindak Collection',
        href: buildPrefillHref(getBillingActionAnchorId('collection-action'), { invoice: params.row.primary }),
      }
    }
    if (params.canCreate && title.includes('SUBSCRIPTION BILLING-READY')) {
      return {
        label: 'Generate Invoice',
        href: buildPrefillHref(getBillingActionAnchorId('invoice-generate'), { service: params.row.primary }),
      }
    }
    if (params.canCreate && title.includes('INVOICE')) {
      return {
        label: 'Catat Payment',
        href: buildPrefillHref(getBillingActionAnchorId('payment-entry'), { invoice: params.row.primary }),
      }
    }
  }

  if (params.domainKey === 'inventory') {
    if (title.includes('REQUEST') && params.canProcessInventoryRequest) {
      return {
        label: 'Proses Request',
        href: buildPrefillHref(getInventoryActionAnchorId('request-status'), {
          request: extractEntityValueFromRowId(params.row.id, 'REQ') || params.row.primary,
        }),
      }
    }
    if (title.includes('REQUEST') && params.canRequestInventory) {
      return { label: 'Ajukan Request', href: `#${getInventoryActionAnchorId('item-request')}` }
    }
    if ((title.includes('RETURN') || title.includes('DEVICE RETURN')) && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Return Perangkat', href: `#${getInventoryActionAnchorId('device-return')}` }
    }
    if (title.includes('ASSIGNMENT') && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Assign Perangkat', href: `#${getInventoryActionAnchorId('device-assignment')}` }
    }
    if (title.includes('LOAN') && params.canUpdate && !params.isFieldTechnicianInventory) {
      return {
        label: 'Proses Pengembalian',
        href: buildPrefillHref(getInventoryActionAnchorId('loan-return'), {
          loan: extractEntityValueFromRowId(params.row.id, 'LOAN') || params.row.primary,
        }),
      }
    }
    if (title.includes('LOAN') && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Pinjamkan Barang', href: `#${getInventoryActionAnchorId('item-loan')}` }
    }
    if (title.includes('PORT') && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Atur Port', href: `#${getInventoryActionAnchorId('odp-port-status')}` }
    }
    if (title.includes('ODP') && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Kelola ODP', href: `#${getInventoryActionAnchorId('odp-create')}` }
    }
    if (title.includes('STOCK MOVEMENT') && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Gerakkan Stok', href: `#${getInventoryActionAnchorId('stock-movement')}` }
    }
    if ((title.includes('STOCK') || title.includes('RECEIPT')) && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Barang Masuk', href: `#${getInventoryActionAnchorId('stock-receipt')}` }
    }
    if (title.includes('ITEM') && params.canCreate && !params.isFieldTechnicianInventory) {
      return { label: 'Kelola Item', href: `#${getInventoryActionAnchorId('item-create')}` }
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
}) {
  const enabledCapabilities = capabilities.filter((item) => item.enabled)
  const canCreate = capabilities.some((item) => item.action === 'create' && item.enabled)
  const canUpdate = capabilities.some((item) => item.action === 'update' && item.enabled)
  const canApprove = capabilities.some((item) => item.action === 'approve' && item.enabled)
  const canRequestInventory = content.key === 'inventory' ? role === 'FIELD_TECHNICIAN' || canCreate : false
  const canProcessInventoryRequest =
    content.key === 'inventory' ? role !== 'FIELD_TECHNICIAN' && (canApprove || canUpdate || canCreate) : false
  const isFieldTechnicianInventory = content.key === 'inventory' && role === 'FIELD_TECHNICIAN'
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
            return requestId ? `${requestId} | ${row.primary} | ${subdivision} | ${row.status}` : ''
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
  const visibleSections = visibleReviewSections
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
          />
        ),
      })
    }

    if (canUseSupportAction({ role, actionKey: 'isolation-restore', canCreate, canUpdate, canApprove })) {
      supportForms.push({
        key: 'isolation-restore',
        lanes: ['isolations'],
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
  }
  const primarySupportForms =
    activeSupportWorkspace && content.key === 'support'
      ? supportForms.filter((item) => activeSupportWorkspace.actionKeys.includes(item.key))
      : supportForms
  const secondarySupportForms =
    activeSupportWorkspace && content.key === 'support' && supportPageMode === 'domain'
      ? supportForms.filter((item) => !activeSupportWorkspace.actionKeys.includes(item.key))
      : []
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
                  ? 'bg-slate-950 text-white'
                  : 'border border-line bg-white text-slate-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <p className="section-title">{headerEyebrow}</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {headerTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{headerDescription}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={headerPrimaryAction.href}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              {headerPrimaryAction.label}
            </Link>
            <Link
              href={headerSecondaryAction.href}
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
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
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
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
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Reset Fokus
            </Link>
          </div>
        </section>
      ) : null}

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

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="panel p-6">
          <p className="section-title">Alur utama menu</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {domainBlueprint.focusTitle}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{domainBlueprint.focusDescription}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {domainBlueprint.flows.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <p className="section-title">Integrasi ERP</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
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
                className="block rounded-2xl border border-line bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                  <span className="badge border-slate-200 bg-white text-slate-600">Terhubung</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-5">
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

      {content.key === 'sales' && salesSectionActions.length ? (
        <section className="panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-title">Aksi Sales Prioritas</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Review penjualan langsung diarahkan ke langkah pipeline yang sesuai
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
                CTA ini membaca antrean lead, coverage, survey, order, work order, dan aktivasi agar tim sales
                tidak perlu menebak form mana yang paling relevan untuk role aktif.
              </p>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{salesSectionActions.length} aksi tersedia</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {salesSectionActions.map((item) => (
              <article key={item.key} className="rounded-2xl border border-line bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                <Link
                  href={`#${getSalesActionAnchorId(item.key)}`}
                  className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
            <span className="badge border-slate-200 bg-white text-slate-600">{inventorySectionActions.length} aksi tersedia</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {inventorySectionActions.map((item) => (
              <article key={item.key} className="rounded-2xl border border-line bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                <Link
                  href={`#${getInventoryActionAnchorId(item.key)}`}
                  className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
            <span className="badge border-slate-200 bg-white text-slate-600">{hrSectionActions.length} aksi tersedia</span>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {hrSectionActions.map((item) => (
              <article key={item.key} className="rounded-2xl border border-line bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                <Link
                  href={`#${getHrActionAnchorId(item.key)}`}
                  className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
                  <article key={item.key} className="rounded-2xl border border-line bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-3 text-sm leading-6 text-mute">{item.description}</p>
                    <Link
                      href={`#${getBillingActionAnchorId(item.key)}`}
                      className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
          <InventoryNetworkOpsPanel sections={visibleSections} />
          <InventoryRequestOpsPanel sections={visibleSections} />
          <InventoryLoanOpsPanel sections={visibleSections} />
          <InventoryStockReceiptPanel sections={visibleSections} />
          <section className="grid gap-6 xl:grid-cols-2">
            <div id={getInventoryActionAnchorId('item-request')} className="scroll-mt-24">
              <InventoryItemRequestForm
                canCreate={canRequestInventory}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                itemSuggestions={inventoryItemSuggestions}
              />
            </div>
            {canProcessInventoryRequest ? (
              <div id={getInventoryActionAnchorId('request-status')} className="scroll-mt-24">
                <InventoryRequestStatusForm
                  canCreate={canProcessInventoryRequest}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  requestSuggestions={inventoryRequestSuggestions}
                  initialRequestValue={inventoryRequestPrefillValue}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('stock-receipt')} className="scroll-mt-24">
                <InventoryStockReceiptForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  itemSuggestions={inventoryItemSuggestions}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('item-loan')} className="scroll-mt-24">
                <InventoryItemLoanForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  itemSuggestions={inventoryItemSuggestions}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('loan-return')} className="scroll-mt-24">
                <InventoryLoanReturnForm
                  canUpdate={canUpdate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  loanSuggestions={inventoryLoanSuggestions}
                  initialLoanValue={inventoryLoanPrefillValue}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('item-create')} className="scroll-mt-24">
                <InventoryItemCreateForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('stock-movement')} className="scroll-mt-24">
                <InventoryStockMovementForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  itemSuggestions={inventoryItemSuggestions}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('odp-create')} className="scroll-mt-24">
                <InventoryOdpCreateForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('odp-port-assign')} className="scroll-mt-24">
                <InventoryOdpPortAssignForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  odpSuggestions={inventoryOdpSuggestions}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('odp-port-status')} className="scroll-mt-24">
                <InventoryOdpPortStatusForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  odpSuggestions={inventoryOdpSuggestions}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('device-assignment')} className="scroll-mt-24">
                <InventoryDeviceAssignmentForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  itemSuggestions={inventoryItemSuggestions}
                />
              </div>
            ) : null}
            {!isFieldTechnicianInventory ? (
              <div id={getInventoryActionAnchorId('device-return')} className="scroll-mt-24">
                <InventoryDeviceReturnForm
                  canCreate={canCreate}
                  reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                  assignmentSuggestions={inventoryAssignmentSuggestions}
                />
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {content.key === 'hr' ? (
        <section className="grid gap-6 xl:grid-cols-2">
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
              actionLinks={laneActionLinks}
              canUpdate={canUpdate}
              canApprove={canApprove}
            />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'isolations' ? (
            <SupportIsolationQueuePanel sections={visibleSections} actionLinks={laneActionLinks} />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'dismantle' ? (
            <SupportDismantleQueuePanel sections={visibleSections} actionLinks={laneActionLinks} />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'sla' ? (
            <SupportSlaQueuePanel sections={visibleSections} actionLinks={laneActionLinks} />
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
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                    {supportFocusCopy.title}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{supportFocusCopy.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${activeSupportLaneMeta.accent}`}>{activeSupportLaneMeta.shortLabel}</span>
                  <span className={`badge border-transparent ${supportRoleMeta.tone}`}>{supportRoleMeta.shortLabel}</span>
                  {!selectedSupportLane ? <span className="badge border-slate-200 bg-white text-slate-600">workspace default</span> : null}
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/support" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700">
                  Semua lane
                </Link>
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
                  <div key={item.key} id={getSupportActionAnchorId(item.key)} className="scroll-mt-24">
                    {item.element}
                  </div>
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
                  <div key={item.key} id={getSupportActionAnchorId(item.key)} className="scroll-mt-24">
                    {item.element}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {visibleSections.length > 0 ? (
        <section className="grid gap-6 xl:grid-cols-2">
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
                    <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                      Review operasional awal dari data domain
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-mute">{section.description}</p>
                    {section.summary?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {section.summary.map((item) => (
                          <span key={`${section.title}-${item.label}`} className="badge border-slate-200 bg-white text-slate-600">
                            {item.label}: {item.value}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {sectionAction ? (
                    <Link
                      href={sectionAction.href}
                      className="inline-flex rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {sectionAction.label}
                    </Link>
                  ) : null}
                </div>
                <div className="mt-6 space-y-3">
                  {section.rows.map((row) => {
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

                    return (
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
                        {rowAction ? (
                          <div className="mt-4">
                            <Link
                              href={rowAction.href}
                              className="inline-flex rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              {rowAction.label}
                            </Link>
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {row.meta.map((item) => (
                            <span key={`${row.id}-${item}`} className="badge border-slate-200 bg-white text-slate-600">
                              {item}
                            </span>
                          ))}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}
    </div>
  )
}
