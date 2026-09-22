export type CanonicalSlaState = 'UNSET' | 'ON_TRACK' | 'WARNING' | 'BREACHED' | 'TEMPORARY_PAUSED'

export type LegacySlaState = 'UNSET' | 'ON_TRACK' | 'DUE_TODAY' | 'OVERDUE'

const LEGACY_TO_CANONICAL: Record<Exclude<LegacySlaState, 'UNSET' | 'ON_TRACK'>, Exclude<CanonicalSlaState, 'UNSET' | 'ON_TRACK' | 'TEMPORARY_PAUSED'>> = {
  DUE_TODAY: 'WARNING',
  OVERDUE: 'BREACHED',
}

export type SlaTemporaryPeriod = {
  startedAt: Date | string
  endedAt: Date | string | null
}

export type ResolvedSlaDetail = {
  state: CanonicalSlaState
  effectiveTimeMinutes: number
  slaDueAt: Date | null
  breachedAt: Date | null
}

export function mapLegacySlaStateToCanonical(value: string | null | undefined): CanonicalSlaState {
  if (!value) return 'UNSET'
  const normalized = String(value).trim().toUpperCase()
  if (normalized === 'UNSET' || normalized === 'ON_TRACK') return normalized
  if (normalized === 'TEMPORARY_PAUSED') return 'TEMPORARY_PAUSED'
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
  temporaryPeriods?: Array<SlaTemporaryPeriod> | null | undefined
  completedAt?: string | Date | null | undefined
}

function resolveExistingCanonicalOnly(
  params: CanonicalSlaResolverParams,
): CanonicalSlaState {
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

export function resolveCanonicalSlaState(params: CanonicalSlaResolverParams): CanonicalSlaState
export function resolveCanonicalSlaState(
  openedAt: Date | string,
  slaConfig: { durationDays?: number; durationMinutes?: number },
  temporaryPeriods?: Array<SlaTemporaryPeriod>,
): ResolvedSlaDetail
export function resolveCanonicalSlaState(
  first: CanonicalSlaResolverParams | Date | string,
  second?: { durationDays?: number; durationMinutes?: number },
  third?: Array<SlaTemporaryPeriod>,
): CanonicalSlaState | ResolvedSlaDetail {
  if (
    (first instanceof Date || typeof first === 'string') &&
    second &&
    typeof second === 'object'
  ) {
    const openedAtInput = first
    const slaConfig = second
    const temporaryPeriods = Array.isArray(third) ? third : undefined
    const openedDate = openedAtInput instanceof Date ? openedAtInput : new Date(openedAtInput)
    const now = new Date()
    const durationDaysNum = Number.isFinite(Number(slaConfig.durationDays))
      ? Math.max(0, Number(slaConfig.durationDays) as number)
      : 0
    const durationMinutesNum = Number.isFinite(Number(slaConfig.durationMinutes))
      ? Math.max(0, Number(slaConfig.durationMinutes) as number)
      : 0
    const totalDurationMinutes = durationDaysNum * 24 * 60 + durationMinutesNum
    const slaDueAtBase = totalDurationMinutes > 0
      ? new Date(openedDate.getTime() + totalDurationMinutes * 60 * 1000)
      : null

    let hasActiveTemporary = false
    let closedTemporaryTotalMs = 0
    if (Array.isArray(temporaryPeriods) && temporaryPeriods.length > 0) {
      for (const p of temporaryPeriods) {
        if (!p) continue
        const startRaw = p.startedAt
        const endRaw = p.endedAt
        const startDate = startRaw instanceof Date ? startRaw : new Date(startRaw)
        if (!(startDate instanceof Date) || !Number.isFinite(startDate.getTime())) continue
        if (endRaw === null || endRaw === undefined) {
          hasActiveTemporary = true
          continue
        }
        const endDate = endRaw instanceof Date ? endRaw : new Date(endRaw)
        if (!(endDate instanceof Date) || !Number.isFinite(endDate.getTime())) continue
        const delta = endDate.getTime() - startDate.getTime()
        if (delta > 0) closedTemporaryTotalMs += delta
      }
    }

    const openedMs = Number.isFinite(openedDate.getTime()) ? openedDate.getTime() : 0
    const nowMs = now.getTime()
    const rawElapsedMs = Math.max(0, nowMs - openedMs)
    const effectiveElapsedMs = Math.max(0, rawElapsedMs - closedTemporaryTotalMs)
    const effectiveTimeMinutes = Math.max(0, Math.floor(effectiveElapsedMs / (1000 * 60)))

    let finalDueAt: Date | null = slaDueAtBase
    let breachedAt: Date | null = null
    let computedState: CanonicalSlaState = 'UNSET'

    if (hasActiveTemporary) {
      computedState = 'TEMPORARY_PAUSED'
    } else if (totalDurationMinutes > 0 && openedMs > 0) {
      const extendedDueMs = (slaDueAtBase?.getTime() ?? 0) + closedTemporaryTotalMs
      finalDueAt = new Date(extendedDueMs)
      const remainingMs = extendedDueMs - nowMs

      if (remainingMs < 0) {
        computedState = 'BREACHED'
        breachedAt = new Date(extendedDueMs)
      } else {
        const warningThresholdMs = Math.min(
          totalDurationMinutes * 60 * 1000 * 0.15,
          2 * 60 * 60 * 1000,
        )
        computedState = remainingMs <= warningThresholdMs ? 'WARNING' : 'ON_TRACK'
      }
    }

    return {
      state: computedState,
      effectiveTimeMinutes,
      slaDueAt: finalDueAt,
      breachedAt: hasActiveTemporary ? null : breachedAt,
    }
  }

  const params = first as CanonicalSlaResolverParams
  const referenceNow =
    params.now instanceof Date && Number.isFinite(params.now.getTime()) ? params.now : new Date()
  const tempPeriods = Array.isArray((params as CanonicalSlaResolverParams).temporaryPeriods)
    ? (params as CanonicalSlaResolverParams).temporaryPeriods as Array<SlaTemporaryPeriod>
    : undefined

  let hasActiveTemporary = false
  let closedTemporaryTotalMs = 0
  if (Array.isArray(tempPeriods) && tempPeriods.length > 0) {
    for (const p of tempPeriods) {
      if (!p) continue
      const startRaw = p.startedAt
      const endRaw = p.endedAt
      const startDate = startRaw instanceof Date ? startRaw : new Date(startRaw)
      if (!(startDate instanceof Date) || !Number.isFinite(startDate.getTime())) continue
      if (endRaw === null || endRaw === undefined) {
        hasActiveTemporary = true
        continue
      }
      const endDate = endRaw instanceof Date ? endRaw : new Date(endRaw)
      if (!(endDate instanceof Date) || !Number.isFinite(endDate.getTime())) continue
      const delta = endDate.getTime() - startDate.getTime()
      if (delta > 0) closedTemporaryTotalMs += delta
    }
  }

  let adjustedParams = params
  if (closedTemporaryTotalMs > 0) {
    const addMinutes = Math.ceil(closedTemporaryTotalMs / (60 * 1000))
    if (addMinutes > 0 && params.slaDueAt) {
      const origDue = params.slaDueAt instanceof Date ? params.slaDueAt : new Date(params.slaDueAt)
      if (Number.isFinite(origDue.getTime())) {
        const newDue = new Date(origDue.getTime() + closedTemporaryTotalMs)
        adjustedParams = { ...params, slaDueAt: newDue }
      }
    } else if (addMinutes > 0 && params.openedAt && params.fallbackTargetHours) {
      const origTargetHours = Number(params.fallbackTargetHours) || 0
      const addedHours = addMinutes / 60
      adjustedParams = {
        ...params,
        fallbackTargetHours: origTargetHours + addedHours,
      }
    }
  }

  const baseState = resolveExistingCanonicalOnly(adjustedParams)
  void referenceNow

  if (hasActiveTemporary) {
    if (baseState === 'BREACHED' || baseState === 'ON_TRACK' || baseState === 'WARNING' || baseState === 'UNSET') return 'TEMPORARY_PAUSED'
  }
  return baseState
}
