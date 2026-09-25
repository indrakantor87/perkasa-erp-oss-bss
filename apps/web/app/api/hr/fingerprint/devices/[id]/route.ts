import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  deleteDevice,
  ensureFingerprintTables,
  getDevice,
  updateDevice,
} from '@/lib/services/fingerprint/device-registry-service'
import type { FpMachineUpdateInput } from '@/lib/services/fingerprint/types'

function parseIdParam(idSegment: string | undefined) {
  const raw = String(idSegment ?? '').trim()
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function GET(
  _request: Request,
  segment: { params?: Promise<{ id?: string }> },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  try {
    const params = await segment?.params
    const id = parseIdParam(params?.id)
    if (!id) {
      return Response.json({ message: 'ID device fingerprint tidak valid.' }, { status: 400 })
    }

    await ensureFingerprintTables()
    const device = await getDevice(id)
    if (!device) {
      return Response.json({ message: 'Device fingerprint tidak ditemukan.' }, { status: 404 })
    }

    return Response.json({ data: device })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  segment: { params?: Promise<{ id?: string }> },
) {
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
      { message: 'Write action device fingerprint HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const params = await segment?.params
    const id = parseIdParam(params?.id)
    if (!id) {
      return Response.json({ message: 'ID device fingerprint tidak valid.' }, { status: 400 })
    }

    await ensureFingerprintTables()

    const existing = await getDevice(id)
    if (!existing) {
      return Response.json({ message: 'Device fingerprint tidak ditemukan.' }, { status: 404 })
    }

    const payload = (await request.json()) as {
      ip?: unknown
      port?: unknown
      model?: unknown
      deviceTimezone?: unknown
      authConfig?: unknown
      displayName?: unknown
    }

    const input: FpMachineUpdateInput = {}
    if (payload.ip !== undefined) input.ip = String(payload.ip).trim()
    if (payload.port !== undefined) {
      input.port = payload.port === null ? null : Number(payload.port)
    }
    if (payload.model !== undefined) input.model = String(payload.model).trim()
    if (payload.deviceTimezone !== undefined) {
      input.deviceTimezone = String(payload.deviceTimezone).trim()
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'authConfig')) {
      input.authConfig = payload.authConfig
    }
    if (payload.displayName !== undefined) {
      input.displayName = String(payload.displayName).trim()
    }

    const updated = await updateDevice(id, input)
    if (!updated) {
      return Response.json({ message: 'Device fingerprint tidak ditemukan.' }, { status: 404 })
    }

    await recordHrAudit({
      actionType: 'FP_DEVICE_UPDATE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `FP-MACHINE-${id}`,
      detail: `Device fingerprint ${updated.displayName || updated.model} (ID ${id}) diperbarui via HR.`,
    })

    return Response.json({
      message: `Device fingerprint ${updated.displayName || updated.model} berhasil diperbarui.`,
      data: updated,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  segment: { params?: Promise<{ id?: string }> },
) {
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
      { message: 'Write action device fingerprint HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const params = await segment?.params
    const id = parseIdParam(params?.id)
    if (!id) {
      return Response.json({ message: 'ID device fingerprint tidak valid.' }, { status: 400 })
    }

    await ensureFingerprintTables()

    const existing = await getDevice(id)
    if (!existing) {
      return Response.json({ message: 'Device fingerprint tidak ditemukan.' }, { status: 404 })
    }

    const deleted = await deleteDevice(id)
    if (!deleted) {
      return Response.json({ message: 'Device fingerprint gagal dihapus.' }, { status: 500 })
    }

    await recordHrAudit({
      actionType: 'FP_DEVICE_DELETE',
      actor: `${session.displayName} (${session.username})`,
      targetRef: `FP-MACHINE-${id}`,
      detail: `Device fingerprint ${existing.displayName || existing.model} (IP ${existing.ip}) dihapus via HR.`,
    })

    return Response.json({
      message: `Device fingerprint ${existing.displayName || existing.model} berhasil dihapus.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
