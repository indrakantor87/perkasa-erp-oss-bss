import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  ensureFingerprintTables,
  listDeviceSyncRuns,
} from '@/lib/services/fingerprint/device-registry-service'

function parseIdParam(idSegment: string | undefined) {
  const raw = String(idSegment ?? '').trim()
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function GET(
  request: Request,
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

    const url = new URL(request.url)
    const limitRaw = url.searchParams.get('limit')
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50

    await ensureFingerprintTables()
    const runs = await listDeviceSyncRuns(id, Number.isFinite(limit) ? limit : 50)

    return Response.json({ data: runs })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
