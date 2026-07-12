import { getSupportLanePath } from '@/lib/support-lanes'
import type { SupportLaneActionKey, SupportLaneKey } from '@/lib/types'

export function getSupportActionAnchorId(actionKey: SupportLaneActionKey) {
  return `support-action-${actionKey}`
}

export function buildSupportActionHref(
  actionKey: SupportLaneActionKey,
  params?: Record<string, string | null | undefined>,
) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {})) {
    const normalizedValue = value?.trim()
    if (normalizedValue) {
      searchParams.set(key, normalizedValue)
    }
  }

  const query = searchParams.toString()
  const hash = `#${getSupportActionAnchorId(actionKey)}`

  return query ? `?${query}${hash}` : hash
}

export function buildSupportLaneHref(
  lane: SupportLaneKey,
  params?: Record<string, string | null | undefined>,
) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {})) {
    const normalizedValue = value?.trim()
    if (normalizedValue) {
      searchParams.set(key, normalizedValue)
    }
  }

  const query = searchParams.toString()
  const pathname = getSupportLanePath(lane)

  return query ? `${pathname}?${query}` : pathname
}

export function buildSupportLaneActionHref(
  lane: SupportLaneKey,
  actionKey: SupportLaneActionKey,
  params?: Record<string, string | null | undefined>,
) {
  return `${getSupportLanePath(lane)}${buildSupportActionHref(actionKey, params)}`
}
