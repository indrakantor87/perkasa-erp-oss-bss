import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  getHrAttendanceFaceConfig,
  upsertHrAttendanceFaceConfig,
} from '@/lib/services/hr-attendance-face-service'

const allowedVerificationModes = new Set(['MANUAL_REVIEW', 'CAMERA_CAPTURE'])

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
      { message: 'Konfigurasi face attendance hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const config = await getHrAttendanceFaceConfig()
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
      { message: 'Konfigurasi face attendance hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      isRequired?: unknown
      verificationMode?: unknown
      autoVerifyHighConfidence?: unknown
      autoVerifyMinScore?: unknown
      notes?: unknown
    }

    const isRequired = String(payload.isRequired ?? '').trim() === '1' || payload.isRequired === true
    const verificationMode = String(payload.verificationMode ?? '').trim().toUpperCase()
    const autoVerifyHighConfidence =
      String(payload.autoVerifyHighConfidence ?? '').trim() === '1' || payload.autoVerifyHighConfidence === true
    const autoVerifyMinScore = Number.parseInt(String(payload.autoVerifyMinScore ?? '').trim(), 10)
    const notes = String(payload.notes ?? '').trim()

    if (!allowedVerificationModes.has(verificationMode)) {
      return Response.json({ message: 'Mode verifikasi wajah tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(autoVerifyMinScore) || autoVerifyMinScore < 0 || autoVerifyMinScore > 100) {
      return Response.json({ message: 'Minimum score auto-verify harus berada di antara 0 sampai 100.' }, { status: 400 })
    }

    await upsertHrAttendanceFaceConfig({
      isRequired,
      verificationMode,
      autoVerifyHighConfidence,
      autoVerifyMinScore,
      notes,
      updatedBy: `${session.displayName} (${session.username})`,
    })

    await recordHrAudit({
      actionType: 'ATTENDANCE_FACE_CONFIG',
      actor: `${session.displayName} (${session.username})`,
      targetRef: verificationMode,
      detail: `Konfigurasi face attendance diperbarui ke mode ${verificationMode}${isRequired ? ' dan diwajibkan saat check-in' : ''}${autoVerifyHighConfidence ? ` dengan auto-verify aktif di skor minimum ${autoVerifyMinScore}` : ' dengan auto-verify dimatikan'}.`,
    })

    return Response.json({
      message: `Konfigurasi face attendance ${verificationMode} berhasil diperbarui.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
