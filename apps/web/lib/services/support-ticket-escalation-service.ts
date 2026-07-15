import { hasReviewDbColumn, invalidateReviewDbColumnCache, runReviewDbExecute } from '@/lib/review-db'

async function ensureSupportTroubleTicketEscalationColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('support_trouble_ticket_escalation_logs', columnName)) {
    return
  }

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_escalation_logs
    ADD COLUMN ${definitionSql} AFTER ${afterColumn}
  `)
  invalidateReviewDbColumnCache('support_trouble_ticket_escalation_logs', columnName)
}

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

  await ensureSupportTroubleTicketEscalationColumn(
    'escalation_target',
    "escalation_target VARCHAR(150) NOT NULL DEFAULT 'UNSPECIFIED'",
    'trouble_ticket_id',
  )
  await ensureSupportTroubleTicketEscalationColumn(
    'escalation_level',
    "escalation_level VARCHAR(40) NOT NULL DEFAULT 'OVERDUE'",
    'escalation_target',
  )
  await ensureSupportTroubleTicketEscalationColumn(
    'escalation_reason',
    'escalation_reason TEXT NULL',
    'escalation_level',
  )
  await ensureSupportTroubleTicketEscalationColumn(
    'escalated_by',
    "escalated_by VARCHAR(150) NOT NULL DEFAULT 'system'",
    'escalation_reason',
  )
  await ensureSupportTroubleTicketEscalationColumn(
    'escalated_at',
    'escalated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'escalated_by',
  )
  await ensureSupportTroubleTicketEscalationColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'escalated_at',
  )
}
