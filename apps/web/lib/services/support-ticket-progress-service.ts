import { hasReviewDbColumn, invalidateReviewDbColumnCache, runReviewDbExecute } from '@/lib/review-db'

async function ensureSupportTroubleTicketProgressColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('support_trouble_ticket_progress_logs', columnName)) {
    return
  }

  await runReviewDbExecute(`
    ALTER TABLE support_trouble_ticket_progress_logs
    ADD COLUMN ${definitionSql} AFTER ${afterColumn}
  `)
  invalidateReviewDbColumnCache('support_trouble_ticket_progress_logs', columnName)
}

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

  await ensureSupportTroubleTicketProgressColumn(
    'progress_status',
    "progress_status VARCHAR(30) NOT NULL DEFAULT 'ON_PROGRESS'",
    'trouble_ticket_id',
  )
  await ensureSupportTroubleTicketProgressColumn('owner_name', 'owner_name VARCHAR(150) NULL', 'progress_status')
  await ensureSupportTroubleTicketProgressColumn('progress_notes', 'progress_notes TEXT NULL', 'owner_name')
  await ensureSupportTroubleTicketProgressColumn('follow_up_at', 'follow_up_at DATETIME NULL', 'progress_notes')
  await ensureSupportTroubleTicketProgressColumn(
    'updated_by',
    "updated_by VARCHAR(150) NOT NULL DEFAULT 'system'",
    'follow_up_at',
  )
  await ensureSupportTroubleTicketProgressColumn(
    'updated_at',
    'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'updated_by',
  )
  await ensureSupportTroubleTicketProgressColumn(
    'created_at',
    'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'updated_at',
  )
}
