import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { createPsbListItem } from '@/lib/services/psb-list-service'

function normalizeString(value: unknown) {
  return String(value ?? '').trim()
}

function parseCoordinatePair(value: string) {
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function normalizeGoogleMapsLink(rawValue: string) {
  const value = rawValue.trim()
  if (!value) return null

  const directPair = parseCoordinatePair(value)
  if (directPair) {
    return `https://maps.google.com/?q=${encodeURIComponent(`${directPair.lat},${directPair.lng}`)}`
  }

  const normalizedUrl = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`

  try {
    const url = new URL(normalizedUrl)
    const hostname = url.hostname.toLowerCase()
    const isGoogleMapsHost =
      hostname === 'maps.google.com' ||
      hostname === 'maps.app.goo.gl' ||
      hostname.endsWith('.google.com') ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.co.id') ||
      hostname === 'goo.gl'

    if (!isGoogleMapsHost) {
      return null
    }

    const pathname = url.pathname.toLowerCase()
    const hasMapSignal =
      hostname === 'maps.google.com' ||
      hostname === 'maps.app.goo.gl' ||
      pathname.startsWith('/maps') ||
      pathname.includes('/place') ||
      pathname.includes('/search') ||
      url.searchParams.has('q') ||
      url.searchParams.has('query') ||
      url.searchParams.has('ll') ||
      url.searchParams.has('destination')

    if (!hasMapSignal) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
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
    const googleMapsLink = normalizeGoogleMapsLink(normalizeString(payload.googleMapsLink))

    if (!customerName) {
      return Response.json({ message: 'Nama customer wajib diisi.' }, { status: 400 })
    }

    if (!addressText) {
      return Response.json({ message: 'Alamat pemasangan wajib diisi.' }, { status: 400 })
    }

    if (!packageLabel) {
      return Response.json({ message: 'Paket layanan wajib diisi.' }, { status: 400 })
    }

    if (normalizeString(payload.googleMapsLink) && !googleMapsLink) {
      return Response.json(
        { message: 'Link lokasi harus berupa URL Google Maps yang valid atau koordinat `latitude,longitude`.' },
        { status: 400 },
      )
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
      googleMapsLink,
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
