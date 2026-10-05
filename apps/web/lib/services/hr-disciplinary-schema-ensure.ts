import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

type CountRow = { total: number }

export type InsertResult = {
  insertId?: number
  affectedRows?: number
  changedRows?: number
}

let hrDisciplinaryRecordsEnsured = false

export const ALLOWED_SP_LEVELS = ['SP1', 'SP2', 'SP3', 'PERINGATAN_LISAN', 'PEMBINAAN'] as const
export const ALLOWED_DISCIPLINARY_STATUS = [
  'DRAFT',
  'PENDING_SUPERVISOR_APPROVAL',
  'SUPERVISOR_APPROVED',
  'HR_APPROVED',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
] as const

export type SpLevel = (typeof ALLOWED_SP_LEVELS)[number]
export type DisciplinaryStatus = (typeof ALLOWED_DISCIPLINARY_STATUS)[number]

export type DisciplinaryRow = {
  id: number
  employeeId: number
  employeeCode: string | null
  employeeName: string | null
  divisionName: string | null
  spLevel: SpLevel
  incidentDate: string | null
  incidentLocation: string | null
  effectiveFrom: string | null
  effectiveTo: string | null
  violationClause: string | null
  violationDetail: string | null
  actionTaken: string | null
  coachingNotes: string | null
  followUpDate: string | null
  attachmentDocId: number | null
  status: DisciplinaryStatus
  supervisorApprovedAt: string | null
  hrApprovedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  createdAt: string | null
  updatedAt: string | null
}

export async function ensureHrDisciplinaryRecordsTable() {
  if (hrDisciplinaryRecordsEnsured) {
    return
  }

  const [hasEmployees] = await runReviewDbQuery<CountRow>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'hr_employees'
      LIMIT 1
    `,
    [],
  ).catch(() => [{ total: 0 }]) as CountRow[]

  if (Number(hasEmployees?.total ?? 0) === 0) {
    throw new Error('hr_employees table belum tersedia. Jalankan ensureHrBatch01Schema terlebih dahulu.')
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_disciplinary_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      employee_id BIGINT UNSIGNED NOT NULL,
      sp_level VARCHAR(32) NOT NULL DEFAULT 'PEMBINAAN',
      incident_date DATE NOT NULL,
      incident_location VARCHAR(255) NULL,
      effective_from DATE NOT NULL,
      effective_to DATE NULL,
      violation_clause VARCHAR(255) NOT NULL,
      violation_detail TEXT NOT NULL,
      action_taken VARCHAR(255) NULL,
      coaching_notes TEXT NULL,
      follow_up_date DATE NULL,
      attachment_doc_id BIGINT UNSIGNED NULL,
      status VARCHAR(48) NOT NULL DEFAULT 'DRAFT',
      supervisor_approved_by_user_id BIGINT UNSIGNED NULL,
      supervisor_approved_at DATETIME NULL,
      hr_approved_by_user_id BIGINT UNSIGNED NULL,
      hr_approved_at DATETIME NULL,
      rejected_by_user_id BIGINT UNSIGNED NULL,
      rejected_at DATETIME NULL,
      rejection_reason VARCHAR(255) NULL,
      created_by_user_id BIGINT UNSIGNED NULL,
      updated_by_user_id BIGINT UNSIGNED NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_hr_disciplinary_employee (employee_id, incident_date),
      KEY idx_hr_disciplinary_status (status),
      KEY idx_hr_disciplinary_level (sp_level),
      KEY idx_hr_disciplinary_effective (effective_from, effective_to),
      CONSTRAINT fk_hr_disciplinary_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)

  hrDisciplinaryRecordsEnsured = true
}

export function normalizeSpLevel(value: unknown): SpLevel {
  const raw = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (ALLOWED_SP_LEVELS.includes(raw as SpLevel)) return raw as SpLevel
  return 'PEMBINAAN'
}

export function normalizeDisciplinaryStatus(value: unknown): DisciplinaryStatus {
  const raw = String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (ALLOWED_DISCIPLINARY_STATUS.includes(raw as DisciplinaryStatus)) return raw as DisciplinaryStatus
  return 'DRAFT'
}

export function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseIsoDate(value: unknown): string | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const iso = raw.split(' ')[0].replace(/\//g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return null
}
