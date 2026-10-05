import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'
import {
  ensureHrDisciplinaryRecordsTable,
  normalizeDisciplinaryStatus,
  normalizeSpLevel,
  parseIsoDate,
  parsePositiveInt,
  type DisciplinaryRow,
  type InsertResult,
} from '@/lib/services/hr-disciplinary-schema-ensure'

function buildSelectFields(prefix = '') {
  return `
    ${prefix}id AS id,
    ${prefix}employee_id AS employeeId,
    he.employee_code AS employeeCode,
    he.full_name AS employeeName,
    od.name AS divisionName,
    ${prefix}sp_level AS spLevel,
    CAST(${prefix}incident_date AS CHAR) AS incidentDate,
    ${prefix}incident_location AS incidentLocation,
    CAST(${prefix}effective_from AS CHAR) AS effectiveFrom,
    CAST(${prefix}effective_to AS CHAR) AS effectiveTo,
    ${prefix}violation_clause AS violationClause,
    ${prefix}violation_detail AS violationDetail,
    ${prefix}action_taken AS actionTaken,
    ${prefix}coaching_notes AS coachingNotes,
    CAST(${prefix}follow_up_date AS CHAR) AS followUpDate,
    ${prefix}attachment_doc_id AS attachmentDocId,
    ${prefix}status AS status,
    CAST(${prefix}supervisor_approved_at AS CHAR) AS supervisorApprovedAt,
    CAST(${prefix}hr_approved_at AS CHAR) AS hrApprovedAt,
    CAST(${prefix}rejected_at AS CHAR) AS rejectedAt,
    ${prefix}rejection_reason AS rejectionReason,
    CAST(${prefix}created_at AS CHAR) AS createdAt,
    CAST(${prefix}updated_at AS CHAR) AS updatedAt
  `
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  await ensureHrBatch01Schema()
  await ensureHrDisciplinaryRecordsTable()
  const id = parsePositiveInt(idLocal)
  if (!id) return Response.json({ message: 'id disciplinary SP tidak valid (harus integer positif).' }, { status: 400 })

  const rows = await runReviewDbQuery<DisciplinaryRow>(
    `
      SELECT
        ${buildSelectFields('hdr.')}
      FROM hr_disciplinary_records hdr
      JOIN hr_employees he
        ON he.id = hdr.employee_id
      LEFT JOIN org_divisions od
        ON od.id = he.division_id
      WHERE hdr.id = ?
      LIMIT 1
    `,
    [id],
  )
  if (rows.length === 0) return Response.json({ message: `Record Sanksi SP dengan id=${id} tidak ditemukan.` }, { status: 404 })
  return Response.json({ data: rows[0] })
}

const FINAL_LOCKED_STATUSES = new Set(['HR_APPROVED', 'ACTIVE', 'REJECTED', 'EXPIRED'])

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action Sanksi SP hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }
  await ensureHrBatch01Schema()
  await ensureHrDisciplinaryRecordsTable()
  const id = parsePositiveInt(idLocal)
  if (!id) return Response.json({ message: 'id disciplinary SP tidak valid (harus integer positif).' }, { status: 400 })

  try {
    const [existing] = await runReviewDbQuery<DisciplinaryRow>(
      `
        SELECT
          ${buildSelectFields('hdr.')}
        FROM hr_disciplinary_records hdr
        JOIN hr_employees he
          ON he.id = hdr.employee_id
        LEFT JOIN org_divisions od
          ON od.id = he.division_id
        WHERE hdr.id = ?
        LIMIT 1
      `,
      [id],
    )
    if (!existing) return Response.json({ message: `Record Sanksi SP id=${id} tidak ditemukan.` }, { status: 404 })

    if (FINAL_LOCKED_STATUSES.has(existing.status.toUpperCase()) && canPerformAction(session.role, 'hr', 'update') === false) {
      return Response.json(
        { message: `Status SP saat ini=${existing.status} sudah FINAL dan tidak bisa diubah tanpa role HR/Super Admin.` },
        { status: 409 },
      )
    }

    const payload = (await request.json()) as {
      employeeId?: unknown
      spLevel?: unknown
      incidentDate?: unknown
      incidentLocation?: unknown
      effectiveFrom?: unknown
      effectiveTo?: unknown
      violationClause?: unknown
      violationDetail?: unknown
      actionTaken?: unknown
      coachingNotes?: unknown
      followUpDate?: unknown
      attachmentDocId?: unknown
      status?: unknown
      rejectionReason?: unknown
      supervisorApprove?: unknown
      hrApprove?: unknown
      reject?: unknown
    }

    const nextEmployeeId = payload.employeeId === undefined ? existing.employeeId : (parsePositiveInt(payload.employeeId) || existing.employeeId)
    const nextSpLevel = payload.spLevel === undefined ? (existing.spLevel as any) : normalizeSpLevel(payload.spLevel)
    const nextIncidentDate = parseIsoDate(payload.incidentDate ?? existing.incidentDate) || String(existing.incidentDate).split('T')[0].split(' ')[0]
    const nextIncidentLocation = payload.incidentLocation === undefined ? existing.incidentLocation : (payload.incidentLocation === null ? null : String(payload.incidentLocation).trim() || null)
    const nextEffectiveFrom = parseIsoDate(payload.effectiveFrom ?? existing.effectiveFrom) || String(existing.effectiveFrom).split('T')[0].split(' ')[0] || nextIncidentDate
    const nextEffectiveTo = payload.effectiveTo === undefined ? existing.effectiveTo : (parseIsoDate(payload.effectiveTo) || null)
    const nextViolationClause = payload.violationClause === undefined ? existing.violationClause : String(payload.violationClause ?? '').trim()
    const nextViolationDetail = payload.violationDetail === undefined ? existing.violationDetail : String(payload.violationDetail ?? '').trim()
    const nextActionTaken = payload.actionTaken === undefined ? existing.actionTaken : (payload.actionTaken === null ? null : String(payload.actionTaken).trim() || null)
    const nextCoachingNotes = payload.coachingNotes === undefined ? existing.coachingNotes : (payload.coachingNotes === null ? null : String(payload.coachingNotes).trim() || null)
    const nextFollowUpDate = payload.followUpDate === undefined ? existing.followUpDate : (parseIsoDate(payload.followUpDate) || null)
    const nextAttachmentDocId = payload.attachmentDocId === undefined ? existing.attachmentDocId : (parsePositiveInt(payload.attachmentDocId) || null)
    const rejectionReason = payload.rejectionReason === undefined ? existing.rejectionReason : (payload.rejectionReason === null ? null : String(payload.rejectionReason).trim() || null)

    let nextStatus = normalizeDisciplinaryStatus(payload.status || existing.status)
    if (payload.supervisorApprove === true) nextStatus = 'SUPERVISOR_APPROVED'
    if (payload.hrApprove === true) nextStatus = 'HR_APPROVED'
    if (payload.reject === true) nextStatus = 'REJECTED'

    if (!nextViolationClause) return Response.json({ message: 'violationClause tidak boleh kosong.' }, { status: 400 })
    if (!nextViolationDetail) return Response.json({ message: 'violationDetail tidak boleh kosong.' }, { status: 400 })

    const updates: string[] = []
    const values: unknown[] = []

    updates.push('employee_id = ?'); values.push(nextEmployeeId)
    updates.push('sp_level = ?'); values.push(nextSpLevel)
    updates.push('incident_date = ?'); values.push(nextIncidentDate)
    updates.push('incident_location = ?'); values.push(nextIncidentLocation)
    updates.push('effective_from = ?'); values.push(nextEffectiveFrom)
    updates.push('effective_to = ?'); values.push(nextEffectiveTo)
    updates.push('violation_clause = ?'); values.push(nextViolationClause)
    updates.push('violation_detail = ?'); values.push(nextViolationDetail)
    updates.push('action_taken = ?'); values.push(nextActionTaken)
    updates.push('coaching_notes = ?'); values.push(nextCoachingNotes)
    updates.push('follow_up_date = ?'); values.push(nextFollowUpDate)
    updates.push('attachment_doc_id = ?'); values.push(nextAttachmentDocId)
    updates.push('status = ?'); values.push(nextStatus)
    updates.push('rejection_reason = ?'); values.push(nextStatus === 'REJECTED' ? (rejectionReason || 'Tidak disebutkan.') : rejectionReason)
    updates.push('updated_by_user_id = ?'); values.push(parsePositiveInt(session.userId) || null)

    if (nextStatus === 'SUPERVISOR_APPROVED' && existing.status.toUpperCase() !== 'SUPERVISOR_APPROVED') {
      updates.push('supervisor_approved_at = NOW()')
      updates.push('supervisor_approved_by_user_id = ?')
      values.push(parsePositiveInt(session.userId) || null)
    }
    if (nextStatus === 'HR_APPROVED' && existing.status.toUpperCase() !== 'HR_APPROVED') {
      updates.push('hr_approved_at = NOW()')
      updates.push('hr_approved_by_user_id = ?')
      values.push(parsePositiveInt(session.userId) || null)
    }
    if (nextStatus === 'REJECTED' && existing.status.toUpperCase() !== 'REJECTED') {
      updates.push('rejected_at = NOW()')
      updates.push('rejected_by_user_id = ?')
      values.push(parsePositiveInt(session.userId) || null)
    }

    const updated = await runReviewDbExecute<InsertResult>(
      `UPDATE hr_disciplinary_records SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id],
    )

    await recordHrAudit({
      actionType: 'HR_DISCIPLINARY_SP_UPDATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `SP-${id}`,
      detail: `Update SP id=${id} newStatus=${nextStatus} level=${nextSpLevel} incidentDate=${nextIncidentDate} changed=${updated.changedRows ?? 0}`,
    })

    const [row] = await runReviewDbQuery<DisciplinaryRow>(
      `
        SELECT
          ${buildSelectFields('hdr.')}
        FROM hr_disciplinary_records hdr
        JOIN hr_employees he
          ON he.id = hdr.employee_id
        LEFT JOIN org_divisions od
          ON od.id = he.division_id
        WHERE hdr.id = ?
        LIMIT 1
      `,
      [id],
    )

    return Response.json({ id, changed: updated.changedRows ?? 0, data: row || null, newStatus: nextStatus })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal update Sanksi SP: ${detail}` }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idLocal } = await params
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action Sanksi SP hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }
  await ensureHrBatch01Schema()
  await ensureHrDisciplinaryRecordsTable()
  const id = parsePositiveInt(idLocal)
  if (!id) return Response.json({ message: 'id disciplinary SP tidak valid (harus integer positif).' }, { status: 400 })

  const [existing] = await runReviewDbQuery<DisciplinaryRow>(
    `SELECT ${buildSelectFields('hdr.')} FROM hr_disciplinary_records hdr JOIN hr_employees he ON he.id = hdr.employee_id LEFT JOIN org_divisions od ON od.id = he.division_id WHERE hdr.id = ? LIMIT 1`,
    [id],
  )
  if (!existing) return Response.json({ message: `Record Sanksi SP id=${id} tidak ditemukan.` }, { status: 404 })

  const safeToHardDelete = existing.status.toUpperCase() === 'DRAFT' || existing.status.toUpperCase() === 'CANCELLED'
  try {
    if (safeToHardDelete) {
      const del = await runReviewDbExecute<InsertResult>(`DELETE FROM hr_disciplinary_records WHERE id = ?`, [id])
      await recordHrAudit({
        actionType: 'HR_DISCIPLINARY_SP_DELETE_HARD',
        actor: `${session.role}:${session.displayName}`,
        targetRef: `SP-${id}`,
        detail: `Hard-delete SP id=${id} status=${existing.status} employee=${existing.employeeCode} ${existing.employeeName} deleted=${del.affectedRows ?? 0}`,
      })
      return Response.json({ id, hardDeleted: true, affected: del.affectedRows ?? 0, reason: 'Status DRAFT/CANCELLED -> hard delete diizinkan.' })
    }

    const soft = await runReviewDbExecute<InsertResult>(
      `UPDATE hr_disciplinary_records SET status = ?, rejection_reason = ?, updated_by_user_id = ? WHERE id = ? AND status NOT IN ('EXPIRED')`,
      ['CANCELLED', `Dibatalkan via delete oleh ${session.role} ${String(session.displayName ?? '').substring(0, 40)} pada ${new Date().toISOString().slice(0,10)}.`, parsePositiveInt(session.userId) || null, id],
    )
    await recordHrAudit({
      actionType: 'HR_DISCIPLINARY_SP_CANCEL_SOFT',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `SP-${id}`,
      detail: `Soft-cancel SP id=${id} status_lama=${existing.status} changed=${soft.changedRows ?? 0} -> status baru CANCELLED (tidak hard delete karena status final).`,
    })
    return Response.json({ id, softCancelled: true, changed: soft.changedRows ?? 0, reason: 'Status selain DRAFT/CANCELLED -> tidak boleh hard delete; soft di-set CANCELLED untuk audit trail permanen.' })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal delete/cancel Sanksi SP: ${detail}` }, { status: 500 })
  }
}
