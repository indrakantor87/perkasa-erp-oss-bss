import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import {
  ensureFingerprintTables,
  testDeviceConnection,
} from '@/lib/services/fingerprint/device-registry-service'

function parseIdParam(idSegment: string | undefined) {
  const raw = String(idSegment ?? '').trim()
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idLocal } = await params
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
      { message: 'Test koneksi device fingerprint HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const id = parseIdParam(idLocal)
    if (!id) {
      return Response.json({ message: 'ID device fingerprint tidak valid.' }, { status: 400 })
    }

    await ensureFingerprintTables()
    const result = await testDeviceConnection(id)

    if (result.errorMessage === 'MACHINE_NOT_FOUND') {
      return Response.json({ message: 'Device fingerprint tidak ditemukan.' }, { status: 404 })
    }

    return Response.json({
      ok: result.ok,
      info: result.info,
      errorMessage: result.errorMessage,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
