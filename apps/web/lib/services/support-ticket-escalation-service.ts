import { runReviewDbExecute } from '@/lib/review-db'

export async function ensureSupportTroubleTicketEscalationTable() {
  await runReviewDbExecute(`
    CREATE TABLE IF NOT EXISTS support_trouble_ticket_escalation_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      trouble_ticket_id BIGINT UNSIGNED NOT NULL,
      escalation_target VARCHAR(150) NOT NULL,
      escalation_level VARCHAR(40) NOT NULL DEFAULT 'OVERDUE',
      escalation_reason TEXT NULL,
      escalated_by VARCHAR(150) NOT NULL,
      escalated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_support_tt_escalation_ticket (trouble_ticket_id),
      KEY idx_support_tt_escalation_level (escalation_level),
      KEY idx_support_tt_escalation_at (escalated_at),
      CONSTRAINT fk_support_tt_escalation_ticket FOREIGN KEY (trouble_ticket_id) REFERENCES support_trouble_tickets(id)
    )
  `)
}
