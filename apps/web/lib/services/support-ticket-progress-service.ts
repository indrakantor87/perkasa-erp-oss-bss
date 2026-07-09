import { runReviewDbExecute } from '@/lib/review-db'

export async function ensureSupportTroubleTicketProgressTable() {
  await runReviewDbExecute(`
    CREATE TABLE IF NOT EXISTS support_trouble_ticket_progress_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      trouble_ticket_id BIGINT UNSIGNED NOT NULL,
      progress_status VARCHAR(30) NOT NULL DEFAULT 'ON_PROGRESS',
      owner_name VARCHAR(150) NULL,
      progress_notes TEXT NULL,
      follow_up_at DATETIME NULL,
      updated_by VARCHAR(150) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_support_tt_progress_ticket (trouble_ticket_id),
      KEY idx_support_tt_progress_status (progress_status),
      KEY idx_support_tt_progress_follow_up (follow_up_at),
      CONSTRAINT fk_support_tt_progress_ticket FOREIGN KEY (trouble_ticket_id) REFERENCES support_trouble_tickets(id)
    )
  `)
}
