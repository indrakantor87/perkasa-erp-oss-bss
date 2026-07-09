import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'

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
      { message: 'Archive employee HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      employeeId?: unknown
      reason?: unknown
    }

    const employeeId = Number.parseInt(String(payload.employeeId ?? '').trim(), 10)
    const reason = String(payload.reason ?? '').trim()

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return Response.json({ message: 'Employee HR tidak valid.' }, { status: 400 })
    }
    if (!reason) {
      return Response.json({ message: 'Alasan archive employee wajib diisi.' }, { status: 400 })
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
    if (currentStatus === 'ARCHIVED') {
      return Response.json({ message: 'Employee HR ini sudah berstatus ARCHIVED.' }, { status: 409 })
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE hr_employees
        SET
          employment_status = 'ARCHIVED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [employee.id],
    )

    await recordHrAudit({
      actionType: 'EMPLOYEE_ARCHIVE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: employee.employeeCode,
      detail: `Employee ${employee.employeeCode} - ${employee.fullName} diarsipkan secara non-destruktif dari status ${currentStatus} dengan alasan: ${reason}.`,
    })

    return Response.json({
      message: `Employee ${employee.employeeCode} - ${employee.fullName} berhasil diarsipkan tanpa menghapus histori.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
