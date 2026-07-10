export const DAILY_ACTIVITY_PLANNING_LEVELS = ['MANAGER', 'SPV', 'LEADER'] as const

export type DailyActivityPlanningLevel = (typeof DAILY_ACTIVITY_PLANNING_LEVELS)[number]

export const dailyActivityPlanningLevelLabels: Record<DailyActivityPlanningLevel, string> = {
  MANAGER: 'Manager',
  SPV: 'SPV',
  LEADER: 'Leader',
}

const DAILY_ACTIVITY_DIVISION_ALIASES = {
  'Pemasaran & Pelayanan': 'Pemasaran dan Pelayanan',
  'Pemasaran dan Pelayanan': 'Pemasaran dan Pelayanan',
  Teknisi: 'Teknis dan Expan',
  'Teknis dan Expan': 'Teknis dan Expan',
  'Finance & HR': 'Finance dan HR',
  'Finance dan HR': 'Finance dan HR',
  'General Affair': 'General Affair',
  Operasional: 'Operasional',
} as const

const DAILY_ACTIVITY_SUBDIVISION_ALIASES = {
  Penjualan: 'Penjualan',
  CS: 'CS',
  'Admin CS': 'Admin CS',
  NOC: 'NOC',
  Troubleshoots: 'Troubleshoots',
  'Digital Creator': 'Creator Digital',
  'Creator Digital': 'Creator Digital',
  Dismantle: 'Dismantle',
  'Dismantle Operasional': 'Dismantle',
  'Teknisi PSB': 'Teknisi PSB',
  'Teknisi Jalur dan Expan': 'Teknisi Jalur & Expan',
  'Teknisi Jalur & Expan': 'Teknisi Jalur & Expan',
  'Teknisi Jointer': 'Teknisi Jointer',
  Inventory: 'Inventory',
  Legal: 'Legal',
  Kantor: 'Kantor',
  Toko: 'Toko',
} as const

export const DAILY_ACTIVITY_DIVISION_STRUCTURE = [
  {
    division: 'Pemasaran dan Pelayanan',
    subdivisions: ['Penjualan', 'CS', 'Admin CS', 'NOC', 'Troubleshoots', 'Dismantle', 'Creator Digital'],
  },
  {
    division: 'Teknis dan Expan',
    subdivisions: ['Teknisi PSB', 'Teknisi Jalur & Expan', 'Teknisi Jointer'],
  },
  {
    division: 'General Affair',
    subdivisions: ['Inventory', 'Legal'],
  },
  {
    division: 'Finance dan HR',
    subdivisions: [],
  },
  {
    division: 'Operasional',
    subdivisions: ['Kantor', 'Toko'],
  },
] as const

export type DailyActivityDivisionName = (typeof DAILY_ACTIVITY_DIVISION_STRUCTURE)[number]['division']

function buildAliasIndex<T extends string>(aliases: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(aliases).map(([key, value]) => [key.trim().toLowerCase(), value]),
  ) as Record<string, T>
}

const dailyActivityDivisionAliasIndex = buildAliasIndex(DAILY_ACTIVITY_DIVISION_ALIASES)
const dailyActivitySubdivisionAliasIndex = buildAliasIndex(DAILY_ACTIVITY_SUBDIVISION_ALIASES)

export function normalizeDailyActivityDivisionName(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  return dailyActivityDivisionAliasIndex[normalized.toLowerCase()] ?? normalized
}

export function normalizeDailyActivitySubdivisionName(value: string) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return ''
  return dailyActivitySubdivisionAliasIndex[normalized.toLowerCase()] ?? normalized
}

export function getDailyActivityDivisionAliases(value: string) {
  const canonical = normalizeDailyActivityDivisionName(value)
  if (!canonical) return []
  return Array.from(
    new Set(
      Object.entries(DAILY_ACTIVITY_DIVISION_ALIASES)
        .filter(([, aliasValue]) => aliasValue === canonical)
        .map(([aliasKey]) => aliasKey)
        .concat(canonical),
    ),
  )
}

export function getDailyActivitySubdivisionAliases(division: string, subdivision: string) {
  const normalizedDivision = normalizeDailyActivityDivisionName(division)
  const canonical = normalizeDailyActivitySubdivisionName(subdivision)
  if (!normalizedDivision || !canonical) return canonical ? [canonical] : []

  const subdivisions = getDailyActivitySubdivisions(normalizedDivision)
  if (subdivisions.length > 0 && !subdivisions.includes(canonical)) {
    return [canonical]
  }

  return Array.from(
    new Set(
      Object.entries(DAILY_ACTIVITY_SUBDIVISION_ALIASES)
        .filter(([, aliasValue]) => aliasValue === canonical)
        .map(([aliasKey]) => aliasKey)
        .concat(canonical),
    ),
  )
}

export function getDailyActivityDivisionOptions(): string[] {
  return DAILY_ACTIVITY_DIVISION_STRUCTURE.map((item) => String(item.division))
}

export function getDailyActivitySubdivisionMap() {
  return Object.fromEntries(
    DAILY_ACTIVITY_DIVISION_STRUCTURE.map((item) => [item.division, [...item.subdivisions]]),
  ) as Record<DailyActivityDivisionName, string[]>
}

export function getDailyActivitySubdivisions(division: string): string[] {
  const normalizedDivision = normalizeDailyActivityDivisionName(division)
  const found = DAILY_ACTIVITY_DIVISION_STRUCTURE.find((item) => item.division === normalizedDivision)
  return found ? Array.from(found.subdivisions, (item) => String(item)) : []
}

export function isValidDailyActivityPlanningLevel(value: string): value is DailyActivityPlanningLevel {
  return DAILY_ACTIVITY_PLANNING_LEVELS.includes(value as DailyActivityPlanningLevel)
}

export function isValidDailyActivityDivision(value: string): value is DailyActivityDivisionName {
  return DAILY_ACTIVITY_DIVISION_STRUCTURE.some((item) => item.division === normalizeDailyActivityDivisionName(value))
}

export function isValidDailyActivitySubdivision(division: string, subdivision: string) {
  const subdivisions = getDailyActivitySubdivisions(division)
  const normalizedSubdivision = normalizeDailyActivitySubdivisionName(subdivision)
  if (subdivisions.length === 0) {
    return normalizedSubdivision.length === 0
  }

  return subdivisions.includes(normalizedSubdivision)
}

export function resolveDefaultDailyActivitySubdivision(division: string, subdivision: string | null | undefined) {
  const subdivisions = getDailyActivitySubdivisions(division)
  if (subdivisions.length === 0) {
    return ''
  }

  const normalized = normalizeDailyActivitySubdivisionName(String(subdivision ?? ''))
  return subdivisions.includes(normalized) ? normalized : subdivisions[0]
}
