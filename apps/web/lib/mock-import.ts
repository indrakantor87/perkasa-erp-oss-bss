import type { BatchDetail, ImportBatch, ImportBatchAction, TransformStage } from '@/lib/types'

export const importBatches: ImportBatch[] = [
  {
    id: 'sample-webpsb-user-001',
    batchCode: 'SAMPLE-WEBPSB-USER-001',
    sourceSystem: 'WEB_PSB',
    scope: 'USER_AND_ORDER_SAMPLE',
    sourceFileName: 'sample-webpsb-user.xlsx',
    status: 'MAPPED',
    totalRows: 6,
    validRows: 6,
    invalidRows: 0,
    duplicateRows: 0,
    note: 'Batch utama untuk customer, order, dan support.',
  },
  {
    id: 'sample-webpsb-billing-001',
    batchCode: 'SAMPLE-WEBPSB-BILLING-001',
    sourceSystem: 'WEB_PSB',
    scope: 'BILLING_SAMPLE',
    sourceFileName: 'sample-webpsb-billing.xlsx',
    status: 'MAPPED',
    totalRows: 4,
    validRows: 4,
    invalidRows: 0,
    duplicateRows: 0,
    note: 'Batch sample untuk invoice, payment, dan collection.',
  },
  {
    id: 'sample-ga-inventory-001',
    batchCode: 'SAMPLE-GA-INVENTORY-001',
    sourceSystem: 'GA',
    scope: 'INVENTORY_SAMPLE',
    sourceFileName: 'sample-ga-inventory.xlsx',
    status: 'VALIDATED',
    totalRows: 2,
    validRows: 2,
    invalidRows: 0,
    duplicateRows: 0,
    note: 'Item dan stock movement review.',
  },
  {
    id: 'sample-finance-hr-001',
    batchCode: 'SAMPLE-FINANCE-HR-001',
    sourceSystem: 'FINANCE',
    scope: 'HR_SAMPLE',
    sourceFileName: 'sample-finance-hr.xlsx',
    status: 'IMPORTED',
    totalRows: 4,
    validRows: 4,
    invalidRows: 0,
    duplicateRows: 0,
    note: 'Employee, attendance, salary, dan loan sudah siap ditinjau.',
  },
]

export const transformStages: TransformStage[] = [
  {
    stage: '01',
    title: 'Transform Tahap 1',
    status: 'done',
    href: '/import/sample-ga-inventory-001',
    summary: 'Inventory dan HR dasar sudah punya jalur final.',
  },
  {
    stage: '02',
    title: 'Transform Tahap 2',
    status: 'done',
    href: '/import/sample-webpsb-user-001',
    summary: 'Customer, address, order, dan subscription tersambung.',
  },
  {
    stage: '03',
    title: 'Transform Tahap 3',
    status: 'review',
    href: '/import/sample-webpsb-user-001',
    summary: 'Work order, support, isolir, dan dismantle history siap ditinjau.',
  },
  {
    stage: '04',
    title: 'Transform Tahap 4',
    status: 'ready',
    href: '/import/sample-webpsb-billing-001',
    summary: 'Billing siap diuji melalui invoice, payment, dan collection action.',
  },
]

const batchRows: Record<string, BatchDetail> = {
  'sample-webpsb-user-001': {
    id: 'sample-webpsb-user-001',
    title: 'Batch WEB_PSB User dan Order',
    sourceSystem: 'WEB_PSB',
    scope: 'USER_AND_ORDER_SAMPLE',
    status: 'MAPPED',
    summary: 'Batch ini menampung jalur user, customer, order, TT, isolation, dan dismantle history.',
    actions: [
      {
        id: 'sample-webpsb-user-001-create',
        actionType: 'CREATE',
        status: 'SUCCESS',
        actor: 'System Review',
        detail: 'Batch sample dibuat untuk review jalur user, customer, order, dan support.',
        happenedAt: '2026-07-06 08:10',
      },
      {
        id: 'sample-webpsb-user-001-upload',
        actionType: 'UPLOAD',
        status: 'SUCCESS',
        actor: 'System Review',
        detail: 'Workbook sample memuat section users, customers, orders, dan support.',
        happenedAt: '2026-07-06 08:15',
      },
    ],
    rows: [
      {
        id: '1',
        legacyId: 'USR-001',
        normalizedKey: 'usr-sample-001',
        status: 'IMPORTED',
        targetId: 'auth_users:1',
        note: 'User sample berhasil diarahkan ke auth master.',
      },
      {
        id: '2',
        legacyId: 'CUST-001',
        normalizedKey: 'cust-sample-001',
        status: 'IMPORTED',
        targetId: 'crm_customers:1',
        note: 'Customer sample aktif sebagai basis order dan billing.',
      },
      {
        id: '3',
        legacyId: 'TT-001',
        normalizedKey: 'tt-sample-001',
        status: 'MAPPED',
        targetId: 'support_trouble_tickets:1',
        note: 'Trouble ticket sample siap direview di tahap support.',
      },
    ],
  },
  'sample-webpsb-billing-001': {
    id: 'sample-webpsb-billing-001',
    title: 'Batch WEB_PSB Billing',
    sourceSystem: 'WEB_PSB',
    scope: 'BILLING_SAMPLE',
    status: 'MAPPED',
    summary: 'Batch ini berisi invoice, invoice item, payment, dan collection action untuk jalur overdue control.',
    actions: [
      {
        id: 'sample-webpsb-billing-001-create',
        actionType: 'CREATE',
        status: 'SUCCESS',
        actor: 'System Review',
        detail: 'Batch billing sample dibuat untuk review invoice, payment, dan collection.',
        happenedAt: '2026-07-06 08:20',
      },
    ],
    rows: [
      {
        id: '1',
        legacyId: 'INV-001',
        normalizedKey: 'inv-sample-001',
        status: 'MAPPED',
        targetId: 'billing_invoices:1',
        note: 'Invoice recurring sample menunggu review hasil transform tahap 4.',
      },
      {
        id: '2',
        legacyId: 'PAY-001',
        normalizedKey: 'pay-sample-001',
        status: 'MAPPED',
        targetId: 'billing_payments:1',
        note: 'Payment partial terhubung ke invoice sample.',
      },
    ],
  },
  'sample-ga-inventory-001': {
    id: 'sample-ga-inventory-001',
    title: 'Batch GA Inventory',
    sourceSystem: 'GA',
    scope: 'INVENTORY_SAMPLE',
    status: 'VALIDATED',
    summary: 'Batch inventory dipakai untuk item dan stock movement awal.',
    actions: [
      {
        id: 'sample-ga-inventory-001-validate',
        actionType: 'VALIDATE',
        status: 'SUCCESS',
        actor: 'System Review',
        detail: 'Semua row inventory sample lolos validasi staging.',
        happenedAt: '2026-07-06 08:30',
      },
    ],
    rows: [
      {
        id: '1',
        legacyId: 'ITEM-001',
        normalizedKey: 'item-sample-001',
        status: 'IMPORTED',
        targetId: 'inventory_items:1',
        note: 'Item master sudah mengacu ke category dan unit hasil mapping.',
      },
    ],
  },
  'sample-finance-hr-001': {
    id: 'sample-finance-hr-001',
    title: 'Batch Finance HR',
    sourceSystem: 'FINANCE',
    scope: 'HR_SAMPLE',
    status: 'IMPORTED',
    summary: 'Batch HR menutup employee, attendance, salary, dan loan pada tahap 1.',
    actions: [
      {
        id: 'sample-finance-hr-001-transform',
        actionType: 'TRANSFORM',
        status: 'SUCCESS',
        actor: 'System Review',
        detail: 'Transform tahap 1 berhasil memindahkan sample HR ke tabel final.',
        happenedAt: '2026-07-06 08:45',
      },
    ],
    rows: [
      {
        id: '1',
        legacyId: 'EMP-001',
        normalizedKey: 'emp-sample-001',
        status: 'IMPORTED',
        targetId: 'hr_employees:1',
        note: 'Employee sample sudah siap dipakai di modul HR shell.',
      },
    ],
  },
}

export function getImportBatch(batchId: string) {
  return importBatches.find((batch) => batch.id === batchId)
}

export function getBatchDetail(batchId: string) {
  return batchRows[batchId]
}
