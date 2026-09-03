export type CanonicalSlaState = 'UNSET' | 'ON_TRACK' | 'WARNING' | 'BREACHED'

export type LegacySlaState = 'UNSET' | 'ON_TRACK' | 'DUE_TODAY' | 'OVERDUE'

const LEGACY_TO_CANONICAL: Record<Exclude<LegacySlaState, 'UNSET' | 'ON_TRACK'>, Exclude<CanonicalSlaState, 'UNSET' | 'ON_TRACK'>> = {
  DUE_TODAY: 'WARNING',
  OVERDUE: 'BREACHED',
}

export function mapLegacySlaStateToCanonical(value: string | null | undefined): CanonicalSlaState {
  if (!value) return 'UNSET'
  const normalized = String(value).trim().toUpperCase()
  if (normalized === 'UNSET' || normalized === 'ON_TRACK') return normalized
  if (normalized === 'DUE_TODAY' || normalized === 'WARNING') return 'WARNING'
  if (normalized === 'OVERDUE' || normalized === 'BREACHED') return 'BREACHED'
  return 'UNSET'
}

export type CanonicalSlaResolverParams = {
  slaDueAt?: string | Date | null | undefined
  openedAt?: string | Date | null | undefined
  fallbackTargetHours?: number | null | undefined
  warningWindowHours?: number | null | undefined
  warningCalendarDays?: boolean | null | undefined
  now?: Date | null | undefined
}

export function resolveCanonicalSlaState(params: CanonicalSlaResolverParams): CanonicalSlaState {
  const referenceNow = params.now instanceof Date && Number.isFinite(params.now.getTime()) ? params.now : new Date()
  const dueAtRaw = params.slaDueAt ?? null
  if (dueAtRaw !== null && dueAtRaw !== undefined) {
    const dueDate = dueAtRaw instanceof Date ? dueAtRaw : new Date(dueAtRaw)
    if (Number.isFinite(dueDate.getTime())) {
      const diffMs = dueDate.getTime() - referenceNow.getTime()
      if (diffMs < 0) return 'BREACHED'
      const warningCalendar = params.warningCalendarDays ?? true
      if (warningCalendar) {
        const todayStart = new Date(referenceNow)
        todayStart.setHours(0, 0, 0, 0)
        const tomorrowStart = new Date(todayStart)
        tomorrowStart.setDate(tomorrowStart.getDate() + 1)
        if (dueDate.getTime() >= todayStart.getTime() && dueDate.getTime() < tomorrowStart.getTime()) {
          return 'WARNING'
        }
        return 'ON_TRACK'
      }
      const warningHours = Number.isFinite(Number(params.warningWindowHours)) ? Math.max(0, Number(params.warningWindowHours) as number) : 2
      const diffHours = diffMs / (1000 * 60 * 60)
      if (diffHours <= warningHours) return 'WARNING'
      return 'ON_TRACK'
    }
  }

  const openedAtRaw = params.openedAt ?? null
  const targetHours = Number.isFinite(Number(params.fallbackTargetHours)) ? Math.max(0, Number(params.fallbackTargetHours) as number) : null
  if (openedAtRaw !== null && openedAtRaw !== undefined && targetHours !== null) {
    const openedDate = openedAtRaw instanceof Date ? openedAtRaw : new Date(openedAtRaw)
    if (Number.isFinite(openedDate.getTime())) {
      const ageMs = referenceNow.getTime() - openedDate.getTime()
      if (ageMs < 0) return 'ON_TRACK'
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60))
      if (ageHours >= targetHours) return 'BREACHED'
      const warningHours = Math.max(1, targetHours - 2)
      if (ageHours >= warningHours) return 'WARNING'
      return 'ON_TRACK'
    }
  }
  return 'UNSET'
}
