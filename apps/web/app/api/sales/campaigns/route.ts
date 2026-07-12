import { getSession } from '@/lib/auth'
import {
  createCampaign,
  getCampaigns,
  getDigitalCreatorErrorMessage,
} from '@/lib/services/digital-creator-service'

function resolveStatusCode(message: string) {
  if (message.includes('diizinkan') || message.includes('Forbidden')) return 403
  if (message.includes('wajib') || message.includes('tidak valid') || message.includes('tidak ditemukan')) return 400
  return 500
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const campaigns = await getCampaigns({
      session,
      status: searchParams.get('status'),
    })
    return Response.json(campaigns)
  } catch (error) {
    return Response.json({ message: getDigitalCreatorErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const payload = (await request.json()) as Record<string, unknown>
    const campaign = await createCampaign({ session, payload })
    return Response.json({
      message: campaign ? `Campaign ${campaign.name} berhasil disimpan.` : 'Campaign berhasil disimpan.',
      campaign,
    })
  } catch (error) {
    const message = getDigitalCreatorErrorMessage(error)
    return Response.json({ message }, { status: resolveStatusCode(message) })
  }
}
