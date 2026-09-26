import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'

type UpdateResult = {
  affectedRows?: number
  changedRows?: number
}

type OtRequestRow = {
  id: number
  employee_id: number
  status: string
  overtime_date: string
  planned_minutes: number
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
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
    const otId = Number.parseInt(String(params.id ?? '').trim(), 10)

    if (!Number.isInteger(otId) || otId <= 0) {
      return Response.json({ message: 'ID overtime tidak valid.' }, { status: 400 })
    }

    const rows = await runReviewDbQuery<OtRequestRow>(
      `
        SELECT id, employee_id, status, CAST(overtime_date AS CHAR) AS overtime_date, planned_minutes
        FROM hr_overtime_requests
        WHERE id = ?
        LIMIT 1
      `,
      [otId],
    )

    const req = rows[0]
    if (!req || Number(req.employee_id) !== Number(me.id)) {
      return Response.json({ message: 'Permohonan overtime tidak ditemukan.' }, { status: 404 })
    }

    if (req.status !== 'DRAFT') {
      return Response.json(
        { message: `Hanya overtime status DRAFT yang dapat diajukan. Status sekarang: ${req.status}` },
        { status: 409 },
      )
    }

    await runReviewDbExecute<UpdateResult>(
      `
        UPDATE hr_overtime_requests
        SET status = 'PENDING_SUPERVISOR',
            updated_at = NOW()
        WHERE id = ?
        LIMIT 1
      `,
      [otId],
    )

    await recordHrAudit({
      actionType: 'OVERTIME_REQUEST_SUBMIT',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `OT-${otId}`,
      detail: `Overtime ID=${otId} diajukan submit ke PENDING_SUPERVISOR oleh ${me.employee_code} - ${me.full_name}. Tanggal ${req.overtime_date} (${req.planned_minutes} menit).`,
    })

    return Response.json({
      message: 'Permohonan overtime berhasil diajukan ke Supervisor.',
      overtime_request_id: otId,
      status: 'PENDING_SUPERVISOR',
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
