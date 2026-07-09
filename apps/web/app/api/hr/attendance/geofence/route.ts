import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  getHrAttendanceGeofenceConfig,
  upsertHrAttendanceGeofenceConfig,
} from '@/lib/services/hr-attendance-geofence-service'

function normalizeDecimal(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Number(raw.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Konfigurasi geofence attendance hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const config = await getHrAttendanceGeofenceConfig()
    return Response.json({ config })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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
      { message: 'Konfigurasi geofence attendance hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      locationName?: unknown
      latitude?: unknown
      longitude?: unknown
      radiusMeters?: unknown
      isRequired?: unknown
      notes?: unknown
    }

    const locationName = String(payload.locationName ?? '').trim()
    const latitude = normalizeDecimal(payload.latitude)
    const longitude = normalizeDecimal(payload.longitude)
    const radiusMeters = normalizeDecimal(payload.radiusMeters)
    const isRequired = String(payload.isRequired ?? '').trim() === '1' || payload.isRequired === true
    const notes = String(payload.notes ?? '').trim()

    if (!locationName) {
      return Response.json({ message: 'Nama titik kerja attendance wajib diisi.' }, { status: 400 })
    }
    if (latitude === null || latitude < -90 || latitude > 90) {
      return Response.json({ message: 'Latitude geofence tidak valid.' }, { status: 400 })
    }
    if (longitude === null || longitude < -180 || longitude > 180) {
      return Response.json({ message: 'Longitude geofence tidak valid.' }, { status: 400 })
    }
    if (radiusMeters === null || radiusMeters <= 0) {
      return Response.json({ message: 'Radius geofence harus lebih besar dari 0 meter.' }, { status: 400 })
    }

    await upsertHrAttendanceGeofenceConfig({
      locationName,
      latitude,
      longitude,
      radiusMeters,
      isRequired,
      notes,
      updatedBy: `${session.displayName} (${session.username})`,
    })

    await recordHrAudit({
      actionType: 'ATTENDANCE_GEOFENCE_CONFIG',
      actor: `${session.displayName} (${session.username})`,
      targetRef: locationName,
      detail: `Konfigurasi geofence attendance diperbarui ke titik ${locationName} dengan radius ${radiusMeters.toFixed(2)} meter${isRequired ? ' (wajib saat check-in)' : ''}.`,
    })

    return Response.json({
      message: `Geofence attendance ${locationName} berhasil diperbarui.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
