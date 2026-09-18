import { canAccessPath } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import {
  formatDurationMinutes,
  formatKilometers,
  getRoadRoute,
  type RoadRoute,
  type RoutingProfile,
} from '@/lib/services/routing-service'

type InboundCoordinate =
  | { latitude: number; longitude: number }
  | { lat: number; lon: number }
  | { lat: number; lng: number }

type InboundPayload = {
  origin: InboundCoordinate
  destination: InboundCoordinate
  profile?: RoutingProfile
}

function normalizeCoordinate(value: InboundCoordinate | undefined | null): {
  latitude: number
  longitude: number
} | null {
  if (!value || typeof value !== 'object') return null
  const anyValue = value as InboundCoordinate & Record<string, unknown>
  const latitudeRaw =
    'latitude' in anyValue
      ? anyValue.latitude
      : 'lat' in anyValue
        ? anyValue.lat
        : undefined
  const longitudeRaw =
    'longitude' in anyValue
      ? anyValue.longitude
      : 'lon' in anyValue
        ? anyValue.lon
        : 'lng' in anyValue
          ? anyValue.lng
          : undefined
  const latitude = Number(latitudeRaw)
  const longitude = Number(longitudeRaw)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}

function sanitizeRoadRouteResponse(raw: RoadRoute): RoadRoute & {
  distanceKmFormatted: string
  durationFormatted: string
  straightLineKmFormatted: string
} {
  const sanitized: RoadRoute = {
    status: raw.status,
    provider: raw.provider,
    distanceMeters: raw.distanceMeters,
    durationSeconds: raw.durationSeconds,
    geometry: raw.geometry ?? null,
    straightLineDistanceMeters: raw.straightLineDistanceMeters,
  }
  if (raw.errorMessage) {
    sanitized.errorMessage = raw.errorMessage
  }
  return {
    ...sanitized,
    distanceKmFormatted: formatKilometers(raw.distanceMeters),
    durationFormatted: formatDurationMinutes(raw.durationSeconds),
    straightLineKmFormatted: formatKilometers(raw.straightLineDistanceMeters),
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const canAccessSalesOdp = canAccessPath(session.role, '/sales/port-odp')
  const canAccessInventory = canAccessPath(session.role, '/inventory/network')
  if (!canAccessSalesOdp && !canAccessInventory) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  try {
    const rawPayload = (await request.json().catch(() => null)) as InboundPayload | null
    if (!rawPayload || typeof rawPayload !== 'object') {
      return Response.json({ message: 'Invalid payload' }, { status: 400 })
    }
    const origin = normalizeCoordinate(rawPayload.origin)
    const destination = normalizeCoordinate(rawPayload.destination)
    if (!origin || !destination) {
      return Response.json(
        { message: 'Koordinat origin atau destination tidak valid.' },
        { status: 400 },
      )
    }
    const profile: RoutingProfile =
      rawPayload.profile === 'walking' || rawPayload.profile === 'cycling'
        ? rawPayload.profile
        : 'driving'
    const result = await getRoadRoute(origin, destination, { profile })
    return Response.json(sanitizeRoadRouteResponse(result))
  } catch (error) {
    return Response.json(
      {
        message: 'Internal routing error',
        cause: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
