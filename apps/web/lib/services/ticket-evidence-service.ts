import {
  hasReviewDbColumn,
  hasReviewDbTable,
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
  type ReviewDbConnection,
} from '@/lib/review-db'
import {
  getActiveTechnicianAssignmentByTicketId,
  ensureTicketsUnifiedTable,
  type UnifiedTicketType,
} from '@/lib/services/unified-ticket-service'
import { ensureTechnicianSchemaFoundation } from '@/lib/services/technician-schema-ensure'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

export type TicketEvidenceRow = {
  id: number
  ticketId: number
  uploadedByUserId: number | null
  uploadedAt: Date | string
  evidenceType: string | null
  storageReference: string | null
  notes: string | null
  branchId: number | null
  createdAt: Date | string
  updatedAt: Date | string
}

export async function attachTicketEvidence(params: {
  ticketId: number
  sessionUserId: number
  sessionBranchIds: number[]
  evidenceType?: string | null
  storageReference: string
  notes?: string | null
  branchId: number | null
}): Promise<{
  success: boolean
  evidenceId: number | null
  inserted: boolean
  branchDenied: boolean
  ownershipDenied: boolean
}> {
  await ensureTechnicianSchemaFoundation()
  await ensureTicketsUnifiedTable()

  const ticketId = Number(params.ticketId ?? 0)
  const sessionUserId = Number(params.sessionUserId ?? 0)
  const storageReference = String(params.storageReference ?? '').trim()

  if (
    !Number.isInteger(ticketId) ||
    ticketId <= 0 ||
    !Number.isInteger(sessionUserId) ||
    sessionUserId <= 0 ||
    !storageReference
  ) {
    return {
      success: false,
      evidenceId: null,
      inserted: false,
      branchDenied: false,
      ownershipDenied: true,
    }
  }

  const branchIdsArr = Array.isArray(params.sessionBranchIds)
    ? params.sessionBranchIds.filter((n) => Number.isInteger(n) && n > 0)
    : []
  const branchIdRaw = params.branchId
  const branchIdNum = Number(branchIdRaw ?? 0)
  const branchId: number | null =
    Number.isInteger(branchIdNum) && branchIdNum > 0 ? branchIdNum : null

  if (branchId != null && branchIdsArr.length > 0 && !branchIdsArr.includes(branchId)) {
    return {
      success: false,
      evidenceId: null,
      inserted: false,
      branchDenied: true,
      ownershipDenied: false,
    }
  }

  const ownership = await getActiveTechnicianAssignmentByTicketId(ticketId, sessionUserId)
  if (!ownership?.found) {
    return {
      success: false,
      evidenceId: null,
      inserted: false,
      branchDenied: false,
      ownershipDenied: true,
    }
  }

  const hasTicketId = await hasReviewDbColumn('ticket_work_evidences', 'ticket_id')
  const hasUploader = await hasReviewDbColumn('ticket_work_evidences', 'uploaded_by_user_id')
  const hasUploadedAt = await hasReviewDbColumn('ticket_work_evidences', 'uploaded_at')
  const hasEvidenceType = await hasReviewDbColumn('ticket_work_evidences', 'evidence_type')
  const hasStorageRef = await hasReviewDbColumn('ticket_work_evidences', 'storage_reference')
  const hasNotes = await hasReviewDbColumn('ticket_work_evidences', 'notes')
  const hasBranchId = await hasReviewDbColumn('ticket_work_evidences', 'branch_id')

  if (!hasTicketId || !hasStorageRef) {
    return {
      success: false,
      evidenceId: null,
      inserted: false,
      branchDenied: false,
      ownershipDenied: true,
    }
  }

  const cols: string[] = ['ticket_id']
  const vals: unknown[] = [ticketId]

  if (hasUploader) {
    cols.push('uploaded_by_user_id')
    vals.push(sessionUserId)
  }
  if (hasUploadedAt) {
    cols.push('uploaded_at')
    vals.push(new Date())
  }
  if (hasEvidenceType) {
    cols.push('evidence_type')
    vals.push(params.evidenceType && String(params.evidenceType).trim()
      ? String(params.evidenceType).trim().slice(0, 64)
      : null)
  }
  cols.push('storage_reference')
  vals.push(storageReference.slice(0, 512))
  if (hasNotes) {
    cols.push('notes')
    vals.push(params.notes && String(params.notes).trim()
      ? String(params.notes).trim().slice(0, 65535)
      : null)
  }
  if (hasBranchId) {
    cols.push('branch_id')
    vals.push(branchId)
  }

  const placeholders = cols.map(() => '?').join(', ')
  const sql = `INSERT INTO ticket_work_evidences (${cols.join(', ')}) VALUES (${placeholders})`

  const res = await runReviewDbExecute<ExecuteResult>(sql, vals).catch(() => ({
    affectedRows: 0,
    insertId: 0,
  }))
  const affected = Number(res?.affectedRows ?? 0)
  const insertId = Number(res?.insertId ?? 0)
  const validInsertId = Number.isInteger(insertId) && insertId > 0 ? insertId : null

  return {
    success: affected > 0,
    evidenceId: validInsertId,
    inserted: affected > 0,
    branchDenied: false,
    ownershipDenied: false,
  }
}

export async function getTicketEvidences(
  ticketId: number,
  sessionUserId: number,
  sessionBranchIds: number[],
  role: string,
): Promise<TicketEvidenceRow[]> {
  await ensureTechnicianSchemaFoundation()
  const ticketIdNum = Number(ticketId ?? 0)
  const sessionUserIdNum = Number(sessionUserId ?? 0)
  const roleUp = String(role ?? '').trim().toUpperCase()

  if (
    !Number.isInteger(ticketIdNum) ||
    ticketIdNum <= 0 ||
    !Number.isInteger(sessionUserIdNum) ||
    sessionUserIdNum <= 0
  ) {
    return []
  }

  const ownership = await getActiveTechnicianAssignmentByTicketId(ticketIdNum, sessionUserIdNum)
  if (!ownership?.found) {
    return []
  }

  const tableExists = await hasReviewDbTable('ticket_work_evidences')
  if (!tableExists) {
    return []
  }

  const hasId = await hasReviewDbColumn('ticket_work_evidences', 'id')
  const hasTicketId = await hasReviewDbColumn('ticket_work_evidences', 'ticket_id')
  const hasUploader = await hasReviewDbColumn('ticket_work_evidences', 'uploaded_by_user_id')
  const hasUploadedAt = await hasReviewDbColumn('ticket_work_evidences', 'uploaded_at')
  const hasEvidenceType = await hasReviewDbColumn('ticket_work_evidences', 'evidence_type')
  const hasStorageRef = await hasReviewDbColumn('ticket_work_evidences', 'storage_reference')
  const hasNotes = await hasReviewDbColumn('ticket_work_evidences', 'notes')
  const hasBranchId = await hasReviewDbColumn('ticket_work_evidences', 'branch_id')
  const hasCreatedAt = await hasReviewDbColumn('ticket_work_evidences', 'created_at')
  const hasUpdatedAt = await hasReviewDbColumn('ticket_work_evidences', 'updated_at')

  if (!hasId || !hasTicketId) {
    return []
  }

  const cols: string[] = []
  cols.push(hasId ? 'id' : 'NULL AS id')
  cols.push(hasTicketId ? 'ticket_id AS ticketId' : `${ticketIdNum} AS ticketId`)
  cols.push(hasUploader ? 'uploaded_by_user_id AS uploadedByUserId' : 'NULL AS uploadedByUserId')
  cols.push(hasUploadedAt ? 'uploaded_at AS uploadedAt' : 'CURRENT_TIMESTAMP AS uploadedAt')
  cols.push(hasEvidenceType ? 'evidence_type AS evidenceType' : 'NULL AS evidenceType')
  cols.push(hasStorageRef ? 'storage_reference AS storageReference' : 'NULL AS storageReference')
  cols.push(hasNotes ? 'notes AS notes' : 'NULL AS notes')
  cols.push(hasBranchId ? 'branch_id AS branchId' : 'NULL AS branchId')
  cols.push(hasCreatedAt ? 'created_at AS createdAt' : 'CURRENT_TIMESTAMP AS createdAt')
  cols.push(hasUpdatedAt ? 'updated_at AS updatedAt' : 'CURRENT_TIMESTAMP AS updatedAt')

  const rows = await runReviewDbQuery<TicketEvidenceRow>(
    `SELECT ${cols.join(', ')} FROM ticket_work_evidences WHERE ticket_id = ? ORDER BY id DESC LIMIT 500`,
    [ticketIdNum],
  ).catch(() => [])

  return rows
}

export async function hasMinimumEvidence(
  ticketId: number,
  ticketType: 'PSB' | 'TROUBLE' | 'DISMANTLE',
): Promise<boolean> {
  try {
    const ticketIdNum = Number(ticketId ?? 0)
    if (!Number.isInteger(ticketIdNum) || ticketIdNum <= 0) {
      return false
    }
    const tt = String(ticketType ?? '').trim().toUpperCase()
    if (tt !== 'PSB' && tt !== 'TROUBLE' && tt !== 'DISMANTLE') {
      return false
    }
    const tableExists = await hasReviewDbTable('ticket_work_evidences')
    if (!tableExists) {
      return false
    }
    const hasTicketId = await hasReviewDbColumn('ticket_work_evidences', 'ticket_id')
    if (!hasTicketId) {
      return false
    }
    const rows = await runReviewDbQuery<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ticket_work_evidences WHERE ticket_id = ? LIMIT 1`,
      [ticketIdNum],
    ).catch(() => [{ n: 0 }])
    const count = Number(rows?.[0]?.n ?? 0)
    return count >= 1
  } catch {
    return false
  }
}

void runReviewDbTransaction
void getActiveTechnicianAssignmentByTicketId
