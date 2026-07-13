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

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN IF NOT EXISTS progress_status VARCHAR(30) NOT NULL DEFAULT 'ON_PROGRESS' AFTER trouble_ticket_id
  `)

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN IF NOT EXISTS owner_name VARCHAR(150) NULL AFTER progress_status
  `)

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN IF NOT EXISTS progress_notes TEXT NULL AFTER owner_name
  `)

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN IF NOT EXISTS follow_up_at DATETIME NULL AFTER progress_notes
  `)

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(150) NOT NULL DEFAULT 'system' AFTER follow_up_at
  `)

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER updated_by
  `)

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER updated_at
  `)
}
