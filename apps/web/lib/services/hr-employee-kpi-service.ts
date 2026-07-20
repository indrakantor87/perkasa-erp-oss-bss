import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

export type HrEmployeeKpiEntry = {
  kpiId: number
  employeeId: number
  employeeCode: string
  employeeName: string
  kpiMonth: number
  kpiYear: number
  score: number
  performanceBonus: number
  notes: string | null
  updatedAt: string | null
}

let employeeKpiTableEnsured = false

export async function ensureHrEmployeeKpiTable() {
  if (employeeKpiTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_employee_kpis (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      employee_id BIGINT UNSIGNED NOT NULL,
      kpi_month INT NOT NULL,
      kpi_year INT NOT NULL,
      score INT NOT NULL DEFAULT 0,
      performance_bonus DECIMAL(18,2) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hr_employee_kpis_period (employee_id, kpi_month, kpi_year),
      KEY idx_hr_employee_kpis_period (kpi_year, kpi_month),
      CONSTRAINT fk_hr_employee_kpis_employee FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)

  employeeKpiTableEnsured = true
}

export async function getHrEmployeeKpiBonus(params: { employeeId: number; month: number; year: number }) {
  await ensureHrEmployeeKpiTable()
  const [row] = await runReviewDbQuery<{ performanceBonus: number | null }>(
    `
      SELECT performance_bonus AS performanceBonus
      FROM hr_employee_kpis
      WHERE employee_id = ?
        AND kpi_month = ?
        AND kpi_year = ?
      LIMIT 1
    `,
    [params.employeeId, params.month, params.year],
  )

  const value = Number(row?.performanceBonus ?? 0)
  return Number.isFinite(value) ? value : 0
}

export async function listRecentHrEmployeeKpis(limit: number) {
  await ensureHrEmployeeKpiTable()
  const normalizedLimit = Math.max(1, Math.min(50, Math.floor(limit)))
  return runReviewDbQuery<HrEmployeeKpiEntry>(
    `
      SELECT
        hek.id AS kpiId,
        he.id AS employeeId,
        he.employee_code AS employeeCode,
        he.full_name AS employeeName,
        hek.kpi_month AS kpiMonth,
        hek.kpi_year AS kpiYear,
        hek.score,
        hek.performance_bonus AS performanceBonus,
        hek.notes,
        CAST(hek.updated_at AS CHAR) AS updatedAt
      FROM hr_employee_kpis hek
      JOIN hr_employees he
        ON he.id = hek.employee_id
      ORDER BY hek.kpi_year DESC, hek.kpi_month DESC, hek.id DESC
      LIMIT ${normalizedLimit}
    `,
  )
}

