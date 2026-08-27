export type TimelineTs = {
  assignedAt: string | null
  acceptedAt: string | null
  releasedAt: string | null
}

export type AcceptedByLabels = {
  full: string | null
  username: string | null
  userId: number | null
}

export function computeAssignmentTimeline(
  statusRaw: string | null,
  ts: TimelineTs,
  labels: AcceptedByLabels,
): { timelineAt: string | null; acceptedBySuffix: string } {
  const statusCanon = String(statusRaw ?? '').trim().toUpperCase()
  let timelineAt: string | null = ts.assignedAt
  let acceptedBySuffix = ''

  if (statusCanon === 'RELEASED') {
    timelineAt = ts.releasedAt
  } else if (statusCanon === 'ACCEPTED') {
    timelineAt = ts.acceptedAt
    const hasAnyIdentity = labels.full || labels.username || labels.userId != null
    if (hasAnyIdentity) {
      const displayName = labels.full ?? labels.username ?? (labels.userId != null ? `User #${labels.userId}` : null)
      if (displayName) {
        acceptedBySuffix = `Diterima oleh: ${displayName}`
      }
    }
  } else {
    timelineAt = ts.assignedAt
  }

  return { timelineAt, acceptedBySuffix }
}

export type TimelineEvent = {
  id: string
  at: string | null
  type: 'work-order' | 'movement' | 'assignment' | 'status' | (string & {})
}

export function sortTimelineEvents(entries: TimelineEvent[]): TimelineEvent[] {
  return [...entries].sort((left, right) => {
    const leftTime = left.at ? new Date(left.at).getTime() : 0
    const rightTime = right.at ? new Date(right.at).getTime() : 0
    const diff = rightTime - leftTime
    if (diff !== 0) return diff
    const typeRank = (type: string): number =>
      ({ 'work-order': 1, movement: 2, assignment: 3, status: 4 }[type] ?? 0)
    const rankDiff = typeRank(right.type) - typeRank(left.type)
    if (rankDiff !== 0) return rankDiff
    return String(left.id).localeCompare(String(right.id))
  })
}

type AssertResult = { ok: boolean; message: string }

const results: AssertResult[] = []

function assert(label: string, condition: boolean, detail?: string): void {
  results.push({ ok: !!condition, message: `${label}${detail ? ` — ${detail}` : ''}` })
}

const tsAssigned = '2026-07-19 08:20:00'
const tsAccepted = '2026-07-19 08:28:00'
const tsReleased = '2026-07-19 09:05:00'

{
  const out = computeAssignmentTimeline(
    'RELEASED',
    { assignedAt: tsAssigned, acceptedAt: tsAccepted, releasedAt: tsReleased },
    { full: 'Teknisi Trouble 01', username: 'teknisi.trouble01', userId: 211 },
  )
  assert('T1', out.timelineAt === tsReleased, `timelineAt=${out.timelineAt} expected releasedAt=${tsReleased}`)
  assert('T1', out.timelineAt !== tsAccepted, `timelineAt MUST NOT equal acceptedAt=${tsAccepted}`)
}

{
  const out = computeAssignmentTimeline(
    'ACCEPTED',
    { assignedAt: tsAssigned, acceptedAt: tsAccepted, releasedAt: null },
    { full: null, username: null, userId: null },
  )
  assert('T2', out.timelineAt === tsAccepted, `timelineAt=${out.timelineAt} expected acceptedAt=${tsAccepted}`)
}

{
  const out = computeAssignmentTimeline(
    'ASSIGNED',
    { assignedAt: tsAssigned, acceptedAt: null, releasedAt: null },
    { full: null, username: null, userId: null },
  )
  assert('T3', out.timelineAt === tsAssigned, `timelineAt=${out.timelineAt} expected assignedAt=${tsAssigned}`)
}

{
  const out = computeAssignmentTimeline(
    'ACCEPTED',
    { assignedAt: tsAssigned, acceptedAt: tsAccepted, releasedAt: null },
    { full: 'Nama Lengkap', username: 'username.saya', userId: 99 },
  )
  assert('T4', out.acceptedBySuffix.includes('Nama Lengkap'), `suffix=${out.acceptedBySuffix}`)
  assert('T4', !out.acceptedBySuffix.includes('username.saya'), `FullName harus menang, suffix=${out.acceptedBySuffix}`)
}

{
  const out = computeAssignmentTimeline(
    'ACCEPTED',
    { assignedAt: tsAssigned, acceptedAt: tsAccepted, releasedAt: null },
    { full: null, username: 'username.saja', userId: 99 },
  )
  assert('T5', out.acceptedBySuffix.includes('username.saja'), `suffix=${out.acceptedBySuffix}`)
  assert('T5', !out.acceptedBySuffix.includes('User #99'), `Username harus menang dulu, suffix=${out.acceptedBySuffix}`)
}

{
  const out = computeAssignmentTimeline(
    'ACCEPTED',
    { assignedAt: tsAssigned, acceptedAt: tsAccepted, releasedAt: null },
    { full: null, username: null, userId: null },
  )
  assert('T6', out.acceptedBySuffix === '', `suffix="${out.acceptedBySuffix}" harus kosong`)
}

{
  const sameTs = '2026-07-19 10:00:00'
  const wo: TimelineEvent = { id: 'wo-1', at: sameTs, type: 'work-order' }
  const mv: TimelineEvent = { id: 'movement-1', at: sameTs, type: 'movement' }
  const as: TimelineEvent = { id: 'assignment-1', at: sameTs, type: 'assignment' }
  const st: TimelineEvent = { id: 'status-1', at: sameTs, type: 'status' }
  const randomInput: TimelineEvent[] = [wo, mv, as, st]
  const orderedIds1 = sortTimelineEvents(randomInput).map((e) => e.id)
  const orderedIds2 = sortTimelineEvents([...randomInput].reverse()).map((e) => e.id)
  const expectedOrder = ['status-1', 'assignment-1', 'movement-1', 'wo-1']
  assert('T7', JSON.stringify(orderedIds1) === JSON.stringify(expectedOrder), `order1=${orderedIds1.join(',')}`)
  assert('T7', JSON.stringify(orderedIds2) === JSON.stringify(expectedOrder), `deterministic reorder order2=${orderedIds2.join(',')}`)
}

{
  const sameTs = '2026-07-19 10:00:00'
  const a: TimelineEvent = { id: 'status-a-10', at: sameTs, type: 'status' }
  const b: TimelineEvent = { id: 'status-b-5', at: sameTs, type: 'status' }
  const r1 = sortTimelineEvents([a, b]).map((e) => e.id)
  const r2 = sortTimelineEvents([b, a]).map((e) => e.id)
  assert('T7', JSON.stringify(r1) === JSON.stringify(r2), `localeCompare determinism r1=${r1.join(',')} vs r2=${r2.join(',')}`)
}

const passCount = results.filter((r) => r.ok).length
const failCount = results.length - passCount

console.log('[P5.7 timeline regression]')
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.message}`)
}
console.log(`\nSummary: ${passCount}/${results.length} executable PASS; ${failCount} FAIL`)

if (failCount > 0) {
  process.exit(1)
}
