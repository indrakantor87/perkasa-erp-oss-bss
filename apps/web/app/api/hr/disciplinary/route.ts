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
  ALLOWED_DISCIPLINARY_STATUS,
  ALLOWED_SP_LEVELS,
  type DisciplinaryRow,
  type DisciplinaryStatus,
  type InsertResult,
  type SpLevel,
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

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'view')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  await ensureHrBatch01Schema()
  await ensureHrDisciplinaryRecordsTable()

  const url = new URL(request.url)
  const employeeId = parsePositiveInt(url.searchParams.get('employee_id'))
  const spLevelRaw = String(url.searchParams.get('sp_level') ?? '').trim().toUpperCase()
  const statusRaw = String(url.searchParams.get('status') ?? '').trim().toUpperCase()
  const incidentFrom = parseIsoDate(url.searchParams.get('incident_from'))
  const incidentTo = parseIsoDate(url.searchParams.get('incident_to'))
  const keyword = String(url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(Number.parseInt(String(url.searchParams.get('limit') ?? '200'), 10), 500)
  const offset = Math.max(Number.parseInt(String(url.searchParams.get('offset') ?? '0'), 10), 0)

  const clauses: string[] = []
  const params: unknown[] = []

  if (employeeId) {
    clauses.push('hdr.employee_id = ?')
    params.push(employeeId)
  }
  if (ALLOWED_SP_LEVELS.includes(spLevelRaw as SpLevel)) {
    clauses.push('UPPER(hdr.sp_level) = ?')
    params.push(spLevelRaw)
  }
  if (ALLOWED_DISCIPLINARY_STATUS.includes(statusRaw as DisciplinaryStatus)) {
    clauses.push('UPPER(hdr.status) = ?')
    params.push(statusRaw)
  }
  if (incidentFrom) {
    clauses.push('hdr.incident_date >= ?')
    params.push(incidentFrom)
  }
  if (incidentTo) {
    clauses.push('hdr.incident_date <= ?')
    params.push(incidentTo)
  }
  if (keyword) {
    clauses.push(
      '(UPPER(he.full_name) LIKE ? OR UPPER(he.employee_code) LIKE ? OR UPPER(hdr.violation_clause) LIKE ? OR UPPER(hdr.violation_detail) LIKE ?)',
    )
    const like = `%${keyword.toUpperCase()}%`
    params.push(like, like, like, like)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<DisciplinaryRow>(
    `
      SELECT
        ${buildSelectFields('hdr.')}
      FROM hr_disciplinary_records hdr
      JOIN hr_employees he
        ON he.id = hdr.employee_id
      LEFT JOIN org_divisions od
        ON od.id = he.division_id
      ${where}
      ORDER BY
        hdr.incident_date DESC,
        hdr.id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    params,
  )

  const [totalRow] = await runReviewDbQuery<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM hr_disciplinary_records hdr
      JOIN hr_employees he ON he.id = hdr.employee_id
      ${where}
    `,
    params,
  ).catch(() => [{ total: rows.length }]) as { total: number }[]

  return Response.json({
    data: rows,
    total: Number(totalRow?.total ?? rows.length),
    allowedSpLevels: ALLOWED_SP_LEVELS,
    allowedStatuses: ALLOWED_DISCIPLINARY_STATUS,
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'create')) return Response.json({ message: 'Forbidden' }, { status: 403 })
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action Sanksi SP hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }
  await ensureHrBatch01Schema()
  await ensureHrDisciplinaryRecordsTable()

  try {
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
    }

    const employeeId = parsePositiveInt(payload.employeeId)
    if (!employeeId) {
      return Response.json({ message: 'employeeId wajib diisi (id karyawan yang dikenakan sanksi).' }, { status: 400 })
    }
    const spLevel = normalizeSpLevel(payload.spLevel)
    const incidentDate = parseIsoDate(payload.incidentDate)
    if (!incidentDate) {
      return Response.json({ message: 'incidentDate tanggal kejadian wajib diisi (format YYYY-MM-DD).' }, { status: 400 })
    }
    const effectiveFrom = parseIsoDate(payload.effectiveFrom) || incidentDate
    const effectiveTo = parseIsoDate(payload.effectiveTo)
    const violationClause = String(payload.violationClause ?? '').trim()
    if (!violationClause) {
      return Response.json({ message: 'violationClause pasal/point peraturan perusahaan yang dilanggar wajib diisi.' }, { status: 400 })
    }
    const violationDetail = String(payload.violationDetail ?? '').trim()
    if (!violationDetail) {
      return Response.json({ message: 'violationDetail kronologis / deskripsi pelanggaran wajib diisi.' }, { status: 400 })
    }
    const actionTaken = payload.actionTaken === undefined || payload.actionTaken === null ? null : String(payload.actionTaken).trim() || null
    const coachingNotes = payload.coachingNotes === undefined || payload.coachingNotes === null ? null : String(payload.coachingNotes).trim() || null
    const followUpDate = parseIsoDate(payload.followUpDate)
    const attachmentDocId = parsePositiveInt(payload.attachmentDocId)
    const status = normalizeDisciplinaryStatus(payload.status || 'DRAFT')
    const rejectionReason = payload.rejectionReason === undefined || payload.rejectionReason === null ? null : String(payload.rejectionReason).trim() || null
    const incidentLocation = payload.incidentLocation === undefined || payload.incidentLocation === null ? null : String(payload.incidentLocation).trim() || null

    const [emp] = await runReviewDbQuery<{ id: number; employeeCode: string; fullName: string }>(
      `SELECT id, employee_code AS employeeCode, full_name AS fullName FROM hr_employees WHERE id = ? LIMIT 1`,
      [employeeId],
    )
    if (!emp) {
      return Response.json({ message: `Karyawan dengan employee_id=${employeeId} tidak ditemukan di hr_employees.` }, { status: 400 })
    }

    const ins = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_disciplinary_records (
          employee_id,
          sp_level,
          incident_date,
          incident_location,
          effective_from,
          effective_to,
          violation_clause,
          violation_detail,
          action_taken,
          coaching_notes,
          follow_up_date,
          attachment_doc_id,
          status,
          rejection_reason,
          created_by_user_id,
          updated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employeeId,
        spLevel,
        incidentDate,
        incidentLocation,
        effectiveFrom,
        effectiveTo,
        violationClause,
        violationDetail,
        actionTaken,
        coachingNotes,
        followUpDate,
        attachmentDocId,
        status,
        rejectionReason,
        parsePositiveInt(session.userId) || null,
        parsePositiveInt(session.userId) || null,
      ],
    )
    const id = Number(ins.insertId ?? 0)

    await recordHrAudit({
      actionType: 'HR_DISCIPLINARY_SP_CREATE',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `SP-${id}`,
      detail: `Create SP id=${id} employee=${emp.employeeCode} ${emp.fullName} level=${spLevel} incident=${incidentDate} status=${status} violationClause=${violationClause.substring(0, 80)}`,
    })

    const [newRow] = await runReviewDbQuery<DisciplinaryRow>(
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

    return Response.json({ id, data: newRow || null, employee: emp }, { status: 201 })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal create record Sanksi SP: ${detail}` }, { status: 500 })
  }
}
