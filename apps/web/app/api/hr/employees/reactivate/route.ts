import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'

const allowedEmploymentStatuses = new Set(['KARYAWAN', 'KONTRAK', 'MAGANG', 'ACTIVE'])

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
  employmentStatus: string
}

type ExecuteResult = {
  affectedRows?: number
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Reaktivasi employee HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      employeeId?: unknown
      nextStatus?: unknown
      reason?: unknown
    }

    const employeeId = Number.parseInt(String(payload.employeeId ?? '').trim(), 10)
    const nextStatus = String(payload.nextStatus ?? '').trim().toUpperCase()
    const reason = String(payload.reason ?? '').trim()

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return Response.json({ message: 'Employee HR tidak valid.' }, { status: 400 })
    }
    if (!nextStatus || nextStatus === 'ARCHIVED' || !allowedEmploymentStatuses.has(nextStatus)) {
      return Response.json({ message: 'Status aktif tujuan tidak valid.' }, { status: 400 })
    }
    if (!reason) {
      return Response.json({ message: 'Alasan reaktivasi employee wajib diisi.' }, { status: 400 })
    }

    const [employee] = await runReviewDbQuery<EmployeeRow>(
      `
        SELECT
          id,
          employee_code AS employeeCode,
          full_name AS fullName,
          employment_status AS employmentStatus
        FROM hr_employees
        WHERE id = ?
        LIMIT 1
      `,
      [employeeId],
    )
    if (!employee) {
      return Response.json({ message: 'Employee HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const currentStatus = String(employee.employmentStatus ?? '').trim().toUpperCase()
    if (currentStatus !== 'ARCHIVED') {
      return Response.json({ message: 'Employee HR ini belum berstatus ARCHIVED.' }, { status: 409 })
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_employees
        SET
          employment_status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextStatus, employee.id],
    )

    await recordHrAudit({
      actionType: 'EMPLOYEE_REACTIVATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: employee.employeeCode,
      detail: `Employee ${employee.employeeCode} - ${employee.fullName} diaktifkan kembali dari ARCHIVED ke ${nextStatus} dengan alasan: ${reason}.`,
    })

    return Response.json({
      message: `Employee ${employee.employeeCode} - ${employee.fullName} berhasil diaktifkan kembali ke status ${nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
