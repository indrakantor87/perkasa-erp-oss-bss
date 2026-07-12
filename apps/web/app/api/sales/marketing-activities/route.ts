import { getSession } from '@/lib/auth'
import {
  createMarketingActivity,
  getMarketingActivities,
  getMarketingActivityErrorMessage,
} from '@/lib/services/marketing-activity-service'

function parsePositiveNumber(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const activities = await getMarketingActivities({
      session,
      month: parsePositiveNumber(searchParams.get('month')),
      year: parsePositiveNumber(searchParams.get('year')),
      marketing: searchParams.get('marketing'),
    })
    return Response.json(activities)
  } catch (error) {
    return Response.json({ message: getMarketingActivityErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const activity = await createMarketingActivity({ session, payload })
    return Response.json({
      message: activity ? `Aktivitas marketing ${activity.marketingName} berhasil disimpan.` : 'Aktivitas marketing berhasil disimpan.',
      activity,
    })
  } catch (error) {
    const message = getMarketingActivityErrorMessage(error)
    const status =
      message.includes('diizinkan') || message.includes('hanya bisa') ? 403 : message.includes('wajib') || message.includes('valid') || message.includes('tidak ditemukan') ? 400 : 500
    return Response.json({ message }, { status })
  }
}
