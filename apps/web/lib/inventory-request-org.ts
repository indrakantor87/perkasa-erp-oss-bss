export const INVENTORY_REQUEST_DIVISION = 'Teknisi'

export const INVENTORY_REQUEST_SUBDIVISIONS = [
  'Teknisi PSB',
  'Teknisi Jalur dan Expan',
  'Teknisi Jointer',
] as const

export type InventoryRequestSubdivision = (typeof INVENTORY_REQUEST_SUBDIVISIONS)[number]

export function isValidInventoryRequestSubdivision(
  value: string,
): value is InventoryRequestSubdivision {
  return INVENTORY_REQUEST_SUBDIVISIONS.includes(value as InventoryRequestSubdivision)
}
