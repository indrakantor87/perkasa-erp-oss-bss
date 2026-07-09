export const DAILY_ACTIVITY_PLANNING_LEVELS = ['MANAGER', 'SPV', 'LEADER'] as const

export type DailyActivityPlanningLevel = (typeof DAILY_ACTIVITY_PLANNING_LEVELS)[number]

export const dailyActivityPlanningLevelLabels: Record<DailyActivityPlanningLevel, string> = {
  MANAGER: 'Manager',
  SPV: 'SPV',
  LEADER: 'Leader',
}

export const DAILY_ACTIVITY_DIVISION_STRUCTURE = [
  {
    division: 'Pemasaran & Pelayanan',
    subdivisions: ['Penjualan', 'CS', 'Admin CS', 'NOC', 'Troubleshoots', 'Digital Creator'],
  },
  {
    division: 'Teknisi',
    subdivisions: ['Teknisi PSB', 'Teknisi Jalur dan Expan', 'Teknisi Jointer'],
  },
  {
    division: 'General Affair',
    subdivisions: ['Inventory', 'Legal'],
  },
  {
    division: 'Finance & HR',
    subdivisions: [],
  },
  {
    division: 'Operasional',
    subdivisions: ['Kantor', 'Toko'],
  },
] as const

export type DailyActivityDivisionName = (typeof DAILY_ACTIVITY_DIVISION_STRUCTURE)[number]['division']

export function getDailyActivityDivisionOptions(): string[] {
  return DAILY_ACTIVITY_DIVISION_STRUCTURE.map((item) => String(item.division))
}

export function getDailyActivitySubdivisionMap() {
  return Object.fromEntries(
    DAILY_ACTIVITY_DIVISION_STRUCTURE.map((item) => [item.division, [...item.subdivisions]]),
  ) as Record<DailyActivityDivisionName, string[]>
}

export function getDailyActivitySubdivisions(division: string): string[] {
  const found = DAILY_ACTIVITY_DIVISION_STRUCTURE.find((item) => item.division === division)
  return found ? Array.from(found.subdivisions, (item) => String(item)) : []
}

export function isValidDailyActivityPlanningLevel(value: string): value is DailyActivityPlanningLevel {
  return DAILY_ACTIVITY_PLANNING_LEVELS.includes(value as DailyActivityPlanningLevel)
}

export function isValidDailyActivityDivision(value: string): value is DailyActivityDivisionName {
  return DAILY_ACTIVITY_DIVISION_STRUCTURE.some((item) => item.division === value)
}

export function isValidDailyActivitySubdivision(division: string, subdivision: string) {
  const subdivisions = getDailyActivitySubdivisions(division)
  if (subdivisions.length === 0) {
    return subdivision.trim().length === 0
  }

  return subdivisions.includes(subdivision)
}

export function resolveDefaultDailyActivitySubdivision(division: string, subdivision: string | null | undefined) {
  const subdivisions = getDailyActivitySubdivisions(division)
  if (subdivisions.length === 0) {
    return ''
  }

  const normalized = String(subdivision ?? '').trim()
  return subdivisions.includes(normalized) ? normalized : subdivisions[0]
}
