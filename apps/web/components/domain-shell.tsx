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
import { getSupportLanePath } from '@/lib/support-lanes'
import type {
  AppRole,
  DomainCapability,
  DomainPageContent,
  DataSourceSnapshot,
  SupportActionLink,
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

export function DomainShell({
  content,
  source,
  capabilities,
  role,
  supportFocus,
  supportPageMode = 'domain',
  supportPrefill,
}: {
  content: DomainPageContent
  source: DataSourceSnapshot
  capabilities: DomainCapability[]
  role: AppRole
  supportFocus?: DomainSupportFocus
  supportPageMode?: 'domain' | 'lane'
  supportPrefill?: SupportFormPrefill
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
            key: 'ticket-progress',
            lanes: ['tt', 'sla'] as SupportLaneKey[],
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
            lanes: ['tt', 'sla'] as SupportLaneKey[],
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
            lanes: ['tt'] as SupportLaneKey[],
            element: (
              <SupportTicketCloseForm
                canUpdate={canUpdate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                ticketSuggestions={supportTicketSuggestions}
                initialTicketCode={supportPrefill?.ticket}
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
                initialTroubleType={supportPrefill?.type}
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
                initialIsolationValue={supportPrefill?.isolation}
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
                initialIsolationValue={supportPrefill?.isolation}
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
    activeSupportWorkspace && content.key === 'support' && supportPageMode === 'domain'
      ? supportForms.filter((item) => !activeSupportWorkspace.actionKeys.includes(item.key))
      : []
  const laneActionLinks: SupportActionLink[] =
    content.key === 'support' && activeSupportWorkspace
      ? activeSupportWorkspace.actionKeys.map((key) => ({
          key,
          ...supportActionCopyMap[key],
          href: `#${getSupportActionAnchorId(key)}`,
        }))
      : []

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
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
            followUpSuggestions={billingCollectionFollowUpSuggestions}
            suspendBatchSuggestions={billingSuspendReadySuggestions}
            reconnectBatchSuggestions={billingReconnectReadySuggestions}
          />
          <BillingCollectionActionForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            invoiceSuggestions={billingInvoiceSuggestions}
            batchInvoiceSuggestions={billingCollectionSuggestions}
            followUpSuggestions={billingCollectionFollowUpSuggestions}
            promiseToPayBatchSuggestions={billingPromiseToPaySuggestions}
            suspendBatchSuggestions={billingSuspendReadySuggestions}
            reconnectBatchSuggestions={billingReconnectReadySuggestions}
          />
          <BillingCollectionResolveForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            followUpSuggestions={billingCollectionFollowUpSuggestions}
          />
          <BillingPaymentForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            invoiceSuggestions={billingInvoiceSuggestions}
            followUpSuggestions={billingCollectionFollowUpSuggestions}
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
        <>
          <InventoryNetworkOpsPanel sections={visibleReviewSections} />
          <InventoryRequestOpsPanel sections={visibleReviewSections} />
          <InventoryLoanOpsPanel sections={visibleReviewSections} />
          <InventoryStockReceiptPanel sections={visibleReviewSections} />
          <section className="grid gap-6 xl:grid-cols-2">
            <InventoryItemRequestForm
              canCreate={canRequestInventory}
              reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              itemSuggestions={inventoryItemSuggestions}
            />
            {canProcessInventoryRequest ? (
              <InventoryRequestStatusForm
                canCreate={canProcessInventoryRequest}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                requestSuggestions={inventoryRequestSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryStockReceiptForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                itemSuggestions={inventoryItemSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryItemLoanForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                itemSuggestions={inventoryItemSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryLoanReturnForm
                canUpdate={canUpdate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                loanSuggestions={inventoryLoanSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryItemCreateForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryStockMovementForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                itemSuggestions={inventoryItemSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryOdpCreateForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryOdpPortAssignForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                odpSuggestions={inventoryOdpSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryOdpPortStatusForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                odpSuggestions={inventoryOdpSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryDeviceAssignmentForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                itemSuggestions={inventoryItemSuggestions}
              />
            ) : null}
            {!isFieldTechnicianInventory ? (
              <InventoryDeviceReturnForm
                canCreate={canCreate}
                reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
                assignmentSuggestions={inventoryAssignmentSuggestions}
              />
            ) : null}
          </section>
        </>
      ) : null}

      {content.key === 'hr' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <HrEmployeeCreateForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
          />
          <HrEmployeeArchiveForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            employeeSuggestions={hrEmployeeArchiveSuggestions}
          />
          <HrEmployeeReactivateForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            employeeSuggestions={hrEmployeeReactivateSuggestions}
          />
          <HrEmployeeFaceReferenceForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            employeeSuggestions={hrEmployeeFaceReferenceSuggestions}
            trendSuggestions={hrEmployeeFaceReferenceTrendSuggestions}
            verifiedCaptureSuggestions={hrEmployeeVerifiedFaceCandidateSuggestions}
          />
          <HrAttendanceForm
            canCreate={canCreate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            employeeSuggestions={hrEmployeeSuggestions}
            geofenceConfig={hrAttendanceGeofenceConfig}
            faceConfig={hrAttendanceFaceConfig}
          />
          <HrAttendanceFaceConfigForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            initialConfig={hrAttendanceFaceConfig}
          />
          <HrAttendanceFaceReviewForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            reviewSuggestions={hrAttendanceFaceReviewSuggestions}
          />
          <HrAttendanceGeofenceForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            initialConfig={hrAttendanceGeofenceConfig}
          />
          <HrAttendanceUpdateForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            attendanceSuggestions={hrAttendanceSuggestions}
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
          <HrLoanStatusForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            loanSuggestions={hrLoanSuggestions}
          />
          <HrLoanVoidForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            loanSuggestions={hrLoanVoidSuggestions}
          />
          <HrSalarySlipReleaseForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            salarySlipSuggestions={hrSalarySlipSuggestions}
          />
          <HrSalarySlipVoidForm
            canUpdate={canUpdate}
            reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
            salarySlipSuggestions={hrSalarySlipVoidSuggestions}
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
          {supportPageMode === 'lane' && activeSupportLane === 'tt' ? (
            <SupportTroubleTicketQueuePanel sections={visibleReviewSections} actionLinks={laneActionLinks} />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'isolations' ? (
            <SupportIsolationQueuePanel sections={visibleReviewSections} actionLinks={laneActionLinks} />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'dismantle' ? (
            <SupportDismantleQueuePanel sections={visibleReviewSections} actionLinks={laneActionLinks} />
          ) : null}
          {supportPageMode === 'lane' && activeSupportLane === 'sla' ? (
            <SupportSlaQueuePanel sections={visibleReviewSections} actionLinks={laneActionLinks} />
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
