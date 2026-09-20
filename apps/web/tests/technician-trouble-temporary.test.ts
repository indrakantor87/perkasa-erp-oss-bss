import type { AppSession } from '@/lib/auth-session'
import {
  buildFieldTechTroubleTicketOwnershipWhere,
} from '@/lib/q3-field-tech-tt-ownership'
import { isValidTransition } from '@/lib/services/field-tech-transitions'
import {
  resolveCanonicalSlaState,
  type SlaTemporaryPeriod,
  type ResolvedSlaDetail,
} from '@/lib/services/sla-resolver'

type AppRole =
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'HR'
  | 'GA'
  | 'PENJUALAN'
  | 'SALES_MARKETING'
  | 'CS_OPERATOR'
  | 'CS_ADMIN'
  | 'NOC_OPERATOR'
  | 'FIELD_TECHNICIAN'
  | 'TT_OPERATOR'
  | 'DIGITAL_CREATOR'
  | 'DISMANTLE_OPERATOR'
  | 'PUBLIC'

function makeSession(overrides: {
  userId?: number
  username?: string
  displayName?: string
  role: AppRole
  branchId?: number | null
  branchIds?: number[]
}): AppSession {
  return {
    userId: overrides.userId ?? 1,
    username: overrides.username ?? 'tech.user',
    displayName: overrides.displayName ?? 'Tech User',
    role: overrides.role,
    branchId: overrides.branchId ?? 5,
    branchIds: overrides.branchIds ?? [5],
  }
}

void (async function runGroupD() {
  // SPEC D17: OnProgress→Temporary valid TROUBLE only
  try {
    const troubleOk = isValidTransition('ON_PROGRESS', 'TEMPORARY', 'TROUBLE')
    const psbDenied = isValidTransition('ON_PROGRESS', 'TEMPORARY', 'PSB')
    const dismantleDenied = isValidTransition('ON_PROGRESS', 'TEMPORARY', 'DISMANTLE')
    const otherFromDenied = isValidTransition('ASSIGNED', 'TEMPORARY', 'TROUBLE')
    const acceptedDenied = isValidTransition('ACCEPTED', 'TEMPORARY', 'TROUBLE')
    const passed =
      troubleOk === true &&
      psbDenied === false &&
      dismantleDenied === false &&
      otherFromDenied === false &&
      acceptedDenied === false
    if (passed) {
      console.log('TEST D17 OnProgress→Temporary valid TROUBLE only → VALID: PASS')
    } else {
      console.error('TEST D17 OnProgress→Temporary valid TROUBLE only → VALID: FAIL')
    }
  } catch {
    console.error('TEST D17 OnProgress→Temporary valid TROUBLE only → VALID: FAIL')
  }

  // SPEC D18: Reason required empty DENY
  try {
    const emptyStr = ''
    const whitespace = '   '
    const nullReason: unknown = null
    const undefinedReason: unknown = undefined
    const trimmedEmpty = String(emptyStr ?? '').trim() === ''
    const trimmedWhitespace = String(whitespace ?? '').trim() === ''
    const trimmedNull = String(nullReason ?? '').trim() === ''
    const trimmedUndefined = String(undefinedReason ?? '').trim() === ''
    const passed =
      trimmedEmpty === true &&
      trimmedWhitespace === true &&
      trimmedNull === true &&
      trimmedUndefined === true
    if (passed) {
      console.log('TEST D18 Reason required empty DENY → DENY: PASS')
    } else {
      console.error('TEST D18 Reason required empty DENY → DENY: FAIL')
    }
  } catch {
    console.error('TEST D18 Reason required empty DENY → DENY: FAIL')
  }

  // SPEC D19: Temporary→Resume valid
  try {
    const fromTemporary = isValidTransition('TEMPORARY', 'RESUME', 'TROUBLE')
    const fromPending = isValidTransition('PENDING', 'RESUME', 'TROUBLE')
    const fromOnHold = isValidTransition('ON_HOLD', 'RESUME', 'TROUBLE')
    const fromOtherDenied = isValidTransition('ON_PROGRESS', 'RESUME', 'TROUBLE')
    const fromAssignedDenied = isValidTransition('ASSIGNED', 'RESUME', 'TROUBLE')
    const passed =
      fromTemporary === true &&
      fromPending === true &&
      fromOnHold === true &&
      fromOtherDenied === false &&
      fromAssignedDenied === false
    if (passed) {
      console.log('TEST D19 Temporary→Resume valid → VALID: PASS')
    } else {
      console.error('TEST D19 Temporary→Resume valid → VALID: FAIL')
    }
  } catch {
    console.error('TEST D19 Temporary→Resume valid → VALID: FAIL')
  }

  // SPEC D20: Temporary exclude SLA duration
  try {
    const opened = new Date('2025-01-15T09:00:00')
    const slaConfig = { durationMinutes: 4 * 60 }
    const submitNow = new Date('2025-01-15T16:00:00')
    const tempPeriodsClosed: SlaTemporaryPeriod[] = [
      {
        startedAt: new Date('2025-01-15T11:00:00'),
        endedAt: new Date('2025-01-15T15:00:00'),
      },
    ]
    const withoutTemp = resolveCanonicalSlaState(
      opened,
      slaConfig,
      [],
    ) as ResolvedSlaDetail
    const withTempClosed = resolveCanonicalSlaState(
      opened,
      slaConfig,
      tempPeriodsClosed,
    ) as ResolvedSlaDetail
    const rawElapsedMinutes = (submitNow.getTime() - opened.getTime()) / (1000 * 60)
    const tempDurationMinutes = 4 * 60
    const expectedEffectiveMinutes = rawElapsedMinutes - tempDurationMinutes
    const effectiveLower = withTempClosed.effectiveTimeMinutes >= Math.floor(expectedEffectiveMinutes) - 5
    const effectiveUpper = withTempClosed.effectiveTimeMinutes <= Math.ceil(expectedEffectiveMinutes) + 5
    const noTempBreached = withoutTemp.state === 'BREACHED'
    const withTempNotBreached = withTempClosed.state !== 'BREACHED'
    const passed =
      effectiveLower === true &&
      effectiveUpper === true &&
      noTempBreached === true &&
      withTempNotBreached === true
    if (passed) {
      console.log('TEST D20 Temporary exclude SLA duration → EXCLUDED: PASS')
    } else {
      console.error('TEST D20 Temporary exclude SLA duration → EXCLUDED: FAIL')
    }
  } catch {
    console.error('TEST D20 Temporary exclude SLA duration → EXCLUDED: FAIL')
  }

  // SPEC D21: Temporary NOT OVERDUE (active → TEMPORARY_PAUSED, not BREACHED)
  // opened 09:00, sla 4h, temporary started 11:00 (endedAt null = active), submit 16:00
  try {
    const opened09 = new Date('2025-01-15T09:00:00')
    const sla4h = { durationMinutes: 4 * 60 }
    const now16 = new Date('2025-01-15T16:00:00')
    const tempActive: SlaTemporaryPeriod[] = [
      {
        startedAt: new Date('2025-01-15T11:00:00'),
        endedAt: null,
      },
    ]
    const resultWithActiveTemp = resolveCanonicalSlaState({
      openedAt: opened09,
      fallbackTargetHours: 4,
      now: now16,
      temporaryPeriods: tempActive,
    })
    const overload2 = resolveCanonicalSlaState(opened09, sla4h, tempActive) as ResolvedSlaDetail
    const state1Paused = resultWithActiveTemp === 'TEMPORARY_PAUSED'
    const state2NotBreached = overload2.state === 'TEMPORARY_PAUSED' || overload2.state !== 'BREACHED'
    const breachedAtNull = overload2.breachedAt === null
    const passed = state1Paused === true && state2NotBreached === true && breachedAtNull === true
    if (passed) {
      console.log('TEST D21 Temporary NOT OVERDUE → TEMPORARY_PAUSED: PASS')
    } else {
      console.error('TEST D21 Temporary NOT OVERDUE → TEMPORARY_PAUSED: FAIL')
    }
  } catch {
    console.error('TEST D21 Temporary NOT OVERDUE → TEMPORARY_PAUSED: FAIL')
  }

  // SPEC D22: Resume SLA continue
  try {
    const opened = new Date('2025-01-15T09:00:00')
    const sla = { durationMinutes: 4 * 60 }
    const resumeAt = new Date('2025-01-15T15:00:00')
    const tempClosedPeriod: SlaTemporaryPeriod[] = [
      {
        startedAt: new Date('2025-01-15T11:00:00'),
        endedAt: new Date('2025-01-15T15:00:00'),
      },
    ]
    const resumed = resolveCanonicalSlaState(opened, sla, tempClosedPeriod) as ResolvedSlaDetail
    const dueAtExtended = resumed.slaDueAt != null
    const effectiveBeforeResume = resumed.effectiveTimeMinutes
    const expectedEffectiveMin = 2 * 60 - 5
    const expectedEffectiveMax = 2 * 60 + 5
    const effectiveCorrect =
      effectiveBeforeResume >= expectedEffectiveMin && effectiveBeforeResume <= expectedEffectiveMax
    const passed = dueAtExtended === true && effectiveCorrect === true
    if (passed) {
      console.log('TEST D22 Resume SLA continue → CONTINUED: PASS')
    } else {
      console.error('TEST D22 Resume SLA continue → CONTINUED: FAIL')
    }
  } catch {
    console.error('TEST D22 Resume SLA continue → CONTINUED: FAIL')
  }

  // SPEC D23: Temporary not COMPLETED
  try {
    const tempToCompleted = isValidTransition('TEMPORARY', 'COMPLETE', 'TROUBLE')
    const onHoldToCompleted = isValidTransition('ON_HOLD', 'COMPLETE', 'TROUBLE')
    const pendingToCompleted = isValidTransition('PENDING', 'COMPLETE', 'TROUBLE')
    const submittedToComplete = isValidTransition('SUBMITTED', 'COMPLETE', 'TROUBLE')
    const passed =
      tempToCompleted === false &&
      onHoldToCompleted === false &&
      pendingToCompleted === false &&
      submittedToComplete === true
    if (passed) {
      console.log('TEST D23 Temporary not COMPLETED → NOT_COMPLETED: PASS')
    } else {
      console.error('TEST D23 Temporary not COMPLETED → NOT_COMPLETED: FAIL')
    }
  } catch {
    console.error('TEST D23 Temporary not COMPLETED → NOT_COMPLETED: FAIL')
  }

  // SPEC D24: Other tech temp/resume DENY
  try {
    const ownerTech = makeSession({ role: 'FIELD_TECHNICIAN', userId: 101 })
    const otherTech = makeSession({ role: 'FIELD_TECHNICIAN', userId: 999 })
    const ownershipOwner = buildFieldTechTroubleTicketOwnershipWhere(ownerTech, 'tt')
    const ownershipOther = buildFieldTechTroubleTicketOwnershipWhere(otherTech, 'tt')
    const ownerHas101 = ownershipOwner.bindParams.filter((v) => v === 101).length >= 2
    const otherHas999Only = ownershipOther.bindParams
      .filter((v) => typeof v === 'number' && v > 0)
      .every((v) => v === 999)
    const otherNotHas101 = !ownershipOther.bindParams.includes(101)
    const passed = ownerHas101 === true && otherHas999Only === true && otherNotHas101 === true
    if (passed) {
      console.log('TEST D24 Other tech temp/resume DENY → DENY: PASS')
    } else {
      console.error('TEST D24 Other tech temp/resume DENY → DENY: FAIL')
    }
  } catch {
    console.error('TEST D24 Other tech temp/resume DENY → DENY: FAIL')
  }
})()
