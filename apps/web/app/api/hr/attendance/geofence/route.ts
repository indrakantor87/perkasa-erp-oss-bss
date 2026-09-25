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

  return Response.json(
    {
      message:
        'Fitur ini dinonaktifkan. HR Attendance Batch-01 hanya menggunakan data absensi dari MESIN FINGERPRINT. Face recognition, selfie attendance, dan geofence/GPS bukan metode absensi yang didukung.',
    },
    { status: 403 },
  )

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

  return Response.json(
    {
      message:
        'Fitur ini dinonaktifkan. HR Attendance Batch-01 hanya menggunakan data absensi dari MESIN FINGERPRINT. Face recognition, selfie attendance, dan geofence/GPS bukan metode absensi yang didukung.',
    },
    { status: 403 },
  )

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
    if ((latitude as number) === null || (latitude as number) < -90 || (latitude as number) > 90) {
      return Response.json({ message: 'Latitude geofence tidak valid.' }, { status: 400 })
    }
    if ((longitude as number) === null || (longitude as number) < -180 || (longitude as number) > 180) {
      return Response.json({ message: 'Longitude geofence tidak valid.' }, { status: 400 })
    }
    if ((radiusMeters as number) === null || (radiusMeters as number) <= 0) {
      return Response.json({ message: 'Radius geofence harus lebih besar dari 0 meter.' }, { status: 400 })
    }

    await upsertHrAttendanceGeofenceConfig({
      locationName,
      latitude: (Number(latitude) || 0),
      longitude: (Number(longitude) || 0),
      radiusMeters: (Number(radiusMeters) || 0),
      isRequired,
      notes,
      updatedBy: `${(session as any).displayName} (${(session as any).username})`,
    })

    await recordHrAudit({
      actionType: 'ATTENDANCE_GEOFENCE_CONFIG',
      actor: `${(session as any).displayName} (${(session as any).username})`,
      targetRef: locationName,
      detail: `Konfigurasi geofence attendance diperbarui ke titik ${locationName} dengan radius ${(radiusMeters as number).toFixed(2)} meter${isRequired ? ' (wajib saat check-in)' : ''}.`,
    })

    return Response.json({
      message: `Geofence attendance ${locationName} berhasil diperbarui.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
