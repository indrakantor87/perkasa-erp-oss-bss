import { calculateDistanceMeters } from './hr-attendance-geofence-service'

export type RouteCoordinate = {
  latitude: number
  longitude: number
}

export type RoadRouteStatus = 'ROUTED' | 'FALLBACK_STRAIGHT_LINE' | 'NO_ROUTE' | 'ERROR'

export type RoadRouteProviderId =
  | 'osrm'
  | 'graphhopper'
  | 'mapbox'
  | 'google'
  | 'self_hosted_osrm'
  | 'none_fallback'

export type RoadRoute = {
  status: RoadRouteStatus
  provider: RoadRouteProviderId
  distanceMeters: number
  durationSeconds: number | null
  geometry: unknown | null
  straightLineDistanceMeters: number
  errorMessage?: string
  providerDebug?: { raw?: unknown; endpoint?: string }
}

export type RoutingProfile = 'driving' | 'walking' | 'cycling'

type RoutingConfig = {
  provider: Exclude<RoadRouteProviderId, 'none_fallback'> | null
  providerUrl: string | null
  apiKey: string | null
  defaultProfile: RoutingProfile
  timeoutMs: number
}

function readRoutingConfig(): RoutingConfig {
  const providerRaw = String(process.env.ROUTING_PROVIDER ?? '').trim().toLowerCase()
  const providerUrlRaw = String(process.env.ROUTING_PROVIDER_URL ?? '').trim()
  const apiKeyRaw = String(process.env.ROUTING_API_KEY ?? '').trim()
  const defaultProfileRaw = String(process.env.ROUTING_DEFAULT_PROFILE ?? 'driving').trim().toLowerCase()
  const timeoutRaw = Number.parseInt(String(process.env.ROUTING_TIMEOUT_MS ?? '8000'), 10)
  const provider: RoutingConfig['provider'] =
    providerRaw === 'osrm'
      ? 'osrm'
      : providerRaw === 'self_hosted_osrm'
        ? 'self_hosted_osrm'
        : providerRaw === 'graphhopper'
          ? 'graphhopper'
          : providerRaw === 'mapbox'
            ? 'mapbox'
            : providerRaw === 'google'
              ? 'google'
              : null
  const defaultProfile: RoutingProfile =
    defaultProfileRaw === 'walking' || defaultProfileRaw === 'cycling' ? defaultProfileRaw : 'driving'
  return {
    provider,
    providerUrl: providerUrlRaw ? providerUrlRaw.replace(/\/+$/, '') : null,
    apiKey: apiKeyRaw || null,
    defaultProfile,
    timeoutMs: Number.isFinite(timeoutRaw) && timeoutRaw > 500 ? timeoutRaw : 8000,
  }
}

function isValidCoordinate(point: RouteCoordinate): boolean {
  if (!point) return false
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return false
  if (Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) return false
  return true
}

function buildFallbackRoute(origin: RouteCoordinate, destination: RouteCoordinate, cause?: string): RoadRoute {
  const straight = Number.isFinite(origin.latitude) && Number.isFinite(destination.latitude)
    ? calculateDistanceMeters(origin.latitude, origin.longitude, destination.latitude, destination.longitude)
    : 0
  return {
    status: 'FALLBACK_STRAIGHT_LINE',
    provider: 'none_fallback',
    distanceMeters: Math.max(0, Math.round(straight)),
    durationSeconds: null,
    geometry: null,
    straightLineDistanceMeters: Math.max(0, Math.round(straight)),
    errorMessage: cause,
  }
}

async function fetchWithTimeout(input: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(input, { ...(init ?? {}), signal: controller.signal })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }
  return fetch(input, init)
}

async function getOsrmRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  profile: RoutingProfile,
  baseUrl: string,
  timeoutMs: number,
): Promise<RoadRoute> {
  const straight = calculateDistanceMeters(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  )
  const endpoint = `${baseUrl}/route/v1/${encodeURIComponent(profile)}/${encodeURIComponent(String(origin.longitude))},${encodeURIComponent(String(origin.latitude))};${encodeURIComponent(String(destination.longitude))},${encodeURIComponent(String(destination.latitude))}?overview=full&geometries=geojson&steps=false`
  try {
    const response = await fetchWithTimeout(endpoint, undefined, timeoutMs)
    if (!response.ok) {
      return {
        status: 'NO_ROUTE',
        provider: 'osrm',
        distanceMeters: Math.max(0, Math.round(straight)),
        durationSeconds: null,
        geometry: null,
        straightLineDistanceMeters: Math.max(0, Math.round(straight)),
        errorMessage: `OSRM HTTP ${response.status}`,
      }
    }
    const payload = (await response.json().catch(() => null)) as {
      code?: string
      routes?: Array<{
        distance?: number
        duration?: number
        geometry?: unknown
      }>
    } | null
    if (!payload || payload.code !== 'Ok' || !Array.isArray(payload.routes) || payload.routes.length <= 0) {
      return {
        status: 'NO_ROUTE',
        provider: 'osrm',
        distanceMeters: Math.max(0, Math.round(straight)),
        durationSeconds: null,
        geometry: null,
        straightLineDistanceMeters: Math.max(0, Math.round(straight)),
        errorMessage: 'OSRM response invalid or empty routes',
      }
    }
    const first = payload.routes[0]
    const distanceMeters = Number.isFinite(first.distance) ? Math.max(0, Math.round(Number(first.distance))) : 0
    const durationSeconds = Number.isFinite(first.duration) ? Math.max(0, Math.round(Number(first.duration))) : null
    return {
      status: distanceMeters > 0 ? 'ROUTED' : 'NO_ROUTE',
      provider: 'osrm',
      distanceMeters,
      durationSeconds,
      geometry: first.geometry ?? null,
      straightLineDistanceMeters: Math.max(0, Math.round(straight)),
    }
  } catch (error) {
    return {
      status: 'ERROR',
      provider: 'osrm',
      distanceMeters: Math.max(0, Math.round(straight)),
      durationSeconds: null,
      geometry: null,
      straightLineDistanceMeters: Math.max(0, Math.round(straight)),
      errorMessage: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function getRoadRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  options?: { profile?: RoutingProfile },
): Promise<RoadRoute> {
  if (!isValidCoordinate(origin) || !isValidCoordinate(destination)) {
    return buildFallbackRoute(origin, destination, 'Invalid coordinate range')
  }
  const config = readRoutingConfig()
  const profile: RoutingProfile = options?.profile ?? config.defaultProfile
  const straight = calculateDistanceMeters(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  )
  if (!config.provider || !config.providerUrl) {
    return {
      status: 'FALLBACK_STRAIGHT_LINE',
      provider: 'none_fallback',
      distanceMeters: Math.max(0, Math.round(straight)),
      durationSeconds: null,
      geometry: null,
      straightLineDistanceMeters: Math.max(0, Math.round(straight)),
    }
  }
  if (config.provider === 'osrm' || config.provider === 'self_hosted_osrm') {
    return getOsrmRoute(origin, destination, profile, config.providerUrl, config.timeoutMs)
  }
  return {
    status: 'FALLBACK_STRAIGHT_LINE',
    provider: 'none_fallback',
    distanceMeters: Math.max(0, Math.round(straight)),
    durationSeconds: null,
    geometry: null,
    straightLineDistanceMeters: Math.max(0, Math.round(straight)),
    errorMessage: `Provider ${config.provider} evaluation pending — using fallback`,
  }
}

export function formatDurationMinutes(seconds: number | null | undefined): string {
  if (!Number.isFinite(seconds) || (seconds ?? 0) <= 0) return 'n/a'
  const totalMinutes = Math.ceil(Number(seconds) / 60)
  if (totalMinutes < 60) return `${totalMinutes} menit`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`
}

export function formatKilometers(meters: number | null | undefined): string {
  if (!Number.isFinite(meters) || (meters ?? 0) <= 0) return '0.00 km'
  const km = Number(meters) / 1000
  return `${km.toFixed(2)} km`
}
