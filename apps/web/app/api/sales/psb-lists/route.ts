import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { createPsbListItem } from '@/lib/services/psb-list-service'

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (!canPerformAction(session.role, 'sales', 'create')) {
    return Response.json({ message: 'Role aktif belum memiliki izin input PSB.' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Input PSB hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>
    const customerName = normalizeString(payload.customerName)
    const addressText = normalizeString(payload.addressText)
    const packageLabel = normalizeString(payload.packageLabel)

    if (!customerName) {
      return Response.json({ message: 'Nama customer wajib diisi.' }, { status: 400 })
    }

    if (!addressText) {
      return Response.json({ message: 'Alamat pemasangan wajib diisi.' }, { status: 400 })
    }

    if (!packageLabel) {
      return Response.json({ message: 'Paket layanan wajib diisi.' }, { status: 400 })
    }

    const result = await createPsbListItem({
      customerName,
      customerPhone: normalizeString(payload.customerPhone) || null,
      addressText,
      odpCode: normalizeString(payload.odpCode) || null,
      packageLabel,
      salesOwnerName: normalizeString(payload.salesOwnerName) || `${session.displayName} (${session.username})`,
      requestedInstallDate: normalizeString(payload.requestedInstallDate) || null,
      areaLabel: normalizeString(payload.areaLabel) || null,
      googleMapsLink: normalizeString(payload.googleMapsLink) || null,
      escortNotes: normalizeString(payload.escortNotes) || null,
      activityNotes: normalizeString(payload.activityNotes) || null,
      actorName: `${session.displayName} (${session.username})`,
      actorRole: session.role,
    })

    return Response.json({
      id: result.id,
      psbListCode: result.psbListCode,
      message: `Input PSB ${result.psbListCode} untuk ${result.customerName} berhasil masuk ke List PSB.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
