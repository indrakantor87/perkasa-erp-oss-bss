import type { BatchDetail, ImportBatch, TransformStage } from '@/lib/types'

export const importBatches: ImportBatch[] = []

export const transformStages: TransformStage[] = [
  {
    stage: '01',
    title: 'Tahap 1: Inventory & HR dasar',
    status: 'pending',
    summary: 'Inventory items, stock movement, network ODP, HR employee/attendance/salary/loan.',
  },
  {
    stage: '02',
    title: 'Tahap 2: Customer & Commercial',
    status: 'pending',
    summary: 'Customer, address, order, subscription, coverage area, marketing activity.',
  },
  {
    stage: '03',
    title: 'Tahap 3: Work Order & Support',
    status: 'pending',
    summary: 'Work order generate, support tickets, isolation, dismantle.',
  },
  {
    stage: '04',
    title: 'Tahap 4: Billing & Finance',
    status: 'pending',
    summary: 'Billing invoice, item tagihan, payment, collection action.',
  },
]

export function getImportBatch(batchId: string) {
  return importBatches.find((batch) => batch.id === batchId)
}

export function getBatchDetail(_batchId: string): BatchDetail | undefined {
  return undefined
}
