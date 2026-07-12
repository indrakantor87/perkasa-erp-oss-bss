import type { AppSession } from '@/lib/auth-session'
import { runReviewDbExecute } from '@/lib/review-db'

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
}

export const SUPPORT_DISMANTLE_METADATA_PREFIXES = {
  actor: 'Closed By: ',
  fieldPic: 'Field PIC: ',
  deviceStatus: 'Device Status: ',
  pickupStatus: 'Pickup Status: ',
  closeOutcome: 'Close Outcome: ',
  billingDisposition: 'Billing Disposition: ',
} as const

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
}

export function buildSupportDismantleTransferNote(session: AppSession, note: string) {
  return `[Transferred to dismantle queue] ${session.displayName} (${session.username}) - ${note.trim()}`
}

export function buildSupportDismantleCloseNote(
  session: AppSession,
  metadata: SupportDismantleCloseMetadataInput,
) {
  return [
    `[Dismantled via web] ${metadata.closeNote.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.actor}${session.displayName} (${session.username})`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.fieldPic}${metadata.fieldPic.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.deviceStatus}${metadata.deviceStatus.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.pickupStatus}${metadata.pickupStatus.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.closeOutcome}${metadata.closeOutcome.trim()}`,
    `${SUPPORT_DISMANTLE_METADATA_PREFIXES.billingDisposition}${metadata.billingDisposition.trim()}`,
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
