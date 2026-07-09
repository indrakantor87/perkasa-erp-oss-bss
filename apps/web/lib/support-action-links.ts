import type { SupportLaneActionKey } from '@/lib/types'

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
