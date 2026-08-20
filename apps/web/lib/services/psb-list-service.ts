import { getConfiguredDataMode, getFallbackDataSourceSnapshot, getDataSourceSnapshot } from '@/lib/data-source'
import type { AppSession } from '@/lib/auth-session'
import {
  type PsbActivationStatus,
  type PsbBillingStatus,
  type PsbListItem,
  type PsbListPagePayload,
  type PsbListQuery,
  type PsbListStatus,
  type PsbListTransitionAction,
} from '@/lib/psb-list-shared'
import {
  getReviewDbErrorDetail,
  hasReviewDbColumn,
  invalidateReviewDbColumnCache,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
} from '@/lib/review-db'
import {
  buildServiceWorkOrderInsertPayload,
  ensureServiceWorkOrderStatusLogTable,
  generateServiceWorkOrderNo,
  resolveReviewAuthUserIdByUsername,
} from '@/lib/services/field-ops-service'
import type { AppRole, DataSourceSnapshot } from '@/lib/types'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type ReviewDbPsbListRow = {
  id: number
  psbListCode: string | null
  customerName: string | null
  customerPhone: string | null
  addressText: string | null
  odpCode: string | null
  odpPortLabel: string | null
  packageLabel: string | null
  salesOwnerName: string | null
  requestedInstallDate: string | null
  status: string | null
  reviewNotes: string | null
  correctionNotes: string | null
  transferredTicketRef: string | null
  transferredWorkOrderId: number | null
  workOrderCode: string | null
  technicianName: string | null
  onuSerialNumber: string | null
  activationStatus: string | null
  billingStatus: string | null
  createdAt: string | null
  updatedAt: string | null
  reviewedAt: string | null
  approvedAt: string | null
  transferredAt: string | null
  workOrderCreatedAt: string | null
  technicianAssignedAt: string | null
  installationStartedAt: string | null
  onuInstalledAt: string | null
  odpPortAssignedAt: string | null
  radiusActivatedAt: string | null
  customerActiveAt: string | null
  invoiceGeneratedAt: string | null
  firstPaymentReceivedAt: string | null
  areaLabel: string | null
  googleMapsLink: string | null
  escortNotes: string | null
  activityNotes: string | null
  csPicName: string | null
  nextActionLabel: string | null
}

type ReviewDbAuditRow = {
  eventType: string | null
  toStatus: string | null
  notes: string | null
}

type ReviewDbOwnerRow = {
  ownerName: string | null
}

type ReviewDbCountRow = {
  total: number
}

type TransferablePsbListRow = ReviewDbPsbListRow & {
  transferredWorkOrderId: number | null
}

const mockPsbListItems: PsbListItem[] = [
  {
    id: 101,
    psbListCode: 'PSB/19.07.2026/0001',
    customerName: 'Ahmad Hidayat',
    customerPhone: '628523110022',
    addressText: 'Perum Griya Pati Indah Blok C2 No. 8, Pati Kidul',
    odpCode: 'ODP-PTI-02',
    odpPortLabel: 'PORT-03',
    packageLabel: 'Home 20 Mbps',
    salesOwnerName: 'Dhimas',
    requestedInstallDate: '2026-07-20T09:00:00+07:00',
    status: 'BARU',
    reviewNotes: null,
    correctionNotes: null,
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    workOrderCode: null,
    technicianName: null,
    onuSerialNumber: null,
    activationStatus: 'PENDING',
    billingStatus: 'NOT_GENERATED',
    createdAt: '2026-07-19T08:12:00+07:00',
    updatedAt: '2026-07-19T08:12:00+07:00',
    reviewedAt: null,
    approvedAt: null,
    transferredAt: null,
    workOrderCreatedAt: null,
    technicianAssignedAt: null,
    installationStartedAt: null,
    onuInstalledAt: null,
    odpPortAssignedAt: null,
    radiusActivatedAt: null,
    customerActiveAt: null,
    invoiceGeneratedAt: null,
    firstPaymentReceivedAt: null,
    areaLabel: 'Pati Kota',
    googleMapsLink: 'https://maps.google.com/?q=-6.745204,111.038785',
    escortNotes: 'Marketing meminta pemasangan pagi karena customer standby di rumah.',
    activityNotes: 'Lead sudah lolos coverage dan menunggu review awal CS.',
    csPicName: null,
    nextActionLabel: 'Masuk review CS',
    auditSummary: ['Input Penjualan', 'Coverage siap', 'Menunggu validasi CS'],
    timelineEvents: [
      { key: 'PSB_CREATED', label: 'PSB dibuat', happenedAt: '2026-07-19T08:12:00+07:00', actorLabel: 'Dhimas', notes: 'Input data via Workspace Penjualan' },
      { key: 'CS_REVIEWED', label: 'CS Review', happenedAt: null, actorLabel: null, notes: null },
      { key: 'APPROVED', label: 'Approved', happenedAt: null, actorLabel: null, notes: null },
      { key: 'WO_CREATED', label: 'WO dibuat', happenedAt: null, actorLabel: null, notes: null },
      { key: 'TECHNICIAN_ASSIGNED', label: 'Teknisi assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'INSTALLATION_SCHEDULED', label: 'Instalasi', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ONU_INSTALLED', label: 'ONU installed', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ODP_PORT_ASSIGNED', label: 'ODP Port assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'RADIUS_ACTIVATED', label: 'Radius activated', happenedAt: null, actorLabel: null, notes: null },
      { key: 'CUSTOMER_ACTIVE', label: 'Customer active', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_INVOICE_GENERATED', label: 'Invoice bulan pertama', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_PAYMENT_RECEIVED', label: 'Pembayaran diterima', happenedAt: null, actorLabel: null, notes: null },
    ],
  },
  {
    id: 102,
    psbListCode: 'PSB/18.07.2026/0002',
    customerName: 'Rina Setyawati',
    customerPhone: '628133445566',
    addressText: 'Ds. Sukoharjo RT 03 RW 01, Margorejo',
    odpCode: 'ODP-MRG-11',
    odpPortLabel: 'PORT-08',
    packageLabel: 'Home 30 Mbps',
    salesOwnerName: 'Kantor',
    requestedInstallDate: '2026-07-20T13:30:00+07:00',
    status: 'REVIEW_CS',
    reviewNotes: 'Alamat dan titik rumah sudah cocok, tinggal cek slot ODP dan kesiapan jadwal teknisi.',
    correctionNotes: null,
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    workOrderCode: null,
    technicianName: null,
    onuSerialNumber: null,
    activationStatus: 'PENDING',
    billingStatus: 'NOT_GENERATED',
    createdAt: '2026-07-18T14:10:00+07:00',
    updatedAt: '2026-07-19T09:45:00+07:00',
    reviewedAt: '2026-07-19T08:30:00+07:00',
    approvedAt: null,
    transferredAt: null,
    workOrderCreatedAt: null,
    technicianAssignedAt: null,
    installationStartedAt: null,
    onuInstalledAt: null,
    odpPortAssignedAt: null,
    radiusActivatedAt: null,
    customerActiveAt: null,
    invoiceGeneratedAt: null,
    firstPaymentReceivedAt: null,
    areaLabel: 'Margorejo',
    googleMapsLink: 'https://maps.google.com/?q=-6.748800,111.021700',
    escortNotes: 'Sudah dikawal oleh penjualan, customer responsif via WhatsApp.',
    activityNotes: 'Perlu cek ulang ketersediaan port sebelum transfer ke ticketing.',
    csPicName: 'Admin CS Pagi',
    nextActionLabel: 'Validasi slot ODP',
    auditSummary: ['Input Penjualan', 'Masuk review CS', 'Butuh cek ODP'],
    timelineEvents: [
      { key: 'PSB_CREATED', label: 'PSB dibuat', happenedAt: '2026-07-18T14:10:00+07:00', actorLabel: 'Kantor', notes: 'Form Input PSB disubmit sales' },
      { key: 'CS_REVIEWED', label: 'CS Review', happenedAt: '2026-07-19T08:30:00+07:00', actorLabel: 'Admin CS Pagi', notes: 'Validasi biodata dan alamat' },
      { key: 'APPROVED', label: 'Approved', happenedAt: null, actorLabel: null, notes: null },
      { key: 'WO_CREATED', label: 'WO dibuat', happenedAt: null, actorLabel: null, notes: null },
      { key: 'TECHNICIAN_ASSIGNED', label: 'Teknisi assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'INSTALLATION_SCHEDULED', label: 'Instalasi', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ONU_INSTALLED', label: 'ONU installed', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ODP_PORT_ASSIGNED', label: 'ODP Port assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'RADIUS_ACTIVATED', label: 'Radius activated', happenedAt: null, actorLabel: null, notes: null },
      { key: 'CUSTOMER_ACTIVE', label: 'Customer active', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_INVOICE_GENERATED', label: 'Invoice bulan pertama', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_PAYMENT_RECEIVED', label: 'Pembayaran diterima', happenedAt: null, actorLabel: null, notes: null },
    ],
  },
  {
    id: 103,
    psbListCode: 'PSB/18.07.2026/0003',
    customerName: 'PT Maju Lancar Abadi',
    customerPhone: '62295214567',
    addressText: 'Kawasan Industri Margorejo Blok C2',
    odpCode: 'ODP-KIM-03',
    odpPortLabel: 'PORT-02',
    packageLabel: 'Dedicated 50 Mbps',
    salesOwnerName: 'Chalis',
    requestedInstallDate: '2026-07-21T10:00:00+07:00',
    status: 'PERLU_KOREKSI',
    reviewNotes: 'Jadwal bisa lanjut setelah penjualan melengkapi PIC onsite dan akses gerbang.',
    correctionNotes: 'Lengkapi nama PIC onsite, jam akses pabrik, dan nomor penanggung jawab lapangan.',
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    workOrderCode: null,
    technicianName: null,
    onuSerialNumber: null,
    activationStatus: 'PENDING',
    billingStatus: 'NOT_GENERATED',
    createdAt: '2026-07-18T11:20:00+07:00',
    updatedAt: '2026-07-19T10:20:00+07:00',
    reviewedAt: '2026-07-19T09:50:00+07:00',
    approvedAt: null,
    transferredAt: null,
    workOrderCreatedAt: null,
    technicianAssignedAt: null,
    installationStartedAt: null,
    onuInstalledAt: null,
    odpPortAssignedAt: null,
    radiusActivatedAt: null,
    customerActiveAt: null,
    invoiceGeneratedAt: null,
    firstPaymentReceivedAt: null,
    areaLabel: 'Margorejo Industri',
    googleMapsLink: 'https://maps.google.com/?q=-6.752100,111.018400',
    escortNotes: 'Customer corporate minta teknisi datang setelah jam 10 pagi.',
    activityNotes: 'Dokumen akses site belum lengkap.',
    csPicName: 'CS Operator 02',
    nextActionLabel: 'Tunggu koreksi penjualan',
    auditSummary: ['Input Penjualan', 'Masuk review CS', 'Dikembalikan untuk koreksi'],
    timelineEvents: [
      { key: 'PSB_CREATED', label: 'PSB dibuat', happenedAt: '2026-07-18T11:20:00+07:00', actorLabel: 'Chalis', notes: 'Corporate client Kawasan Industri' },
      { key: 'CS_REVIEWED', label: 'CS Review', happenedAt: '2026-07-19T09:50:00+07:00', actorLabel: 'CS Operator 02', notes: 'Butuh dokumen akses pabrik' },
      { key: 'APPROVED', label: 'Approved', happenedAt: null, actorLabel: null, notes: null },
      { key: 'WO_CREATED', label: 'WO dibuat', happenedAt: null, actorLabel: null, notes: null },
      { key: 'TECHNICIAN_ASSIGNED', label: 'Teknisi assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'INSTALLATION_SCHEDULED', label: 'Instalasi', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ONU_INSTALLED', label: 'ONU installed', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ODP_PORT_ASSIGNED', label: 'ODP Port assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'RADIUS_ACTIVATED', label: 'Radius activated', happenedAt: null, actorLabel: null, notes: null },
      { key: 'CUSTOMER_ACTIVE', label: 'Customer active', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_INVOICE_GENERATED', label: 'Invoice bulan pertama', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_PAYMENT_RECEIVED', label: 'Pembayaran diterima', happenedAt: null, actorLabel: null, notes: null },
    ],
  },
  {
    id: 104,
    psbListCode: 'PSB/18.07.2026/0004',
    customerName: 'Budi Santoso',
    customerPhone: '628987654321',
    addressText: 'Jl. Melati No. 12, Pati Lor',
    odpCode: 'ODP-PTL-04',
    odpPortLabel: 'PORT-04',
    packageLabel: 'Home 20 Mbps',
    salesOwnerName: 'Dhimas',
    requestedInstallDate: '2026-07-19T15:00:00+07:00',
    status: 'DISETUJUI',
    reviewNotes: 'Semua data valid, slot ODP tersedia, siap dibuatkan ticket PSB.',
    correctionNotes: null,
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    workOrderCode: null,
    technicianName: null,
    onuSerialNumber: null,
    activationStatus: 'ODP_PORT_ASSIGNED',
    billingStatus: 'INVOICE_DRAFT',
    createdAt: '2026-07-18T16:35:00+07:00',
    updatedAt: '2026-07-19T11:05:00+07:00',
    reviewedAt: '2026-07-19T09:00:00+07:00',
    approvedAt: '2026-07-19T11:05:00+07:00',
    transferredAt: null,
    workOrderCreatedAt: null,
    technicianAssignedAt: null,
    installationStartedAt: null,
    onuInstalledAt: null,
    odpPortAssignedAt: '2026-07-19T10:30:00+07:00',
    radiusActivatedAt: null,
    customerActiveAt: null,
    invoiceGeneratedAt: null,
    firstPaymentReceivedAt: null,
    areaLabel: 'Pati Lor',
    googleMapsLink: 'https://maps.google.com/?q=-6.747950,111.036540',
    escortNotes: 'Rumah mudah ditemukan, titik maps sudah dibagikan.',
    activityNotes: 'Menunggu transfer ke ticketing PSB.',
    csPicName: 'Admin CS Pagi',
    nextActionLabel: 'Transfer ke ticketing',
    auditSummary: ['Input Penjualan', 'Review selesai', 'Disetujui CS'],
    timelineEvents: [
      { key: 'PSB_CREATED', label: 'PSB dibuat', happenedAt: '2026-07-18T16:35:00+07:00', actorLabel: 'Dhimas', notes: 'Residential Pati Lor' },
      { key: 'CS_REVIEWED', label: 'CS Review', happenedAt: '2026-07-19T09:00:00+07:00', actorLabel: 'Admin CS Pagi', notes: 'Data valid' },
      { key: 'APPROVED', label: 'Approved', happenedAt: '2026-07-19T11:05:00+07:00', actorLabel: 'Admin CS Pagi', notes: 'Slot ODP tersedia, approve transfer' },
      { key: 'WO_CREATED', label: 'WO dibuat', happenedAt: null, actorLabel: null, notes: null },
      { key: 'TECHNICIAN_ASSIGNED', label: 'Teknisi assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'INSTALLATION_SCHEDULED', label: 'Instalasi', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ONU_INSTALLED', label: 'ONU installed', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ODP_PORT_ASSIGNED', label: 'ODP Port assigned', happenedAt: '2026-07-19T10:30:00+07:00', actorLabel: 'NOC', notes: 'Port 04 di ODP-PTL-04 tersedia' },
      { key: 'RADIUS_ACTIVATED', label: 'Radius activated', happenedAt: null, actorLabel: null, notes: null },
      { key: 'CUSTOMER_ACTIVE', label: 'Customer active', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_INVOICE_GENERATED', label: 'Invoice bulan pertama', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_PAYMENT_RECEIVED', label: 'Pembayaran diterima', happenedAt: null, actorLabel: null, notes: null },
    ],
  },
  {
    id: 105,
    psbListCode: 'PSB/17.07.2026/0005',
    customerName: 'Lina Maharani',
    customerPhone: '628111000222',
    addressText: 'Perumahan Graha Asri Blok B7, Tlogowungu',
    odpCode: 'ODP-TLG-07',
    odpPortLabel: 'PORT-12',
    packageLabel: 'Home 20 Mbps',
    salesOwnerName: 'Kantor',
    requestedInstallDate: '2026-07-22T08:30:00+07:00',
    status: 'DITRANSFER_KE_TICKETING',
    reviewNotes: 'Data lengkap dan sudah diteruskan ke ticketing.',
    correctionNotes: null,
    transferredTicketRef: 'PSB/19.07.2026/0188',
    transferredWorkOrderId: 5421,
    workOrderCode: 'WO-20260719-00421',
    technicianName: 'Andi Wijaya',
    onuSerialNumber: 'ONU-HW-82104-A1B2',
    activationStatus: 'CUSTOMER_ACTIVE',
    billingStatus: 'FIRST_PAYMENT_RECEIVED',
    createdAt: '2026-07-17T09:00:00+07:00',
    updatedAt: '2026-07-19T07:40:00+07:00',
    reviewedAt: '2026-07-17T15:40:00+07:00',
    approvedAt: '2026-07-17T18:10:00+07:00',
    transferredAt: '2026-07-18T07:30:00+07:00',
    workOrderCreatedAt: '2026-07-18T10:15:00+07:00',
    technicianAssignedAt: '2026-07-18T11:20:00+07:00',
    installationStartedAt: '2026-07-19T13:40:00+07:00',
    onuInstalledAt: '2026-07-19T14:10:00+07:00',
    odpPortAssignedAt: '2026-07-19T14:20:00+07:00',
    radiusActivatedAt: '2026-07-19T14:30:00+07:00',
    customerActiveAt: '2026-07-19T14:31:00+07:00',
    invoiceGeneratedAt: '2026-07-19T15:10:00+07:00',
    firstPaymentReceivedAt: '2026-07-19T16:25:00+07:00',
    areaLabel: 'Tlogowungu',
    googleMapsLink: 'https://maps.google.com/?q=-6.677430,111.019840',
    escortNotes: 'Customer sudah konfirmasi pemasangan minggu ini.',
    activityNotes: 'Ticket PSB sudah dibuat dan siap diteruskan ke teknisi.',
    csPicName: 'CS Operator 01',
    nextActionLabel: 'Monitor ticket',
    auditSummary: ['Input Penjualan', 'Disetujui CS', 'Ditrasfer ke ticketing'],
    timelineEvents: [
      { key: 'PSB_CREATED', label: 'PSB dibuat', happenedAt: '2026-07-17T09:00:00+07:00', actorLabel: 'Kantor', notes: 'Submit data via form Input PSB' },
      { key: 'CS_REVIEWED', label: 'CS Review', happenedAt: '2026-07-17T15:40:00+07:00', actorLabel: 'CS Operator 01', notes: 'Cek data dan coverage ODP' },
      { key: 'APPROVED', label: 'Approved', happenedAt: '2026-07-17T18:10:00+07:00', actorLabel: 'Admin CS Pagi', notes: 'Slot ODP port 12 tersedia' },
      { key: 'WO_CREATED', label: 'WO dibuat', happenedAt: '2026-07-18T10:15:00+07:00', actorLabel: 'NOC', notes: 'Work Order WO-20260719-00421 dibuat' },
      { key: 'TECHNICIAN_ASSIGNED', label: 'Teknisi assigned', happenedAt: '2026-07-18T11:20:00+07:00', actorLabel: 'Andi Wijaya', notes: 'Teknisi lapangan ditugaskan' },
      { key: 'INSTALLATION_SCHEDULED', label: 'Instalasi', happenedAt: '2026-07-19T13:40:00+07:00', actorLabel: 'Andi Wijaya', notes: 'Datang ke lokasi sesuai jadwal' },
      { key: 'ONU_INSTALLED', label: 'ONU installed', happenedAt: '2026-07-19T14:10:00+07:00', actorLabel: 'Andi Wijaya', notes: 'Serial ONU-HW-82104-A1B2 terpasang' },
      { key: 'ODP_PORT_ASSIGNED', label: 'ODP Port assigned', happenedAt: '2026-07-19T14:20:00+07:00', actorLabel: 'NOC', notes: 'ODP-TLG-07 · PORT-12 aktif' },
      { key: 'RADIUS_ACTIVATED', label: 'Radius activated', happenedAt: '2026-07-19T14:30:00+07:00', actorLabel: 'NOC / Radius', notes: 'PPPoE username berhasil create & sync Mikrotik' },
      { key: 'CUSTOMER_ACTIVE', label: 'Customer active', happenedAt: '2026-07-19T14:31:00+07:00', actorLabel: 'CS Operator 01', notes: 'Internet normal, konfirmasi ke customer' },
      { key: 'BILLING_INVOICE_GENERATED', label: 'Invoice bulan pertama', happenedAt: '2026-07-19T15:10:00+07:00', actorLabel: 'Finance', notes: 'Generate INV-202607-00042 tagihan bulan pertama' },
      { key: 'BILLING_PAYMENT_RECEIVED', label: 'Pembayaran diterima', happenedAt: '2026-07-19T16:25:00+07:00', actorLabel: 'Finance', notes: 'Transfer VA BCA masuk, status LUNAS' },
    ],
  },
  {
    id: 106,
    psbListCode: 'PSB/17.07.2026/0006',
    customerName: 'Toko Berkah Jaya',
    customerPhone: '628123456789',
    addressText: 'Jl. Raya Tayu Km. 3, Tayu',
    odpCode: null,
    odpPortLabel: null,
    packageLabel: 'Home 10 Mbps',
    salesOwnerName: 'Dhimas',
    requestedInstallDate: '2026-07-23T14:00:00+07:00',
    status: 'DITOLAK',
    reviewNotes: 'Coverage tidak siap dan customer meminta pindah alamat setelah submit.',
    correctionNotes: 'Perlu input ulang setelah alamat final dan hasil coverage baru tersedia.',
    transferredTicketRef: null,
    transferredWorkOrderId: null,
    workOrderCode: null,
    technicianName: null,
    onuSerialNumber: null,
    activationStatus: 'PENDING',
    billingStatus: 'NOT_GENERATED',
    createdAt: '2026-07-17T13:15:00+07:00',
    updatedAt: '2026-07-18T10:10:00+07:00',
    reviewedAt: '2026-07-18T09:40:00+07:00',
    approvedAt: null,
    transferredAt: null,
    workOrderCreatedAt: null,
    technicianAssignedAt: null,
    installationStartedAt: null,
    onuInstalledAt: null,
    odpPortAssignedAt: null,
    radiusActivatedAt: null,
    customerActiveAt: null,
    invoiceGeneratedAt: null,
    firstPaymentReceivedAt: null,
    areaLabel: 'Tayu',
    googleMapsLink: 'https://maps.google.com/?q=-6.539970,111.113620',
    escortNotes: 'Masih menunggu alamat final dari penjualan.',
    activityNotes: 'Jalur instalasi belum layak.',
    csPicName: 'Admin CS Sore',
    nextActionLabel: 'Tunggu submit ulang',
    auditSummary: ['Input Penjualan', 'Review CS', 'Ditolak karena data belum layak'],
    timelineEvents: [
      { key: 'PSB_CREATED', label: 'PSB dibuat', happenedAt: '2026-07-17T13:15:00+07:00', actorLabel: 'Dhimas', notes: 'Submit awal dari toko' },
      { key: 'CS_REVIEWED', label: 'CS Review', happenedAt: '2026-07-18T09:40:00+07:00', actorLabel: 'Admin CS Sore', notes: 'Coverage tayu km3 belum layak' },
      { key: 'APPROVED', label: 'Approved', happenedAt: null, actorLabel: null, notes: 'Ditolak karena coverage & data' },
      { key: 'WO_CREATED', label: 'WO dibuat', happenedAt: null, actorLabel: null, notes: null },
      { key: 'TECHNICIAN_ASSIGNED', label: 'Teknisi assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'INSTALLATION_SCHEDULED', label: 'Instalasi', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ONU_INSTALLED', label: 'ONU installed', happenedAt: null, actorLabel: null, notes: null },
      { key: 'ODP_PORT_ASSIGNED', label: 'ODP Port assigned', happenedAt: null, actorLabel: null, notes: null },
      { key: 'RADIUS_ACTIVATED', label: 'Radius activated', happenedAt: null, actorLabel: null, notes: null },
      { key: 'CUSTOMER_ACTIVE', label: 'Customer active', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_INVOICE_GENERATED', label: 'Invoice bulan pertama', happenedAt: null, actorLabel: null, notes: null },
      { key: 'BILLING_PAYMENT_RECEIVED', label: 'Pembayaran diterima', happenedAt: null, actorLabel: null, notes: null },
    ],
  },
]

const transitionMap: Record<PsbListTransitionAction, { from: PsbListStatus[]; to: PsbListStatus }> = {
  SUBMIT_REVIEW: {
    from: ['BARU', 'PERLU_KOREKSI'],
    to: 'REVIEW_CS',
  },
  REQUEST_CORRECTION: {
    from: ['REVIEW_CS'],
    to: 'PERLU_KOREKSI',
  },
  APPROVE: {
    from: ['REVIEW_CS'],
    to: 'DISETUJUI',
  },
  REJECT: {
    from: ['REVIEW_CS'],
    to: 'DITOLAK',
  },
  TRANSFER: {
    from: ['DISETUJUI'],
    to: 'DITRANSFER_KE_TICKETING',
  },
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveInt(value: string | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function normalizeStatus(value: string | null | undefined): PsbListStatus {
  const normalized = normalizeText(value)
  if (
    normalized === 'BARU' ||
    normalized === 'REVIEW_CS' ||
    normalized === 'PERLU_KOREKSI' ||
    normalized === 'DISETUJUI' ||
    normalized === 'DITOLAK' ||
    normalized === 'DITRANSFER_KE_TICKETING'
  ) {
    return normalized
  }

  return 'BARU'
}

function buildNextActionLabel(status: PsbListStatus) {
  switch (status) {
    case 'BARU':
      return 'Masuk review CS'
    case 'REVIEW_CS':
      return 'Putuskan review'
    case 'PERLU_KOREKSI':
      return 'Tunggu koreksi penjualan'
    case 'DISETUJUI':
      return 'Transfer ke ticketing'
    case 'DITRANSFER_KE_TICKETING':
      return 'Monitor ticket'
    case 'DITOLAK':
      return 'Tunggu submit ulang'
    default:
      return 'Pantau antrean'
  }
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function normalizeRequestedInstallDate(value: string | null | undefined) {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized.replace('T', ' ')}:00`
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.replace('T', ' ')
  }

  throw new Error('Format jadwal permintaan PSB tidak valid.')
}

async function generatePsbListCode() {
  const now = new Date()
  const datePart = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`
  const rows = await runReviewDbQuery<{ psbListCode: string | null }>(
    `
      SELECT psb_list_code AS psbListCode
      FROM sales_psb_lists
      WHERE psb_list_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    ['PSB/%'],
  )

  const latestCode = String(rows[0]?.psbListCode ?? '').trim()
  const lastSlashIndex = latestCode.lastIndexOf('/')
  const latestSequenceText = lastSlashIndex >= 0 ? latestCode.slice(lastSlashIndex + 1) : '0'
  const latestSequence = Number.parseInt(latestSequenceText, 10)
  const nextSequence = Number.isFinite(latestSequence) && latestSequence > 0 ? latestSequence + 1 : 1

  return `PSB/${datePart}/${String(nextSequence).padStart(4, '0')}`
}

function buildFallbackSnapshot(detail: string) {
  return getFallbackDataSourceSnapshot(detail)
}

function mapReviewDbRowToPsbListItem(row: ReviewDbPsbListRow): PsbListItem {
  const status = normalizeStatus(row.status)
  const activationStatus =
    (row.activationStatus === 'PENDING' ||
      row.activationStatus === 'ONU_ASSIGNED' ||
      row.activationStatus === 'ODP_PORT_ASSIGNED' ||
      row.activationStatus === 'RADIUS_ACTIVATED' ||
      row.activationStatus === 'CUSTOMER_ACTIVE'
      ? row.activationStatus
      : null) ??
    (row.customerActiveAt
      ? 'CUSTOMER_ACTIVE'
      : row.radiusActivatedAt
        ? 'RADIUS_ACTIVATED'
        : row.odpPortAssignedAt
          ? 'ODP_PORT_ASSIGNED'
          : row.onuInstalledAt
            ? 'ONU_ASSIGNED'
            : 'PENDING')
  const billingStatus =
    (row.billingStatus === 'NOT_GENERATED' ||
      row.billingStatus === 'INVOICE_DRAFT' ||
      row.billingStatus === 'INVOICE_SENT' ||
      row.billingStatus === 'FIRST_PAYMENT_RECEIVED'
      ? row.billingStatus
      : null) ??
    (row.firstPaymentReceivedAt
      ? 'FIRST_PAYMENT_RECEIVED'
      : row.invoiceGeneratedAt
        ? 'INVOICE_SENT'
        : status === 'DITRANSFER_KE_TICKETING'
          ? 'INVOICE_DRAFT'
          : 'NOT_GENERATED')

  return {
    id: Number(row.id),
    psbListCode: String(row.psbListCode ?? '-'),
    customerName: String(row.customerName ?? 'Customer belum diisi'),
    customerPhone: row.customerPhone,
    addressText: String(row.addressText ?? '-'),
    odpCode: row.odpCode,
    odpPortLabel: row.odpPortLabel,
    packageLabel: row.packageLabel,
    salesOwnerName: row.salesOwnerName,
    requestedInstallDate: row.requestedInstallDate,
    status,
    reviewNotes: row.reviewNotes,
    correctionNotes: row.correctionNotes,
    transferredTicketRef: row.transferredTicketRef,
    transferredWorkOrderId: row.transferredWorkOrderId != null ? Number(row.transferredWorkOrderId) : null,
    workOrderCode: row.workOrderCode,
    technicianName: row.technicianName,
    onuSerialNumber: row.onuSerialNumber,
    activationStatus: activationStatus as PsbActivationStatus,
    billingStatus: billingStatus as PsbBillingStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviewedAt: row.reviewedAt,
    approvedAt: row.approvedAt,
    transferredAt: row.transferredAt,
    workOrderCreatedAt: row.workOrderCreatedAt,
    technicianAssignedAt: row.technicianAssignedAt,
    installationStartedAt: row.installationStartedAt,
    onuInstalledAt: row.onuInstalledAt,
    odpPortAssignedAt: row.odpPortAssignedAt,
    radiusActivatedAt: row.radiusActivatedAt,
    customerActiveAt: row.customerActiveAt,
    invoiceGeneratedAt: row.invoiceGeneratedAt,
    firstPaymentReceivedAt: row.firstPaymentReceivedAt,
    areaLabel: row.areaLabel,
    googleMapsLink: row.googleMapsLink,
    escortNotes: row.escortNotes,
    activityNotes: row.activityNotes,
    csPicName: row.csPicName,
    nextActionLabel: row.nextActionLabel?.trim() || buildNextActionLabel(status),
    auditSummary: [],
    timelineEvents: [],
  }
}

async function ensurePsbListColumn(columnName: string, definitionSql: string, afterColumn: string) {
  if (await hasReviewDbColumn('sales_psb_lists', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE sales_psb_lists
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('sales_psb_lists', columnName)
}

async function ensurePsbListAuditColumn(columnName: string, definitionSql: string, afterColumn: string) {
  if (await hasReviewDbColumn('sales_psb_list_audits', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE sales_psb_list_audits
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('sales_psb_list_audits', columnName)
}

export async function ensurePsbListTables() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS sales_psb_lists (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        psb_list_code VARCHAR(40) NOT NULL,
        customer_name VARCHAR(180) NOT NULL,
        customer_phone VARCHAR(40) NULL,
        address_text TEXT NOT NULL,
        odp_code VARCHAR(60) NULL,
        package_label VARCHAR(120) NULL,
        sales_owner_name VARCHAR(120) NULL,
        requested_install_date DATETIME NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'BARU',
        review_notes TEXT NULL,
        correction_notes TEXT NULL,
        transferred_ticket_ref VARCHAR(80) NULL,
        area_label VARCHAR(120) NULL,
        google_maps_link TEXT NULL,
        escort_notes TEXT NULL,
        activity_notes TEXT NULL,
        cs_pic_name VARCHAR(120) NULL,
        next_action_label VARCHAR(150) NULL,
        approved_by VARCHAR(150) NULL,
        approved_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_sales_psb_lists_code (psb_list_code),
        KEY idx_sales_psb_lists_status (status),
        KEY idx_sales_psb_lists_owner (sales_owner_name),
        KEY idx_sales_psb_lists_schedule (requested_install_date)
      )
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS sales_psb_list_audits (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        psb_list_id BIGINT UNSIGNED NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        from_status VARCHAR(40) NULL,
        to_status VARCHAR(40) NULL,
        actor_name VARCHAR(150) NOT NULL,
        actor_role VARCHAR(80) NOT NULL,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sales_psb_list_audits_item (psb_list_id),
        KEY idx_sales_psb_list_audits_event (event_type),
        CONSTRAINT fk_sales_psb_list_audits_item FOREIGN KEY (psb_list_id) REFERENCES sales_psb_lists(id)
      )
    `,
  )

  await ensurePsbListColumn('area_label', 'area_label VARCHAR(120) NULL', 'transferred_ticket_ref')
  await ensurePsbListColumn('google_maps_link', 'google_maps_link TEXT NULL', 'area_label')
  await ensurePsbListColumn('escort_notes', 'escort_notes TEXT NULL', 'google_maps_link')
  await ensurePsbListColumn('activity_notes', 'activity_notes TEXT NULL', 'escort_notes')
  await ensurePsbListColumn('cs_pic_name', 'cs_pic_name VARCHAR(120) NULL', 'activity_notes')
  await ensurePsbListColumn('next_action_label', 'next_action_label VARCHAR(150) NULL', 'cs_pic_name')
  await ensurePsbListColumn('approved_by', 'approved_by VARCHAR(150) NULL', 'next_action_label')
  await ensurePsbListColumn('approved_at', 'approved_at DATETIME NULL', 'approved_by')
  await ensurePsbListColumn('transferred_work_order_id', 'transferred_work_order_id BIGINT UNSIGNED NULL', 'transferred_ticket_ref')
  await ensurePsbListColumn('work_order_code', 'work_order_code VARCHAR(80) NULL', 'transferred_work_order_id')
  await ensurePsbListColumn('technician_name', 'technician_name VARCHAR(150) NULL', 'work_order_code')
  await ensurePsbListColumn('onu_serial_number', 'onu_serial_number VARCHAR(120) NULL', 'technician_name')
  await ensurePsbListColumn('odp_port_label', 'odp_port_label VARCHAR(80) NULL', 'odp_code')
  await ensurePsbListColumn('reviewed_at', 'reviewed_at DATETIME NULL', 'updated_at')
  await ensurePsbListColumn('transferred_by', 'transferred_by VARCHAR(150) NULL', 'transferred_work_order_id')
  await ensurePsbListColumn('transferred_at', 'transferred_at DATETIME NULL', 'transferred_by')
  await ensurePsbListColumn('work_order_created_at', 'work_order_created_at DATETIME NULL', 'transferred_at')
  await ensurePsbListColumn('technician_assigned_at', 'technician_assigned_at DATETIME NULL', 'work_order_created_at')
  await ensurePsbListColumn('installation_started_at', 'installation_started_at DATETIME NULL', 'technician_assigned_at')
  await ensurePsbListColumn('onu_installed_at', 'onu_installed_at DATETIME NULL', 'installation_started_at')
  await ensurePsbListColumn('odp_port_assigned_at', 'odp_port_assigned_at DATETIME NULL', 'onu_installed_at')
  await ensurePsbListColumn('radius_activated_at', 'radius_activated_at DATETIME NULL', 'odp_port_assigned_at')
  await ensurePsbListColumn('customer_active_at', 'customer_active_at DATETIME NULL', 'radius_activated_at')
  await ensurePsbListColumn('invoice_generated_at', 'invoice_generated_at DATETIME NULL', 'customer_active_at')
  await ensurePsbListColumn('first_payment_received_at', 'first_payment_received_at DATETIME NULL', 'invoice_generated_at')
  await ensurePsbListColumn('activation_status', "activation_status VARCHAR(40) NOT NULL DEFAULT 'PENDING'", 'onu_serial_number')
  await ensurePsbListColumn('billing_status', "billing_status VARCHAR(40) NOT NULL DEFAULT 'NOT_GENERATED'", 'activation_status')

  await ensurePsbListAuditColumn('from_status', 'from_status VARCHAR(40) NULL', 'event_type')
  await ensurePsbListAuditColumn('to_status', 'to_status VARCHAR(40) NULL', 'from_status')
  await ensurePsbListAuditColumn('actor_name', "actor_name VARCHAR(150) NOT NULL DEFAULT 'system'", 'to_status')
  await ensurePsbListAuditColumn('actor_role', "actor_role VARCHAR(80) NOT NULL DEFAULT 'SYSTEM'", 'actor_name')
  await ensurePsbListAuditColumn('notes', 'notes TEXT NULL', 'actor_role')
  await ensurePsbListAuditColumn('created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP', 'notes')
}

export async function ensurePsbListBaselineSeeds() {
  await ensurePsbListTables()

  const rows = await runReviewDbQuery<ReviewDbCountRow>(
    `
      SELECT COUNT(*) AS total
      FROM sales_psb_lists
    `,
  )
  if (Number(rows[0]?.total ?? 0) > 0) {
    return
  }

  const itemPlaceholders = mockPsbListItems.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
  const itemValues: Array<number | string | null> = []
  for (const item of mockPsbListItems) {
    itemValues.push(
      item.id,
      item.psbListCode,
      item.customerName,
      item.customerPhone,
      item.addressText,
      item.odpCode,
      item.packageLabel,
      item.salesOwnerName,
      item.requestedInstallDate,
      item.status,
      item.reviewNotes,
      item.correctionNotes,
      item.transferredTicketRef,
      item.areaLabel,
      item.googleMapsLink,
      item.escortNotes,
      item.activityNotes,
      item.csPicName,
      item.nextActionLabel,
      item.status === 'DISETUJUI' ? 'seed-system' : null,
      item.status === 'DISETUJUI' ? item.updatedAt : null,
      item.createdAt,
    )
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_psb_lists (
        id,
        psb_list_code,
        customer_name,
        customer_phone,
        address_text,
        odp_code,
        package_label,
        sales_owner_name,
        requested_install_date,
        status,
        review_notes,
        correction_notes,
        transferred_ticket_ref,
        area_label,
        google_maps_link,
        escort_notes,
        activity_notes,
        cs_pic_name,
        next_action_label,
        approved_by,
        approved_at,
        created_at
      )
      VALUES ${itemPlaceholders}
    `,
    itemValues,
  )

  const auditPlaceholders: string[] = []
  const auditValues: Array<number | string | null> = []
  for (const item of mockPsbListItems) {
    for (const note of item.auditSummary) {
      auditPlaceholders.push('(?, ?, ?, ?, ?, ?, ?)')
      auditValues.push(item.id, 'SEED', null, item.status, 'system', 'SYSTEM', note)
    }
  }

  if (auditPlaceholders.length) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_psb_list_audits (
          psb_list_id,
          event_type,
          from_status,
          to_status,
          actor_name,
          actor_role,
          notes
        )
        VALUES ${auditPlaceholders.join(', ')}
      `,
      auditValues,
    )
  }
}

type ReviewDbStatusSummaryRow = {
  totalCount: number | string
  baruCount: number | string
  reviewCount: number | string
  correctionCount: number | string
  approvedCount: number | string
  rejectedCount: number | string
  transferredCount: number | string
}

const PSB_LIST_RENDER_LIMIT = 200

async function getPsbListAuditSummary(psbListId: number) {
  const rows = await runReviewDbQuery<ReviewDbAuditRow>(
    `
      SELECT
        event_type AS eventType,
        to_status AS toStatus,
        notes
      FROM sales_psb_list_audits
      WHERE psb_list_id = ?
      ORDER BY id DESC
      LIMIT 3
    `,
    [psbListId],
  )

  if (!rows.length) {
    return ['Belum ada audit tambahan di review DB.']
  }

  return rows.map((row) => {
    const eventType = String(row.eventType ?? 'UPDATE').trim().toUpperCase()
    const toStatus = String(row.toStatus ?? '').trim().toUpperCase()
    const notes = String(row.notes ?? '').trim()
    return notes || `${eventType}${toStatus ? ` -> ${toStatus}` : ''}`
  })
}

async function batchGetPsbListAuditSummary(ids: number[]) {
  if (!ids.length) {
    return new Map<number, string[]>()
  }
  const placeholders = ids.map(() => '?').join(', ')
  const rows = await runReviewDbQuery<
    ReviewDbAuditRow & { psbListId: number | string }
  >(
    `
      SELECT
        psb_list_id AS psbListId,
        event_type AS eventType,
        to_status AS toStatus,
        notes
      FROM (
        SELECT
          audits.psb_list_id,
          audits.event_type,
          audits.to_status,
          audits.notes,
          audits.id,
          ROW_NUMBER() OVER (PARTITION BY audits.psb_list_id ORDER BY audits.id DESC) AS rn
        FROM sales_psb_list_audits audits
        WHERE audits.psb_list_id IN (${placeholders})
      ) ranked
      WHERE rn <= 3
      ORDER BY psb_list_id ASC, id DESC
    `,
    ids,
  )

  const result = new Map<number, string[]>()
  for (const row of rows) {
    const id = Number(row.psbListId)
    const eventType = String(row.eventType ?? 'UPDATE').trim().toUpperCase()
    const toStatus = String(row.toStatus ?? '').trim().toUpperCase()
    const notes = String(row.notes ?? '').trim()
    const summaryText = notes || `${eventType}${toStatus ? ` -> ${toStatus}` : ''}`
    const prev = result.get(id)
    if (prev) prev.push(summaryText)
    else result.set(id, [summaryText])
  }

  for (const id of ids) {
    if (!result.has(id)) {
      result.set(id, ['Belum ada audit tambahan di review DB.'])
    }
  }
  return result
}

async function getOwnerOptionsFromReviewDb() {
  const rows = await runReviewDbQuery<ReviewDbOwnerRow>(
    `
      SELECT DISTINCT sales_owner_name AS ownerName
      FROM sales_psb_lists
      WHERE sales_owner_name IS NOT NULL
        AND TRIM(sales_owner_name) <> ''
      ORDER BY sales_owner_name ASC
    `,
  )

  return rows
    .map((row) => String(row.ownerName ?? '').trim())
    .filter(Boolean)
}

function resolveOwnedPsbListOwnerAliases(session?: AppSession) {
  if (!session || session.role !== 'PENJUALAN') {
    return []
  }

  return Array.from(
    new Set(
      [
        session.displayName,
        session.username,
        `${session.displayName} (${session.username})`,
      ]
        .map((item) => normalizeText(item))
        .filter(Boolean),
    ),
  )
}

function filterVisiblePsbListOwnerOptions(items: PsbListItem[], ownerOptions: string[], session?: AppSession) {
  if (session?.role !== 'PENJUALAN') {
    return ownerOptions
  }

  return Array.from(
    new Set(items.map((item) => String(item.salesOwnerName ?? '').trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right))
}

async function getReviewDbPsbListPageData(
  query: PsbListQuery,
  source: DataSourceSnapshot,
  session?: AppSession,
): Promise<PsbListPagePayload> {
  await ensurePsbListBaselineSeeds()

  const state = {
    status: resolveSearchParam(query.status)?.trim().toUpperCase() || null,
    owner: resolveSearchParam(query.owner)?.trim() || null,
    q: resolveSearchParam(query.q)?.trim() || null,
    selected: resolveSearchParam(query.selected)?.trim() || null,
  }

  const where: string[] = []
  const values: unknown[] = []
  const ownerAliases = resolveOwnedPsbListOwnerAliases(session)
  if (state.status) {
    where.push('status = ?')
    values.push(state.status)
  }
  if (ownerAliases.length) {
    where.push(`LOWER(COALESCE(sales_owner_name, '')) IN (${ownerAliases.map(() => '?').join(', ')})`)
    values.push(...ownerAliases)
  } else if (state.owner) {
    where.push('sales_owner_name = ?')
    values.push(state.owner)
  }
  if (state.q) {
    const like = `%${state.q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
    where.push(`(
      psb_list_code LIKE ?
      OR customer_name LIKE ?
      OR customer_phone LIKE ?
      OR address_text LIKE ?
      OR odp_code LIKE ?
      OR package_label LIKE ?
      OR sales_owner_name LIKE ?
      OR transferred_ticket_ref LIKE ?
      OR area_label LIKE ?
      OR google_maps_link LIKE ?
    )`)
    values.push(like, like, like, like, like, like, like, like, like, like)
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const summaryRows = await runReviewDbQuery<ReviewDbStatusSummaryRow>(
    `
      SELECT
        COUNT(*)                                              AS totalCount,
        SUM(CASE WHEN status = 'BARU' THEN 1 ELSE 0 END)                    AS baruCount,
        SUM(CASE WHEN status = 'REVIEW_CS' THEN 1 ELSE 0 END)               AS reviewCount,
        SUM(CASE WHEN status = 'PERLU_KOREKSI' THEN 1 ELSE 0 END)          AS correctionCount,
        SUM(CASE WHEN status = 'DISETUJUI' THEN 1 ELSE 0 END)              AS approvedCount,
        SUM(CASE WHEN status = 'DITOLAK' THEN 1 ELSE 0 END)                 AS rejectedCount,
        SUM(CASE WHEN status = 'DITRANSFER_KE_TICKETING' THEN 1 ELSE 0 END) AS transferredCount
      FROM sales_psb_lists
      ${whereClause}
    `,
    values,
  )
  const summaryRow = summaryRows[0] ?? {
    totalCount: 0,
    baruCount: 0,
    reviewCount: 0,
    correctionCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    transferredCount: 0,
  }
  const summary = {
    totalCount: Number(summaryRow.totalCount ?? 0),
    baruCount: Number(summaryRow.baruCount ?? 0),
    reviewCount: Number(summaryRow.reviewCount ?? 0),
    correctionCount: Number(summaryRow.correctionCount ?? 0),
    approvedCount: Number(summaryRow.approvedCount ?? 0),
    rejectedCount: Number(summaryRow.rejectedCount ?? 0),
    transferredCount: Number(summaryRow.transferredCount ?? 0),
  }

  const selectedId = resolvePositiveInt(state.selected)

  const baseRows = await runReviewDbQuery<ReviewDbPsbListRow>(
    `
      SELECT
        id,
        psb_list_code AS psbListCode,
        customer_name AS customerName,
        customer_phone AS customerPhone,
        address_text AS addressText,
        odp_code AS odpCode,
        odp_port_label AS odpPortLabel,
        package_label AS packageLabel,
        sales_owner_name AS salesOwnerName,
        requested_install_date AS requestedInstallDate,
        status,
        review_notes AS reviewNotes,
        correction_notes AS correctionNotes,
        transferred_ticket_ref AS transferredTicketRef,
        transferred_work_order_id AS transferredWorkOrderId,
        work_order_code AS workOrderCode,
        technician_name AS technicianName,
        onu_serial_number AS onuSerialNumber,
        activation_status AS activationStatus,
        billing_status AS billingStatus,
        created_at AS createdAt,
        updated_at AS updatedAt,
        reviewed_at AS reviewedAt,
        approved_at AS approvedAt,
        transferred_at AS transferredAt,
        work_order_created_at AS workOrderCreatedAt,
        technician_assigned_at AS technicianAssignedAt,
        installation_started_at AS installationStartedAt,
        onu_installed_at AS onuInstalledAt,
        odp_port_assigned_at AS odpPortAssignedAt,
        radius_activated_at AS radiusActivatedAt,
        customer_active_at AS customerActiveAt,
        invoice_generated_at AS invoiceGeneratedAt,
        first_payment_received_at AS firstPaymentReceivedAt,
        area_label AS areaLabel,
        google_maps_link AS googleMapsLink,
        escort_notes AS escortNotes,
        activity_notes AS activityNotes,
        cs_pic_name AS csPicName,
        next_action_label AS nextActionLabel
      FROM sales_psb_lists
      ${whereClause}
      ORDER BY requested_install_date IS NULL, requested_install_date ASC, id DESC
      LIMIT ?
    `,
    [...values, PSB_LIST_RENDER_LIMIT * 2],
  )

  const baseItems = baseRows.map((row) => mapReviewDbRowToPsbListItem(row))

  const hasSelectionFilter = selectedId != null
  let renderItems: PsbListItem[]
  if (hasSelectionFilter) {
    const selectedFromList = baseItems.find((item) => item.id === selectedId)
    const others = baseItems.filter((item) => item.id !== selectedId).slice(0, PSB_LIST_RENDER_LIMIT - 1)
    renderItems = selectedFromList ? [selectedFromList, ...others] : others
  } else {
    renderItems = baseItems.slice(0, PSB_LIST_RENDER_LIMIT)
  }

  const renderIds = renderItems.map((item) => item.id)
  const auditMap = await batchGetPsbListAuditSummary(renderIds)

  const items = renderItems.map((item) => ({
    ...item,
    auditSummary: auditMap.get(item.id) ?? ['Belum ada audit tambahan di review DB.'],
  }))

  const selectedBase =
    (selectedId != null ? items.find((item) => item.id === selectedId) : undefined) ?? items[0] ?? null
  const selectedItem = selectedBase
    ? {
        ...selectedBase,
        auditSummary:
          selectedBase.auditSummary?.length
            ? selectedBase.auditSummary
            : await getPsbListAuditSummary(selectedBase.id),
      }
    : null

  return {
    source,
    items,
    selectedItem,
    summary,
    ownerOptions: filterVisiblePsbListOwnerOptions(items, await getOwnerOptionsFromReviewDb(), session),
    renderLimit: PSB_LIST_RENDER_LIMIT,
    state,
  }
}

async function getPsbListPageDataWithMock(
  query: PsbListQuery,
  source: DataSourceSnapshot,
  session?: AppSession,
): Promise<PsbListPagePayload> {
  const state = {
    status: resolveSearchParam(query.status)?.trim().toUpperCase() || null,
    owner: resolveSearchParam(query.owner)?.trim() || null,
    q: resolveSearchParam(query.q)?.trim() || null,
    selected: resolveSearchParam(query.selected)?.trim() || null,
  }

  const searchNeedle = normalizeText(state.q)
  const ownerAliases = resolveOwnedPsbListOwnerAliases(session)
  const filteredItems = mockPsbListItems
    .filter((item) => !state.status || item.status === state.status)
    .filter((item) => {
      const ownerName = normalizeText(item.salesOwnerName)
      if (ownerAliases.length) {
        return ownerAliases.includes(ownerName)
      }
      return !state.owner || item.salesOwnerName === state.owner
    })
    .filter((item) => {
      if (!searchNeedle) {
        return true
      }

      return [
        item.psbListCode,
        item.customerName,
        item.customerPhone,
        item.addressText,
        item.odpCode,
        item.packageLabel,
        item.salesOwnerName,
        item.transferredTicketRef,
        item.areaLabel,
      ].some((value) => normalizeText(value).includes(searchNeedle))
    })

  const selectedId = resolvePositiveInt(state.selected)
  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ??
    filteredItems[0] ??
    null

  return {
    source,
    items: filteredItems.slice(0, PSB_LIST_RENDER_LIMIT),
    selectedItem,
    summary: {
      totalCount: filteredItems.length,
      baruCount: filteredItems.filter((item) => item.status === 'BARU').length,
      reviewCount: filteredItems.filter((item) => item.status === 'REVIEW_CS').length,
      correctionCount: filteredItems.filter((item) => item.status === 'PERLU_KOREKSI').length,
      approvedCount: filteredItems.filter((item) => item.status === 'DISETUJUI').length,
      rejectedCount: filteredItems.filter((item) => item.status === 'DITOLAK').length,
      transferredCount: filteredItems.filter((item) => item.status === 'DITRANSFER_KE_TICKETING').length,
    },
    ownerOptions: filterVisiblePsbListOwnerOptions(
      filteredItems,
      Array.from(new Set(mockPsbListItems.map((item) => item.salesOwnerName).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
      session,
    ),
    renderLimit: PSB_LIST_RENDER_LIMIT,
    state,
  }
}

export function canUpdatePsbList(role: AppRole) {
  return ['SUPER_ADMIN', 'ADMIN', 'CS_OPERATOR', 'CS_ADMIN', 'PENJUALAN', 'SALES_MARKETING'].includes(role)
}

export function canApprovePsbList(role: AppRole) {
  return ['SUPER_ADMIN', 'ADMIN', 'CS_ADMIN'].includes(role)
}

export async function createPsbListItem(params: {
  customerName: string
  customerPhone?: string | null
  addressText: string
  odpCode?: string | null
  packageLabel?: string | null
  salesOwnerName?: string | null
  requestedInstallDate?: string | null
  areaLabel?: string | null
  googleMapsLink?: string | null
  escortNotes?: string | null
  activityNotes?: string | null
  actorName: string
  actorRole: string
}) {
  await ensurePsbListTables()

  const customerName = String(params.customerName ?? '').trim()
  const addressText = String(params.addressText ?? '').trim()
  if (!customerName) {
    throw new Error('Nama customer wajib diisi.')
  }
  if (!addressText) {
    throw new Error('Alamat pemasangan wajib diisi.')
  }

  const psbListCode = await generatePsbListCode()
  const customerPhone = normalizeNullableText(params.customerPhone)
  const odpCode = normalizeNullableText(params.odpCode)
  const packageLabel = normalizeNullableText(params.packageLabel)
  const salesOwnerName = normalizeNullableText(params.salesOwnerName) ?? params.actorName
  const requestedInstallDate = normalizeRequestedInstallDate(params.requestedInstallDate)
  const areaLabel = normalizeNullableText(params.areaLabel)
  const googleMapsLink = normalizeNullableText(params.googleMapsLink)
  const escortNotes = normalizeNullableText(params.escortNotes)
  const activityNotes = normalizeNullableText(params.activityNotes)
  const nextActionLabel = buildNextActionLabel('BARU')
  const auditNotes =
    activityNotes ??
    escortNotes ??
    `Input PSB baru dari penjualan. Menunggu dipilih CS untuk review dan penjadwalan.`

  const insertResult = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_psb_lists (
        psb_list_code,
        customer_name,
        customer_phone,
        address_text,
        odp_code,
        package_label,
        sales_owner_name,
        requested_install_date,
        status,
        area_label,
        google_maps_link,
        escort_notes,
        activity_notes,
        next_action_label
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BARU', ?, ?, ?, ?, ?)
    `,
    [
      psbListCode,
      customerName,
      customerPhone,
      addressText,
      odpCode,
      packageLabel,
      salesOwnerName,
      requestedInstallDate,
      areaLabel,
      googleMapsLink,
      escortNotes,
      activityNotes,
      nextActionLabel,
    ],
  )

  const psbListId = Number((insertResult as ExecuteResult).insertId ?? 0)
  if (!Number.isInteger(psbListId) || psbListId <= 0) {
    throw new Error('Input PSB berhasil disimpan tetapi ID Data PSB tidak terbaca.')
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_psb_list_audits (
        psb_list_id,
        event_type,
        from_status,
        to_status,
        actor_name,
        actor_role,
        notes
      )
      VALUES (?, 'CREATE', NULL, 'BARU', ?, ?, ?)
    `,
    [psbListId, params.actorName, params.actorRole, auditNotes],
  )

  return {
    id: psbListId,
    psbListCode,
    customerName,
  }
}

function buildTransitionEventType(action: PsbListTransitionAction) {
  switch (action) {
    case 'SUBMIT_REVIEW':
      return 'SUBMIT_REVIEW'
    case 'REQUEST_CORRECTION':
      return 'REQUEST_CORRECTION'
    case 'APPROVE':
      return 'APPROVE'
    case 'REJECT':
      return 'REJECT'
    case 'TRANSFER':
      return 'TRANSFER'
    default:
      return 'UPDATE'
  }
}

export async function transitionPsbListStatus(params: {
  psbListId: number
  action: PsbListTransitionAction
  notes: string
  actorName: string
  actorRole: string
}) {
  await ensurePsbListBaselineSeeds()

  const rule = transitionMap[params.action]
  const [row] = await runReviewDbQuery<ReviewDbPsbListRow>(
    `
      SELECT
        id,
        psb_list_code AS psbListCode,
        customer_name AS customerName,
        status,
        review_notes AS reviewNotes,
        correction_notes AS correctionNotes
      FROM sales_psb_lists
      WHERE id = ?
      LIMIT 1
    `,
    [params.psbListId],
  )

  if (!row) {
    throw new Error('Item Data PSB tidak ditemukan.')
  }

  const currentStatus = normalizeStatus(row.status)
  if (!rule.from.includes(currentStatus)) {
    throw new Error(`Transisi ${params.action} tidak valid dari status ${currentStatus}.`)
  }

  const notes = params.notes.trim()
  if ((params.action === 'REQUEST_CORRECTION' || params.action === 'REJECT') && !notes) {
    throw new Error('Catatan wajib diisi untuk aksi koreksi atau penolakan.')
  }

  const nextStatus = rule.to
  const nextActionLabel = buildNextActionLabel(nextStatus)
  const reviewNotes = params.action === 'REQUEST_CORRECTION' ? row.reviewNotes : notes || row.reviewNotes
  const correctionNotes =
    params.action === 'REQUEST_CORRECTION'
      ? notes
      : params.action === 'SUBMIT_REVIEW'
        ? null
        : row.correctionNotes

  await runReviewDbTransaction(async (connection) => {
    await connection.query(
      `
        UPDATE sales_psb_lists
        SET
          status = ?,
          review_notes = ?,
          correction_notes = ?,
          cs_pic_name = CASE
            WHEN ? IN ('CS_OPERATOR', 'CS_ADMIN', 'SUPER_ADMIN', 'ADMIN') THEN ?
            ELSE cs_pic_name
          END,
          next_action_label = ?,
          approved_by = CASE WHEN ? = 'APPROVE' THEN ? ELSE approved_by END,
          approved_at = CASE WHEN ? = 'APPROVE' THEN CURRENT_TIMESTAMP ELSE approved_at END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        nextStatus,
        reviewNotes,
        correctionNotes,
        params.actorRole,
        params.actorName,
        nextActionLabel,
        params.action,
        params.actorName,
        params.action,
        row.id,
      ],
    )

    await connection.query(
      `
        INSERT INTO sales_psb_list_audits (
          psb_list_id,
          event_type,
          from_status,
          to_status,
          actor_name,
          actor_role,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        buildTransitionEventType(params.action),
        currentStatus,
        nextStatus,
        params.actorName,
        params.actorRole,
        notes || `${buildTransitionEventType(params.action)} via web`,
      ],
    )
  })

  return {
    id: row.id,
    psbListCode: String(row.psbListCode ?? '-'),
    customerName: String(row.customerName ?? 'Customer belum diisi'),
    previousStatus: currentStatus,
    nextStatus,
  }
}

export async function transferPsbListToTicket(params: {
  psbListId: number
  notes: string
  actorName: string
  actorRole: string
  actorUsername: string
  branchId: number | null
}) {
  await ensurePsbListBaselineSeeds()
  await ensureServiceWorkOrderStatusLogTable()

  const [row] = await runReviewDbQuery<TransferablePsbListRow>(
    `
      SELECT
        id,
        psb_list_code AS psbListCode,
        customer_name AS customerName,
        customer_phone AS customerPhone,
        address_text AS addressText,
        odp_code AS odpCode,
        package_label AS packageLabel,
        sales_owner_name AS salesOwnerName,
        requested_install_date AS requestedInstallDate,
        status,
        review_notes AS reviewNotes,
        correction_notes AS correctionNotes,
        transferred_ticket_ref AS transferredTicketRef,
        transferred_work_order_id AS transferredWorkOrderId,
        created_at AS createdAt,
        updated_at AS updatedAt,
        area_label AS areaLabel,
        google_maps_link AS googleMapsLink,
        escort_notes AS escortNotes,
        activity_notes AS activityNotes,
        cs_pic_name AS csPicName,
        next_action_label AS nextActionLabel,
        transferred_work_order_id AS transferredWorkOrderId
      FROM sales_psb_lists
      WHERE id = ?
      LIMIT 1
    `,
    [params.psbListId],
  )

  if (!row) {
    throw new Error('Item Data PSB tidak ditemukan.')
  }

  const currentStatus = normalizeStatus(row.status)
  if (currentStatus === 'DITRANSFER_KE_TICKETING') {
    throw new Error('Item Data PSB ini sudah pernah ditransfer ke ticketing.')
  }
  if (currentStatus !== 'DISETUJUI') {
    throw new Error(`Hanya item dengan status DISETUJUI yang bisa ditransfer. Status saat ini: ${currentStatus}.`)
  }

  const actorUserId = await resolveReviewAuthUserIdByUsername(params.actorUsername)
  const workOrderNo = await generateServiceWorkOrderNo()
  const requestedDate = row.requestedInstallDate ? new Date(row.requestedInstallDate) : null
  const scheduledAt = requestedDate && Number.isFinite(requestedDate.getTime()) ? requestedDate : null
  const transferNotes = [
    `[Transfer PSB] ${params.actorName}`,
    `Sumber ${row.psbListCode ?? '-'}`,
    row.reviewNotes?.trim() ? `Review: ${row.reviewNotes.trim()}` : null,
    params.notes.trim() ? `Catatan: ${params.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' - ')

  const insertPayload = await buildServiceWorkOrderInsertPayload({
    workOrderNo,
    workType: 'INSTALLATION',
    status: 'OPEN',
    technicianName: null,
    scheduledAt,
    notes: transferNotes,
    branchId: params.branchId ?? null,
    jobCategory: 'PSB',
    priority: 'MEDIUM',
    sourceType: 'MANUAL',
    currentPicUserId: actorUserId,
    scheduledByUserId: actorUserId,
    address: row.addressText ?? null,
  })

  let workOrderId = 0
  await runReviewDbTransaction(async (connection) => {
    const [insertResult] = await connection.query(
      `
        INSERT INTO service_work_orders (
          ${insertPayload.columns.join(',\n          ')}
        )
        VALUES (${insertPayload.placeholders.join(', ')})
      `,
      insertPayload.values,
    )

    workOrderId = Number((insertResult as ExecuteResult).insertId ?? 0)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      throw new Error('Work order PSB berhasil dibuat tetapi ID insert tidak terbaca.')
    }

    await connection.query(
      `
        INSERT INTO service_work_order_status_logs (
          work_order_id,
          from_status,
          to_status,
          reason_code,
          reason_notes,
          changed_by_user_id,
          changed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [
        workOrderId,
        null,
        'OPEN',
        'AUTO_CREATED',
        `WO PSB dibuat dari Data PSB ${row.psbListCode ?? '-'}.`,
        actorUserId,
      ],
    )

    await connection.query(
      `
        UPDATE sales_psb_lists
        SET
          status = 'DITRANSFER_KE_TICKETING',
          transferred_ticket_ref = ?,
          transferred_work_order_id = ?,
          work_order_code = ?,
          work_order_created_at = CURRENT_TIMESTAMP,
          activation_status = CASE
            WHEN activation_status IS NULL OR activation_status = '' THEN 'PENDING'
            ELSE activation_status
          END,
          billing_status = CASE
            WHEN billing_status IS NULL OR billing_status = '' THEN 'INVOICE_DRAFT'
            ELSE billing_status
          END,
          transferred_by = ?,
          transferred_at = CURRENT_TIMESTAMP,
          next_action_label = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [workOrderNo, workOrderId, workOrderNo, params.actorName, buildNextActionLabel('DITRANSFER_KE_TICKETING'), row.id],
    )

    await connection.query(
      `
        INSERT INTO sales_psb_list_audits (
          psb_list_id,
          event_type,
          from_status,
          to_status,
          actor_name,
          actor_role,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        row.id,
        'TRANSFER',
        currentStatus,
        'DITRANSFER_KE_TICKETING',
        params.actorName,
        params.actorRole,
        params.notes.trim() || `Transfer ke ticketing operasional dengan WO ${workOrderNo}.`,
      ],
    )
  })

  return {
    id: row.id,
    psbListCode: String(row.psbListCode ?? '-'),
    customerName: String(row.customerName ?? 'Customer belum diisi'),
    workOrderNo,
    workOrderId,
  }
}

export async function getPsbListPageData(query: PsbListQuery, session?: AppSession): Promise<PsbListPagePayload> {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode === 'review-db' && !source.isFallback) {
    try {
      return await getReviewDbPsbListPageData(query, source, session)
    } catch (error) {
      return getPsbListPageDataWithMock(query, buildFallbackSnapshot(getReviewDbErrorDetail(error)), session)
    }
  }

  if (getConfiguredDataMode() === 'mock') {
    return getPsbListPageDataWithMock(query, source, session)
  }

  return getPsbListPageDataWithMock(
    query,
    buildFallbackSnapshot(
      'Data PSB sementara memakai mock operasional karena sumber review DB khusus untuk domain ini belum dibuka.',
    ),
    session,
  )
}
