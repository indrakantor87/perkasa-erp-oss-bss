import type { AppSession } from '@/lib/auth-session'
import { hasReviewDbColumn, invalidateReviewDbColumnCache, runReviewDbExecute } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

type SupportDismantleCloseMetadataInput = {
  closeNote: string
  fieldPic: string
  deviceStatus: string
  pickupStatus: string
  closeOutcome: string
  billingDisposition: string
  returnedItemCodes: string[]
}

export const SUPPORT_DISMANTLE_METADATA_PREFIXES = {
  actor: 'Closed By: ',
  fieldPic: 'Field PIC: ',
  deviceStatus: 'Device Status: ',
  pickupStatus: 'Pickup Status: ',
  closeOutcome: 'Close Outcome: ',
  billingDisposition: 'Billing Disposition: ',
  returnedItemCodes: 'Returned Item Codes: ',
} as const

async function ensureSupportDismantleQueueColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('support_dismantle_queue', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE support_dismantle_queue
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('support_dismantle_queue', columnName)
}

async function ensureSupportDismantleHistoryColumn(
  columnName: string,
  definitionSql: string,
  afterColumn: string,
) {
  if (await hasReviewDbColumn('support_dismantle_history', columnName)) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      ALTER TABLE support_dismantle_history
      ADD COLUMN ${definitionSql} AFTER ${afterColumn}
    `,
  )
  invalidateReviewDbColumnCache('support_dismantle_history', columnName)
}

export async function ensureSupportDismantleQueueTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS support_dismantle_queue (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        isolation_id BIGINT UNSIGNED NOT NULL,
        transfer_note TEXT NULL,
        transferred_by_username VARCHAR(120) NOT NULL,
        transferred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reopened_note TEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_support_dismantle_queue_isolation (isolation_id),
        KEY idx_support_dismantle_queue_transferred_at (transferred_at),
        CONSTRAINT fk_support_dismantle_queue_isolation FOREIGN KEY (isolation_id) REFERENCES support_isolations(id)
      )
    `,
  )

  await ensureSupportDismantleQueueColumn('transfer_note', 'transfer_note TEXT NULL', 'isolation_id')
  await ensureSupportDismantleQueueColumn(
    'transferred_by_username',
    "transferred_by_username VARCHAR(120) NOT NULL DEFAULT 'system'",
    'transfer_note',
  )
  await ensureSupportDismantleQueueColumn(
    'transferred_at',
    'transferred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'transferred_by_username',
  )
  await ensureSupportDismantleQueueColumn('reopened_note', 'reopened_note TEXT NULL', 'transferred_at')
  await ensureSupportDismantleQueueColumn(
    'updated_at',
    'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'reopened_note',
  )
}

export async function ensureSupportDismantleHistoryColumns() {
  await ensureSupportDismantleHistoryColumn(
    'returned_item_codes',
    'returned_item_codes TEXT NULL',
    'close_note',
  )
}

export function buildSupportDismantleTransferNote(session: AppSession, note: string) {
  return `[Transferred to dismantle queue] ${session.displayName} (${session.username}) - ${note.trim()}`
}

export function buildSupportDismantleCloseNote(
  session: AppSession,
  metadata: SupportDismantleCloseMetadataInput,
) {
  const normalizedReturnedItemCodes = Array.from(
    new Set(
      metadata.returnedItemCodes
        .map((item) => String(item ?? '').trim().toUpperCase())
        .filter(Boolean),
    ),
  )

  return [
    `[Dismantled via web] ${metadata.closeNote.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.actor}${session.displayName} (${session.username})`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.fieldPic}${metadata.fieldPic.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.deviceStatus}${metadata.deviceStatus.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.pickupStatus}${metadata.pickupStatus.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.closeOutcome}${metadata.closeOutcome.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.billingDisposition}${metadata.billingDisposition.trim()}`,
    ...(normalizedReturnedItemCodes.length
      ? [
          `${SUPPORT_DISMANTLE_METADATA_PREFIXES.returnedItemCodes}${normalizedReturnedItemCodes.join(', ')}`,
        ]
      : []),
  ].join('\n')
}

export function buildSupportDismantleReopenNote(session: AppSession, note: string) {
  return `[Reopened via dismantle] ${session.displayName} (${session.username}) - ${note.trim()}`
}

export function parseStructuredSupportNote(note: string | null | undefined) {
  const raw = String(note ?? '').trim()
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const metadata = new Map<string, string>()
  const noteLines: string[] = []

  for (const line of lines) {
    const matchedPrefix = Object.values(SUPPORT_DISMANTLE_METADATA_PREFIXES).find((prefix) =>
      line.startsWith(prefix),
    )

    if (matchedPrefix) {
      metadata.set(matchedPrefix, line.slice(matchedPrefix.length).trim() || '-')
      continue
    }

    noteLines.push(line)
  }

  return {
    summary:
      noteLines.find((line) => line.startsWith('[Dismantled via web]')) ??
      noteLines[noteLines.length - 1] ??
      raw,
    noteLines,
    metadata,
  }
}
