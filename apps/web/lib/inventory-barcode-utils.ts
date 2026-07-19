export function buildInventoryItemRelativePath(itemCode: string) {
  const normalized = String(itemCode ?? '').trim()
  if (!normalized) return '/inventory'
  return `/inventory?itemCode=${encodeURIComponent(normalized)}`
}

export function buildInventoryBarcodeDetailPath(itemCode: string) {
  const normalized = String(itemCode ?? '').trim()
  if (!normalized) return '/inventory/items'
  return `/inventory/barcodes/${encodeURIComponent(normalized)}`
}

function isInventoryItemCodeCandidate(value: string) {
  return /^INV(?:-[A-Z0-9._/]+){2,}$/i.test(String(value ?? '').trim())
}

function normalizeInventoryItemCodeCandidate(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  if (normalized.includes(' ')) return ''
  if (!/^[A-Z0-9][A-Z0-9._/-]{2,79}$/i.test(normalized)) {
    return ''
  }

  // Reject obvious route-like values without an actual item code token.
  if (/^\/?inventory\/?$/i.test(normalized)) {
    return ''
  }

  return isInventoryItemCodeCandidate(normalized) ? normalized.toUpperCase() : ''
}

export function extractInventoryItemCodeFromScan(rawValue: string) {
  const raw = String(rawValue ?? '').trim()
  if (!raw) return ''

  const embeddedMatch = raw.match(/(?:^|[^A-Z0-9])(INV(?:-[A-Z0-9._/]+){2,})(?=$|[^A-Z0-9._/])/i)
  const embeddedCode = normalizeInventoryItemCodeCandidate(embeddedMatch?.[1] ?? '')
  if (embeddedCode) return embeddedCode

  const directCode = normalizeInventoryItemCodeCandidate(raw)
  if (directCode) return directCode

  const suggestionPrefix = raw.split('|')[0]?.trim() ?? ''
  const suggestionCode = normalizeInventoryItemCodeCandidate(suggestionPrefix)
  if (suggestionCode) return suggestionCode

  try {
    const parsed = new URL(raw, 'https://inventory.local')
    const queryCode = parsed.searchParams.get('itemCode')?.trim()
    const normalizedQueryCode = normalizeInventoryItemCodeCandidate(queryCode ?? '')
    if (normalizedQueryCode) return normalizedQueryCode

    const pathSegments = parsed.pathname.split('/').filter(Boolean)
    const inventoryItemIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === 'items')
    const pathCode = inventoryItemIndex >= 0 ? pathSegments[inventoryItemIndex + 1] : ''
    const normalizedPathCode = normalizeInventoryItemCodeCandidate(decodeURIComponent(pathCode))
    if (normalizedPathCode) return normalizedPathCode

    const inventoryBarcodeIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === 'barcodes')
    const barcodePathCode = inventoryBarcodeIndex >= 0 ? pathSegments[inventoryBarcodeIndex + 1] : ''
    const normalizedBarcodePathCode = normalizeInventoryItemCodeCandidate(decodeURIComponent(barcodePathCode))
    if (normalizedBarcodePathCode) return normalizedBarcodePathCode
  } catch {
    return ''
  }

  return ''
}

export function findInventorySuggestionByCode(itemSuggestions: string[], itemCode: string) {
  const normalizedCode = String(itemCode ?? '').trim().toUpperCase()
  if (!normalizedCode) return ''

  return (
    itemSuggestions.find((suggestion) => suggestion.split('|')[0]?.trim().toUpperCase() === normalizedCode) ?? ''
  )
}
