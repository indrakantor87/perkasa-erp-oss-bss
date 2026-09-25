import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  createMapping,
  ensureFingerprintTables,
  listMappings,
  autoRevokeResignedEmployeeMappings,
} from '@/lib/services/fingerprint/device-registry-service'
import type { FpMappingCreateInput } from '@/lib/services/fingerprint/types'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    await ensureFingerprintTables()
    const url = new URL(request.url)
    const machineIdRaw = url.searchParams.get('machineId')
    const machineId = machineIdRaw ? Number.parseInt(machineIdRaw, 10) : undefined

    await autoRevokeResignedEmployeeMappings()

    const data = await listMappings(
      Number.isFinite(machineId) && machineId! > 0 ? machineId : undefined,
    )
    return Response.json({ data })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action mapping fingerprint HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    await ensureFingerprintTables()

    const payload = (await request.json()) as {
      machineId?: unknown
      machineUserId?: unknown
      employeeId?: unknown
      enrollmentStatus?: unknown
    }

    const machineId = Number.parseInt(String(payload.machineId ?? ''), 10)
    const machineUserId = String(payload.machineUserId ?? '').trim()
    const employeeId = Number.parseInt(String(payload.employeeId ?? ''), 10)
    const enrollmentStatusRaw = String(payload.enrollmentStatus ?? 'ENROLLED').trim().toUpperCase()

    const enrollmentStatus =
      enrollmentStatusRaw === 'PENDING' || enrollmentStatusRaw === 'REVOKED'
        ? enrollmentStatusRaw
        : 'ENROLLED'

    const input: FpMappingCreateInput = {
      machineId,
      machineUserId,
      employeeId,
      enrollmentStatus,
    }

    const result = await createMapping(input)

    if (result.conflict) {
      return Response.json(
        {
          message: `Mapping machine_user_id ${machineUserId} untuk device ${machineId} sudah ada. Gunakan ID mapping lain atau REVOKE dahulu.`,
          data: result.mapping,
        },
        { status: 409 },
      )
    }

    const empLabel = result.mapping.fullName
      ? `${result.mapping.employeeCode ?? '-'} - ${result.mapping.fullName}`
      : `employee_id:${employeeId}`

    await recordHrAudit({
      actionType: 'FP_MAP_EMPLOYEE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `FP-MAP-${result.mapping.id}`,
      detail: `Mapping fingerprint device ${machineId} user ${machineUserId} ke ${empLabel} dibuat dengan status ${enrollmentStatus}.`,
    })

    return Response.json({
      message: `Mapping fingerprint ${machineUserId} ke ${empLabel} berhasil disimpan.`,
      data: result.mapping,
      created: result.created,
    })
  } catch (error) {
    const msg = error instanceof Error && error.message === 'VALIDATION_ERROR'
      ? 'Validasi input mapping fingerprint gagal. Pastikan machine_id, machine_user_id, dan employee_id terisi valid.'
      : getReviewDbErrorDetail(error)
    return Response.json({ message: msg }, { status: 500 })
  }
}
