import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { requireEmployeeByAuthUserId } from '@/lib/services/hr/employee-identity.service'
import { resolveDirectSubordinateEmployeeIds } from '@/lib/services/supervisor-scope.service'

const HR_FULL_SCOPE_ROLES = new Set(['HR', 'SUPER_ADMIN', 'OWNER'])

type EvidenceRow = {
  id: number
  overtime_request_id: number
  file_name: string
  file_path_storage: string
  file_size_bytes: number
  uploaded_by_employee_id: number | null
  created_at: string
  ot_employee_id: number
  ot_status: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ rid: string; did: string }> },
) {
  const { rid: ridLocal, did: didLocal } = await params
const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'overtime_requests', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    await ensureHrBatch02b()

    const rid = Number.parseInt(String(ridLocal ?? '').trim(), 10)
    const did = Number.parseInt(String(didLocal ?? '').trim(), 10)

    if (!Number.isInteger(rid) || rid <= 0) {
      return Response.json({ message: 'ID overtime tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(did) || did <= 0) {
      return Response.json({ message: 'ID evidence tidak valid.' }, { status: 400 })
    }

    const rows = await runReviewDbQuery<EvidenceRow>(
      `
        SELECT
          hre.id,
          hre.overtime_request_id,
          hre.file_name,
          hre.file_path_storage,
          hre.file_size_bytes,
          hre.uploaded_by_employee_id,
          CAST(hre.created_at AS CHAR) AS created_at,
          hor.employee_id AS ot_employee_id,
          hor.status AS ot_status
        FROM hr_overtime_request_evidences hre
        JOIN hr_overtime_requests hor ON hor.id = hre.overtime_request_id
        WHERE hre.id = ?
          AND hre.overtime_request_id = ?
        LIMIT 1
      `,
      [did, rid],
    )

    const evi = rows[0]
    if (!evi) {
      return Response.json({ message: 'Evidence overtime tidak ditemukan.' }, { status: 404 })
    }

    const isFullScope = HR_FULL_SCOPE_ROLES.has(session.role)
    let allowedAccess = isFullScope

    if (!allowedAccess) {
      const subordinateIds = await resolveDirectSubordinateEmployeeIds(Number(session.userId ?? 0))
      allowedAccess = subordinateIds.includes(Number(evi.ot_employee_id))
    }

    if (!allowedAccess) {
      try {
        const me = await requireEmployeeByAuthUserId(session.userId)
        if (Number(me.id) === Number(evi.ot_employee_id)) {
          allowedAccess = true
        }
      } catch {}
    }

    if (!allowedAccess) {
      return Response.json({ message: 'Evidence overtime tidak ditemukan.' }, { status: 404 })
    }

    return Response.json({
      data: {
        id: evi.id,
        overtime_request_id: evi.overtime_request_id,
        file_name: evi.file_name,
        storage_path_ref: evi.file_path_storage,
        file_size_bytes: evi.file_size_bytes,
        uploaded_by_employee_id: evi.uploaded_by_employee_id,
        created_at: evi.created_at,
      },
    })
  } catch (error) {
    const status = error instanceof Error && (error as { status?: number }).status === 403 ? 403 : 500
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status })
  }
}
