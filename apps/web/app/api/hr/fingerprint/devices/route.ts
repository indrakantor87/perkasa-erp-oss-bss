import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  createDevice,
  listDevices,
  ensureFingerprintTables,
} from '@/lib/services/fingerprint/device-registry-service'
import type { FpMachineCreateInput } from '@/lib/services/fingerprint/types'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    await ensureFingerprintTables()
    const devices = await listDevices()
    return Response.json({ data: devices })
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
      { message: 'Write action device fingerprint HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    await ensureFingerprintTables()
    const payload = (await request.json()) as {
      ip?: unknown
      port?: unknown
      model?: unknown
      deviceTimezone?: unknown
      authConfig?: unknown
      displayName?: unknown
    }

    const ip = String(payload.ip ?? '').trim()
    const model = String(payload.model ?? '').trim()
    const deviceTimezone = payload.deviceTimezone !== undefined
      ? String(payload.deviceTimezone).trim()
      : 'Asia/Jakarta'
    const port = payload.port !== undefined && payload.port !== null
      ? Number(payload.port)
      : undefined
    const authConfig = payload.authConfig ?? undefined
    const displayName = payload.displayName !== undefined
      ? String(payload.displayName).trim()
      : undefined

    if (!ip || !model) {
      return Response.json({ message: 'IP dan model mesin fingerprint wajib diisi.' }, { status: 400 })
    }

    const input: FpMachineCreateInput = {
      ip,
      model,
      deviceTimezone,
      port,
      authConfig,
      displayName,
    }

    const { id, masked } = await createDevice(input)

    await recordHrAudit({
      actionType: 'FP_DEVICE_CREATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `FP-MACHINE-${id}`,
      detail: `Device fingerprint ${masked.displayName || model} (IP ${ip}) dibuat via HR.`,
    })

    return Response.json({
      message: `Device fingerprint ${masked.displayName || model} berhasil disimpan.`,
      data: masked,
    })
  } catch (error) {
    const msg = error instanceof Error && error.message === 'VALIDATION_ERROR'
      ? 'Validasi input device fingerprint gagal.'
      : getReviewDbErrorDetail(error)
    return Response.json({ message: msg }, { status: 500 })
  }
}
