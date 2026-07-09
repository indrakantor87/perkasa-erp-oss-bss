import { runReviewDbExecute } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

let salarySlipVoidTableEnsured = false

export async function ensureHrSalarySlipVoidTable() {
  if (salarySlipVoidTableEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_salary_slip_voids (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      salary_slip_id BIGINT UNSIGNED NOT NULL,
      actor_name VARCHAR(150) NOT NULL,
      reason_text TEXT NULL,
      voided_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hr_salary_slip_voids_salary_slip (salary_slip_id),
      KEY idx_hr_salary_slip_voids_voided (voided_at),
      CONSTRAINT fk_hr_salary_slip_voids_salary_slip FOREIGN KEY (salary_slip_id) REFERENCES hr_salary_slips(id)
    )
  `)

  salarySlipVoidTableEnsured = true
}
