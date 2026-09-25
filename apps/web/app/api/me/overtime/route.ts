import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

type AggregateRow = {
  total_sum: number
}

type EmpSupervisorRow = {
  supervisor_id: number | null
}

function toISODateString(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const d = new Date(s)
  if (!Number.isFinite(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeTimeHHMMSS(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const reShort = /^(\d{1,2}):(\d{1,2})$/
  const reLong = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/
  const m1 = s.match(reShort)
  if (m1) {
    const h = String(Number(m1[1])).padStart(2, '0')
    const mm = String(Number(m1[2])).padStart(2, '0')
    return `${h}:${mm}:00`
  }
  const m2 = s.match(reLong)
  if (m2) {
    const h = String(Number(m2[1])).padStart(2, '0')
    const mm = String(Number(m2[2])).padStart(2, '0')
    const ss = String(Number(m2[3])).padStart(2, '0')
    return `${h}:${mm}:${ss}`
  }
  return null
}

function calcMinutesFromTimes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  return endMin - startMin
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action overtime hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  await ensureHrBatch02b()

  try {
    const me = await requireEmployeeByAuthUserId(session.userId)
    const payload = (await request.json()) as {
      overtime_date?: unknown
      planned_start_time?: unknown
      planned_end_time?: unknown
      reason?: unknown
    }

    const overtimeDate = toISODateString(payload.overtime_date)
    const plannedStartTime = normalizeTimeHHMMSS(payload.planned_start_time)
    const plannedEndTime = normalizeTimeHHMMSS(payload.planned_end_time)
    const reason = String(payload.reason ?? '').trim()

    if (!overtimeDate) {
      return Response.json({ message: 'overtime_date wajib diisi dengan format tanggal valid.' }, { status: 400 })
    }
    if (!plannedStartTime) {
      return Response.json({ message: 'planned_start_time wajib diisi format HH:MM atau HH:MM:SS.' }, { status: 400 })
    }
    if (!plannedEndTime) {
      return Response.json({ message: 'planned_end_time wajib diisi format HH:MM atau HH:MM:SS.' }, { status: 400 })
    }

    const plannedMinutes = calcMinutesFromTimes(plannedStartTime, plannedEndTime)
    if (plannedMinutes <= 0) {
      return Response.json({ message: 'Waktu selesai lebih kecil dari mulai.' }, { status: 400 })
    }

    const aggRows = await runReviewDbQuery<AggregateRow>(
      `
        SELECT
          COALESCE(SUM(approved_minutes), 0) +
          COALESCE(SUM(CASE
            WHEN status IN ('PENDING_SUPERVISOR','APPROVED_SUPERVISOR','PENDING_HR','APPROVED_HR','DRAFT')
            THEN planned_minutes ELSE 0 END), 0) AS total_sum
        FROM hr_overtime_requests
        WHERE employee_id = ?
          AND overtime_date = ?
      `,
      [me.id, overtimeDate],
    )
    const existingSum = Number(aggRows[0]?.total_sum ?? 0)
    const totalTodayAfterAdd = existingSum + plannedMinutes
    if (totalTodayAfterAdd > 480) {
      const overLimit = totalTodayAfterAdd - 480
      return Response.json(
        {
          message: `Total lembur per hari maksimal 480 menit (8 jam). Total sekarang = ${existingSum}, ditambah request ini ${plannedMinutes} → OVER limit ${overLimit}. Kurangi durasi atau buat pengajuan lain hari.`,
          existing_sum_minutes: existingSum,
          requested_minutes: plannedMinutes,
          total_after_add: totalTodayAfterAdd,
          max_allowed_minutes: 480,
          over_limit_by_minutes: overLimit,
        },
        { status: 400 },
      )
    }

    const supRows = await runReviewDbQuery<EmpSupervisorRow>(
      `SELECT supervisor_id FROM hr_employees WHERE id = ? LIMIT 1`,
      [me.id],
    )
    const supervisorId = supRows[0]?.supervisor_id ?? null

    const insertResult = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_overtime_requests (
          employee_id,
          overtime_date,
          planned_start_time,
          planned_end_time,
          planned_minutes,
          approved_minutes,
          status,
          reason,
          supervisor_id
        ) VALUES (?, ?, ?, ?, ?, 0, 'DRAFT', ?, ?)
      `,
      [me.id, overtimeDate, plannedStartTime, plannedEndTime, plannedMinutes, reason, supervisorId],
    )

    const otId = Number(insertResult.insertId ?? 0)

    await recordHrAudit({
      actionType: 'OVERTIME_REQUEST_CREATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `OT-${otId}`,
      detail: `Overtime DRAFT dibuat oleh ${me.employee_code} - ${me.full_name} pada tanggal ${overtimeDate} ${plannedStartTime}-${plannedEndTime} (${plannedMinutes} menit). Alasan: ${reason || '-'}`,
    })

    return Response.json({
      message: 'Permohonan overtime berhasil dibuat status DRAFT.',
      overtime_request_id: otId,
      status: 'DRAFT',
      overtime_date: overtimeDate,
      planned_start_time: plannedStartTime,
      planned_end_time: plannedEndTime,
      planned_minutes: plannedMinutes,
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const me = await requireEmployeeByAuthUserId(session.userId)
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 200), 500)
    const offset = Number(searchParams.get('offset') ?? 0)
    const statusFilter = String(searchParams.get('status') ?? '').trim().toUpperCase()

    let whereClause = `WHERE employee_id = ?`
    const params: any[] = [me.id]
    if (statusFilter) {
      whereClause += ` AND status = ?`
      params.push(statusFilter)
    }

    const rows = await runReviewDbQuery<any>(
      `
        SELECT
          hor.id,
          hor.employee_id,
          CAST(hor.overtime_date AS CHAR) AS overtime_date,
          CAST(hor.planned_start_time AS CHAR) AS planned_start_time,
          CAST(hor.planned_end_time AS CHAR) AS planned_end_time,
          hor.planned_minutes,
          hor.approved_minutes,
          hor.status,
          hor.reason,
          hor.supervisor_id,
          hor.supervisor_reason,
          hor.hr_reason,
          hor.cancel_reason,
          CAST(hor.created_at AS CHAR) AS created_at,
          CAST(hor.updated_at AS CHAR) AS updated_at,
          he.employee_code,
          he.full_name
        FROM hr_overtime_requests hor
        LEFT JOIN hr_employees he ON he.id = hor.employee_id
        ${whereClause}
        ORDER BY hor.overtime_date DESC, hor.id DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset],
    )

    const countRows = await runReviewDbQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM hr_overtime_requests ${whereClause}`,
      params,
    )

    return Response.json({
      data: rows,
      total: countRows[0]?.c ?? rows.length,
      self: true,
      identity: { id: me.id, employee_code: me.employee_code, full_name: me.full_name },
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
