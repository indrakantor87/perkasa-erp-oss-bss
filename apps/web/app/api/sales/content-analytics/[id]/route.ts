import { getSession } from '@/lib/auth'
import {
  deleteContentAnalytics,
  getDigitalCreatorErrorMessage,
  updateContentAnalytics,
} from '@/lib/services/digital-creator-service'

function resolveStatusCode(message: string) {
  if (message.includes('diizinkan') || message.includes('Forbidden')) return 403
  if (message.includes('wajib') || message.includes('tidak valid') || message.includes('tidak ditemukan')) return 400
  return 500
}

function parseId(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const resolved = parseId((await params).id)
  if (!resolved) return Response.json({ message: 'ID analytics tidak valid.' }, { status: 400 })

  try {
    const payload = (await request.json()) as Record<string, unknown>
    const analytics = await updateContentAnalytics({ id: resolved, session, payload })
    return Response.json({
      message: analytics ? 'Data analytics berhasil diperbarui.' : 'Data analytics berhasil diperbarui.',
      analytics,
    })
  } catch (error) {
    const message = getDigitalCreatorErrorMessage(error)
    return Response.json({ message }, { status: resolveStatusCode(message) })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const resolved = parseId((await params).id)
  if (!resolved) return Response.json({ message: 'ID analytics tidak valid.' }, { status: 400 })

  try {
    await deleteContentAnalytics({ id: resolved, session })
    return Response.json({ message: 'Data analytics berhasil dihapus.' })
  } catch (error) {
    const message = getDigitalCreatorErrorMessage(error)
    return Response.json({ message }, { status: resolveStatusCode(message) })
  }
}
