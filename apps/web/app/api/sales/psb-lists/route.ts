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

function buildActivityNotes(params: {
  description: string
  birthDate: string
  housePhotoFileName: string
}) {
  const pieces: string[] = []
  if (params.birthDate) {
    pieces.push(`Tgl Lahir: ${params.birthDate}`)
  }
  if (params.housePhotoFileName) {
    pieces.push(`Foto Rumah: ${params.housePhotoFileName}`)
  }
  if (params.description) {
    pieces.push(params.description)
  }
  return pieces.join('\n') || null
}

function buildAddressText(params: {
  description: string
  googleMapsLink: string | null
  customerName: string
}) {
  const fromDescription = params.description.trim()
  if (fromDescription) {
    return fromDescription
  }
  if (params.googleMapsLink) {
    return `Maps: ${params.googleMapsLink}`
  }
  return `Alamat PSB ${params.customerName}`
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
    const packageLabel = normalizeString(payload.packageLabel)
    const description = normalizeString(payload.activityNotes)
    const birthDate = normalizeString(payload.birthDate)
    const housePhotoFileName = normalizeString(payload.housePhotoFileName)
    const mapsRaw = normalizeString(payload.googleMapsLink)
    const googleMapsLink = normalizeGoogleMapsLink(mapsRaw)

    if (!customerName) {
      return Response.json({ message: 'Nama Pelanggan wajib diisi.' }, { status: 400 })
    }

    if (!packageLabel) {
      return Response.json({ message: 'Paket layanan wajib diisi.' }, { status: 400 })
    }

    if (mapsRaw && !googleMapsLink) {
      return Response.json(
        { message: 'Link lokasi harus berupa URL Google Maps yang valid atau koordinat `latitude,longitude`.' },
        { status: 400 },
      )
    }

    const activityNotes = buildActivityNotes({ description, birthDate, housePhotoFileName })
    const addressText = buildAddressText({ description, googleMapsLink, customerName })

    const result = await createPsbListItem({
      customerName,
      customerPhone: normalizeString(payload.customerPhone) || null,
      addressText,
      odpCode: null,
      packageLabel,
      salesOwnerName: normalizeString(payload.salesOwnerName) || `${session.displayName} (${session.username})`,
      requestedInstallDate: null,
      areaLabel: null,
      googleMapsLink,
      escortNotes: null,
      activityNotes,
      actorName: `${session.displayName} (${session.username})`,
      actorRole: session.role,
    })

    return Response.json({
      id: result.id,
      psbListCode: result.psbListCode,
      message: `Input PSB ${result.psbListCode} untuk ${result.customerName} berhasil masuk ke Data PSB.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
