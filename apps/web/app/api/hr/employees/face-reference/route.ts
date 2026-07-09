import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { upsertHrEmployeeFaceReference } from '@/lib/services/hr-attendance-face-service'

const allowedVerificationModes = new Set(['MANUAL_REVIEW', 'CAMERA_CAPTURE'])

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
  employmentStatus: string
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
      { message: 'Baseline referensi wajah employee hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      employeeId?: unknown
      verificationMode?: unknown
      referenceRef?: unknown
      notes?: unknown
    }

    const employeeId = Number.parseInt(String(payload.employeeId ?? '').trim(), 10)
    const verificationMode = String(payload.verificationMode ?? '').trim().toUpperCase() || 'CAMERA_CAPTURE'
    const referenceRef = String(payload.referenceRef ?? '').trim()
    const notes = String(payload.notes ?? '').trim()

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return Response.json({ message: 'Employee HR tidak valid.' }, { status: 400 })
    }
    if (!allowedVerificationModes.has(verificationMode)) {
      return Response.json({ message: 'Mode referensi wajah tidak valid.' }, { status: 400 })
    }
    if (!referenceRef) {
      return Response.json({ message: 'Referensi wajah wajib diisi.' }, { status: 400 })
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
      return Response.json(
        { message: 'Employee ARCHIVED tidak dapat diberi baseline referensi wajah sampai diaktifkan kembali.' },
        { status: 409 },
      )
    }

    await upsertHrEmployeeFaceReference({
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      verificationMode,
      referenceRef,
      notes,
      updatedBy: `${session.displayName} (${session.username})`,
      sourceType: 'MANUAL_ENTRY',
      sourceRef: `EMP-${employee.id}`,
    })

    await recordHrAudit({
      actionType: 'EMPLOYEE_FACE_REFERENCE_UPSERT',
      actor: `${session.displayName} (${session.username})`,
      targetRef: employee.employeeCode,
      detail: `Baseline referensi wajah untuk ${employee.employeeCode} - ${employee.fullName} disimpan dengan mode ${verificationMode} dan referensi ${referenceRef}.`,
    })

    return Response.json({
      message: `Baseline referensi wajah ${employee.employeeCode} - ${employee.fullName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
