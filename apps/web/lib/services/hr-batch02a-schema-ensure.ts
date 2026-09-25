import { invalidateReviewDbColumnCache, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch01Schema as ensureBatch01 } from './hr-batch01-schema-ensure'

export { ensureBatch01 as ensureHrBatch01Schema }

type DuplicateCodeRow = {
  employee_code: string | null
  total_rows: number | string
}

type IndexExistsRow = {
  idx_count: number | string
}

let _employeeCodeUniqueEnsured = false

export class HrEmployeeCodeDuplicatePreflightError extends Error {
  status = 500
  public duplicateGroups: Array<{ employee_code: string; count: number }>

  constructor(groups: Array<{ employee_code: string; count: number }>) {
    const totalDupes = groups.reduce((sum, g) => sum + g.count, 0)
    const codeList = groups.map((g) => `${g.employee_code}(x${g.count})`).join(', ')
    super(
      `HR PREFLIGHT STOP: Ditemukan ${groups.length} grup employee_code DUPLIKAT (total ${totalDupes} baris). ` +
      `Codes: ${codeList}. INDEX TIDAK DAPAT DITERAPKAN. Silakan bersihkan data duplikat SECARA MANUAL terlebih dahulu sebelum melanjutkan. AUTO-FIX DILARANG oleh aturan integritas T8.`,
    )
    this.name = 'HrEmployeeCodeDuplicatePreflightError'
    this.duplicateGroups = groups
  }
}

export async function ensureHrBatch02aEmployeeCodeUnique(): Promise<void> {
  if (_employeeCodeUniqueEnsured) return

  try {
    const dupRows = await runReviewDbQuery<DuplicateCodeRow>(
      `
        SELECT
          employee_code,
          COUNT(*) AS total_rows
        FROM hr_employees
        WHERE employee_code IS NOT NULL AND employee_code <> ''
        GROUP BY employee_code
        HAVING COUNT(*) > 1
        ORDER BY total_rows DESC, employee_code ASC
        LIMIT 100
      `,
    )

    if (Array.isArray(dupRows) && dupRows.length > 0) {
      const groups = dupRows.map((r) => ({
        employee_code: String(r.employee_code ?? ''),
        count: Number(r.total_rows ?? 0),
      }))
      throw new HrEmployeeCodeDuplicatePreflightError(groups)
    }
  } catch (err) {
    if (err instanceof HrEmployeeCodeDuplicatePreflightError) throw err
  }

  try {
    await runReviewDbExecute(
      `ALTER TABLE hr_employees ADD UNIQUE INDEX IF NOT EXISTS uq_hr_employees_employee_code (employee_code)`,
    )
  } catch {}

  try {
    const [check] = await runReviewDbQuery<IndexExistsRow>(
      `
        SELECT COUNT(*) AS idx_count
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'hr_employees'
          AND index_name = 'uq_hr_employees_employee_code'
      `,
    )
    const idxExists = Number(check?.idx_count ?? 0) > 0
    if (!idxExists) {
      throw new Error(
        'HR UNIQUE INDEX GAGAL: uq_hr_employees_employee_code tidak berhasil dibuat meskipun preflight duplicate lolos. Silakan cek permission DB.',
      )
    }
  } catch (err) {
    if (err instanceof HrEmployeeCodeDuplicatePreflightError) throw err
  }

  invalidateReviewDbColumnCache('hr_employees')
  _employeeCodeUniqueEnsured = true
}

let _batch02aAllEnsured = false
export async function ensureHrBatch02aFullSchema(): Promise<void> {
  if (_batch02aAllEnsured) return
  await ensureBatch01()
  await ensureHrBatch02aEmployeeCodeUnique()
  _batch02aAllEnsured = true
}
