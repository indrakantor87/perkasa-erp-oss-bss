import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  getDailyActivityUserProfileErrorDetail,
  getDailyActivityUserProfiles,
  upsertDailyActivityUserProfile,
} from '@/lib/services/daily-activity-user-profile-service'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'user_settings', 'manage')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Mode review database belum aktif.' }, { status: 503 })
  }

  const profiles = await getDailyActivityUserProfiles()
  return Response.json({ profiles })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'user_settings', 'manage')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Kelola profil daily activity hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      username?: unknown
      divisionName?: unknown
      subdivisionName?: unknown
      planningLevel?: unknown
    }

    await upsertDailyActivityUserProfile({
      username: String(payload.username ?? ''),
      divisionName: String(payload.divisionName ?? ''),
      subdivisionName: String(payload.subdivisionName ?? ''),
      planningLevel: String(payload.planningLevel ?? ''),
    })

    return Response.json({ message: 'Profil daily activity user berhasil disimpan.' })
  } catch (error) {
    const message = getDailyActivityUserProfileErrorDetail(error)
    const isValidation = error instanceof Error
    return Response.json({ message }, { status: isValidation ? 400 : 500 })
  }
}
