import { getSession } from '@/lib/auth'
import {
  deleteCampaign,
  getDigitalCreatorErrorMessage,
  updateCampaign,
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
  if (!resolved) return Response.json({ message: 'ID campaign tidak valid.' }, { status: 400 })

  try {
    const payload = (await request.json()) as Record<string, unknown>
    const campaign = await updateCampaign({ id: resolved, session, payload })
    return Response.json({
      message: campaign ? `Campaign ${campaign.name} berhasil diperbarui.` : 'Campaign berhasil diperbarui.',
      campaign,
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
  if (!resolved) return Response.json({ message: 'ID campaign tidak valid.' }, { status: 400 })

  try {
    await deleteCampaign({ id: resolved, session })
    return Response.json({ message: 'Campaign berhasil dihapus.' })
  } catch (error) {
    const message = getDigitalCreatorErrorMessage(error)
    return Response.json({ message }, { status: resolveStatusCode(message) })
  }
}
