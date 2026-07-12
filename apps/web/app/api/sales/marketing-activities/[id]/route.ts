import { getSession } from '@/lib/auth'
import {
  deleteMarketingActivity,
  getMarketingActivityErrorMessage,
  updateMarketingActivity,
} from '@/lib/services/marketing-activity-service'

function resolveStatus(message: string) {
  if (
    message.includes('diizinkan') ||
    message.includes('hanya bisa')
  ) {
    return 403
  }
  if (
    message.includes('wajib') ||
    message.includes('valid') ||
    message.includes('tidak ditemukan')
  ) {
    return 400
  }
  return 500
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const activityId = Number(id)
    if (!Number.isInteger(activityId) || activityId <= 0) {
      return Response.json({ message: 'ID aktivitas marketing tidak valid.' }, { status: 400 })
    }

    const payload = await request.json()
    const activity = await updateMarketingActivity({
      id: activityId,
      session,
      payload,
    })
    return Response.json({
      message: activity ? `Aktivitas marketing ${activity.marketingName} berhasil diperbarui.` : 'Aktivitas marketing berhasil diperbarui.',
      activity,
    })
  } catch (error) {
    const message = getMarketingActivityErrorMessage(error)
    return Response.json({ message }, { status: resolveStatus(message) })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const activityId = Number(id)
    if (!Number.isInteger(activityId) || activityId <= 0) {
      return Response.json({ message: 'ID aktivitas marketing tidak valid.' }, { status: 400 })
    }

    await deleteMarketingActivity({ id: activityId, session })
    return Response.json({ message: 'Aktivitas marketing berhasil dihapus.' })
  } catch (error) {
    const message = getMarketingActivityErrorMessage(error)
    return Response.json({ message }, { status: resolveStatus(message) })
  }
}
