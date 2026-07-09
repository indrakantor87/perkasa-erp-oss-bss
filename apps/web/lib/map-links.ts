function normalizeCoordinate(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  const raw = String(value ?? '').trim()
  if (!raw) {
    return ''
  }

  const normalized = raw.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? String(parsed) : ''
}

export function buildGoogleMapsHref(params: {
  latitude?: string | number | null
  longitude?: string | number | null
  query?: string | null
}) {
  const latitude = normalizeCoordinate(params.latitude)
  const longitude = normalizeCoordinate(params.longitude)

  if (latitude && longitude) {
    return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`
  }

  const query = String(params.query ?? '').trim()
  if (query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  }

  return ''
}
