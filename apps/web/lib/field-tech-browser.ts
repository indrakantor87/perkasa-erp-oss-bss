export type FieldTechStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_PROGRESS'
  | 'TEMPORARY'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OPEN'
  | 'CLOSED'
  | 'ON_HOLD'
  | 'PENDING'

export type FieldTechAction =
  | 'ACCEPT'
  | 'START'
  | 'SUBMIT'
  | 'TEMPORARY'
  | 'RESUME'
  | 'RELEASE'
  | 'CLOSE'
  | 'REOPEN'
  | 'APPROVE'
  | 'REJECT'

export type FieldTechTicketType = 'WORK_ORDER' | 'TROUBLE' | 'PSB' | 'EXPANSION' | 'DISMANTLE' | 'JOINTER' | 'SALES' | 'OTHER'

type TransitionTuple = [FieldTechStatus | Uppercase<string>, FieldTechAction | Uppercase<string>, (FieldTechTicketType | Uppercase<string>)?]

const FIELD_TECH_WORKFLOW_MATRIX: TransitionTuple[] = [
  ['ASSIGNED', 'ACCEPT'],
  ['ACCEPTED', 'START'],
  ['ON_PROGRESS', 'SUBMIT'],
  ['TEMPORARY', 'RESUME'],
  ['ON_PROGRESS', 'TEMPORARY', 'TROUBLE'],
]

export function isValidTransition(
  currentStatus: string | null | undefined,
  action: string | null | undefined,
  ticketType?: string | null | undefined,
): boolean {
  const cur = String(currentStatus ?? '').trim().toUpperCase()
  const act = String(action ?? '').trim().toUpperCase()
  const type = String(ticketType ?? '').trim().toUpperCase()
  if (!cur || !act) return false
  for (const [fromState, actionName, onlyType] of FIELD_TECH_WORKFLOW_MATRIX) {
    if (cur !== fromState) continue
    if (act !== actionName) continue
    if (onlyType && type && type !== onlyType) continue
    return true
  }
  return false
}

export function resolveNextExpectedStatus(
  currentStatus: string | null | undefined,
  action: string | null | undefined,
  ticketType?: string | null | undefined,
): FieldTechStatus | null {
  if (!isValidTransition(currentStatus, action, ticketType)) return null
  const act = String(action ?? '').trim().toUpperCase()
  if (act === 'ACCEPT') return 'ACCEPTED'
  if (act === 'START') return 'ON_PROGRESS'
  if (act === 'TEMPORARY') return 'TEMPORARY'
  if (act === 'RESUME') return 'ON_PROGRESS'
  if (act === 'SUBMIT') return 'COMPLETED'
  return null
}

export function isTerminalTechnicianStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').trim().toUpperCase()
  return s === 'COMPLETED' || s === 'CLOSED' || s === 'CANCELLED'
}

export type CanonicalSlaState = 'UNSET' | 'ON_TRACK' | 'WARNING' | 'BREACHED' | 'TEMPORARY_PAUSED'

export type ClientSlaTemporaryPeriod = {
  startedAt: string | Date | null | undefined
  endedAt: string | Date | null | undefined
}

export function clientHasActiveTemporaryPeriod(periods: Array<ClientSlaTemporaryPeriod> | null | undefined): boolean {
  if (!Array.isArray(periods) || periods.length === 0) return false
  for (const p of periods) {
    if (!p) continue
    const sRaw = p.startedAt
    if (sRaw === null || sRaw === undefined) continue
    const s = sRaw instanceof Date ? sRaw : new Date(String(sRaw))
    if (!Number.isFinite(s.getTime())) continue
    const eRaw = p.endedAt
    if (eRaw === null || eRaw === undefined || eRaw === '') return true
    const e = eRaw instanceof Date ? eRaw : new Date(String(eRaw))
    if (!Number.isFinite(e.getTime())) return true
  }
  return false
}

export function clientSumTemporaryMinutes(periods: Array<ClientSlaTemporaryPeriod> | null | undefined): number {
  if (!Array.isArray(periods) || periods.length === 0) return 0
  let total = 0
  for (const p of periods) {
    if (!p || !p.startedAt) continue
    const s = p.startedAt instanceof Date ? p.startedAt : new Date(String(p.startedAt))
    if (!Number.isFinite(s.getTime())) continue
    const eRaw = p.endedAt
    if (!eRaw) continue
    const e = eRaw instanceof Date ? eRaw : new Date(String(eRaw))
    if (!Number.isFinite(e.getTime()) || e.getTime() <= s.getTime()) continue
    total += Math.max(0, Math.floor((e.getTime() - s.getTime()) / 60000))
  }
  return total
}
