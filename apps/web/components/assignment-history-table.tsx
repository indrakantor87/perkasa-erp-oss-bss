import { AssignmentAcceptButton } from '@/components/assignment-accept-button'
import { ReleaseAssignmentButton } from '@/components/release-assignment-button'
import { ReassignAssignmentModal, type TechnicianOption } from '@/components/reassign-assignment-modal'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'
import { ExpandableHeaderLeftCells, ExpandableRow } from '@/components/ui-expandable-table'
import type { AssignmentHistoryItem } from '@/lib/services/tracking-service'

type AssignmentHistoryTableProps = {
  assignments: AssignmentHistoryItem[]
  reviewDbReady: boolean
  endpointBasePath: string
  sessionRole: string
  sessionUserId: number | null
  technicianOptions: TechnicianOption[]
}

const P58A_FULL_ACCESS_ROLES = new Set(['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR'])

function resolveAssignmentTone(status: 'ASSIGNED' | 'ACCEPTED' | 'RELEASED'): { tone: StatusTone; label: string } {
  switch (status) {
    case 'ACCEPTED':
      return { tone: 'accepted', label: 'ACCEPTED' }
    case 'RELEASED':
      return { tone: 'released', label: 'RELEASED' }
    default:
      return { tone: 'assigned', label: 'ASSIGNED' }
  }
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function actorLabel(actor: { displayName: string | null; username: string; userId: number } | null): string {
  if (!actor) return 'Sistem'
  return actor.displayName?.trim() || actor.username?.trim() || `User #${actor.userId}`
}

function techLabel(tech: { displayName: string | null; username: string; userId: number }): string {
  const name = tech.displayName?.trim()
  const uname = tech.username?.trim()
  if (name && uname) return `${name} (@${uname})`
  return name || uname || `User #${tech.userId}`
}

export function AssignmentHistoryTable({
  assignments,
  reviewDbReady,
  endpointBasePath,
  sessionRole,
  sessionUserId,
  technicianOptions,
}: AssignmentHistoryTableProps) {
  const hasFullAccess = P58A_FULL_ACCESS_ROLES.has(String(sessionRole ?? 'PUBLIC').trim().toUpperCase())

  if (!assignments || assignments.length === 0) {
    return (
      <section aria-label="Assignment history" className="card-tier-2 border border-line p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
          Riwayat Penugasan
        </p>
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-cardSubtle px-4 py-8 text-center">
          <p className="text-sm font-semibold text-ink">Belum ada riwayat penugasan</p>
          <p className="mt-1 text-xs text-mute">
            Ticket ini belum pernah ditugaskan ke teknisi lapangan.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Assignment history" className="card-tier-3 border border-line p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
            Riwayat Penugasan
          </p>
          <p className="mt-1 text-xs text-mute">{assignments.length} total riwayat penugasan</p>
        </div>
      </div>

      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.16em] text-muteStrong">
              <ExpandableHeaderLeftCells />
              <th className="border-b border-line px-3 py-3 font-semibold">Teknisi</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Peran</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Status</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Primary</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Ditugaskan</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Acceptance</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Released</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Alasan / Catatan</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((row, idx) => {
              const status = resolveAssignmentTone(row.status)
              const isReleased = row.status === 'RELEASED'
              const isSelf = sessionUserId != null && Number(row.technician.userId) === Number(sessionUserId)
              const canAccept = !isReleased && row.status === 'ASSIGNED' && sessionRole === 'FIELD_TECHNICIAN' && isSelf
              const canRelease = !isReleased && (hasFullAccess || (sessionRole === 'FIELD_TECHNICIAN' && isSelf))
              const canReassign = !isReleased && hasFullAccess
              const assignedByLabel = actorLabel(row.assignedBy)
              const acceptedByLabel = actorLabel(row.acceptedBy)
              const releasedByLabel = actorLabel(row.releasedBy)
              const totalCols = 10

              const compactRow = (
                <>
                  <td className="border-b border-line px-3 py-3">
                    <div className="text-sm font-semibold text-inkStrong">{techLabel(row.technician)}</div>
                    <div className="mt-0.5 text-xs text-mute">User #{row.technician.userId}</div>
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-ink">{row.role || '-'}</span>
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <StatusBadge tone={status.tone} label={status.label} size="sm" uppercase />
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {row.isPrimary ? (
                      <StatusBadge tone="warning" label="UTAMA" size="sm" />
                    ) : (
                      <span className="text-xs text-muteStrong">Support</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <div className="text-sm text-ink">{formatDate(row.assignedAt)}</div>
                    <div className="mt-0.5 text-xs text-mute">Oleh: {assignedByLabel}</div>
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {row.status === 'ACCEPTED' ? (
                      <>
                        <div className="text-sm text-ink">{formatDate(row.acceptedAt)}</div>
                        <div className="mt-0.5 text-xs text-mute">Oleh: {acceptedByLabel}</div>
                      </>
                    ) : (
                      <span className="text-xs text-muteStrong">{row.status === 'ASSIGNED' ? 'Belum diterima' : '-'}</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {isReleased ? (
                      <>
                        <div className="text-sm text-ink">{formatDate(row.releasedAt)}</div>
                        <div className="mt-0.5 text-xs text-mute">Oleh: {releasedByLabel}</div>
                      </>
                    ) : (
                      <span className="text-xs text-muteStrong">-</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {isReleased && row.releasedReason ? (
                      <div className="max-w-xs text-xs text-ink">
                        <p className="font-semibold text-inkStrong">{row.releasedReason}</p>
                        {row.notes ? <p className="mt-1 text-mute">{row.notes}</p> : null}
                      </div>
                    ) : row.notes ? (
                      <div className="max-w-xs text-xs text-mute">{row.notes}</div>
                    ) : (
                      <span className="text-xs text-muteStrong">-</span>
                    )}
                  </td>
                </>
              )

              const detail = (
                <div className="space-y-5">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mute">Detil Data</h4>
                    <div className="rounded-2xl border border-line bg-white overflow-x-auto">
                      <table className="data-table min-w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase tracking-[0.14em] text-muteStrong">
                            <th className="px-4 py-3 font-semibold">Teknisi</th>
                            <th className="px-4 py-3 font-semibold">Peran</th>
                            <th className="px-4 py-3 font-semibold">Ditugaskan Oleh</th>
                            <th className="px-4 py-3 font-semibold">Diterima Oleh</th>
                            <th className="px-4 py-3 font-semibold">Dilepas Oleh</th>
                            <th className="px-4 py-3 font-semibold">Alasan Release</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-4 py-3">{techLabel(row.technician)}</td>
                            <td className="px-4 py-3">{row.role || '-'}</td>
                            <td className="px-4 py-3">{assignedByLabel}</td>
                            <td className="px-4 py-3">{acceptedByLabel}</td>
                            <td className="px-4 py-3">{releasedByLabel}</td>
                            <td className="px-4 py-3">{row.releasedReason || row.notes || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muteStrong">
                    <span className="font-semibold uppercase tracking-[0.14em] text-mute">ID Penugasan</span>
                    <span className="font-mono text-ink tabular-nums">#{row.assignmentId}</span>
                    <span aria-hidden className="text-mute">•</span>
                    <span className="font-semibold uppercase tracking-[0.14em] text-mute">Status</span>
                    <span className="font-semibold text-inkStrong">{status.label}</span>
                    <span aria-hidden className="text-mute">•</span>
                    <span className="font-semibold uppercase tracking-[0.14em] text-mute">Primary</span>
                    <span className="font-semibold text-inkStrong">{row.isPrimary ? 'Ya (UTAMA)' : 'Tidak (Support)'}</span>
                    <span aria-hidden className="text-mute">•</span>
                    <span className="font-semibold uppercase tracking-[0.14em] text-mute">Ditugaskan</span>
                    <span className="font-mono text-ink tabular-nums">{formatDate(row.assignedAt)}</span>
                  </div>
                  <div className="border-t border-line pt-3">
                    <h5 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi</h5>
                    <div className="flex flex-wrap gap-3">
                      <AssignmentAcceptButton
                        assignmentId={row.assignmentId}
                        canAccept={canAccept}
                        reviewDbReady={reviewDbReady}
                        endpointBasePath={endpointBasePath}
                      />
                      <ReleaseAssignmentButton
                        assignmentId={row.assignmentId}
                        canRelease={canRelease}
                        reviewDbReady={reviewDbReady}
                        endpointBasePath={endpointBasePath}
                      />
                      <ReassignAssignmentModal
                        assignmentId={row.assignmentId}
                        canReassign={canReassign}
                        reviewDbReady={reviewDbReady}
                        currentTechnicianLabel={techLabel(row.technician)}
                        technicianOptions={technicianOptions}
                        endpointBasePath={endpointBasePath}
                      />
                    </div>
                  </div>
                </div>
              )

              return (
                <ExpandableRow
                  key={row.assignmentId}
                  id={String(row.assignmentId)}
                  num={idx + 1}
                  totalCols={totalCols}
                  compactRow={compactRow}
                  detail={detail}
                  tone={isReleased ? 'muted' : 'default'}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 lg:hidden">
        {assignments.map((row) => {
          const status = resolveAssignmentTone(row.status)
          const isReleased = row.status === 'RELEASED'
          const isSelf = sessionUserId != null && Number(row.technician.userId) === Number(sessionUserId)
          const canAccept = !isReleased && row.status === 'ASSIGNED' && sessionRole === 'FIELD_TECHNICIAN' && isSelf
          const canRelease = !isReleased && (hasFullAccess || (sessionRole === 'FIELD_TECHNICIAN' && isSelf))
          const canReassign = !isReleased && hasFullAccess
          return (
            <article key={row.assignmentId} className="rounded-2xl border border-line bg-cardSubtle p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-inkStrong">{techLabel(row.technician)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={status.tone} label={status.label} size="sm" uppercase />
                    {row.isPrimary ? (
                      <StatusBadge tone="warning" label="UTAMA" size="sm" />
                    ) : null}
                  </div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="uppercase tracking-wider text-muteStrong">Ditugaskan</dt>
                  <dd className="text-ink">{formatDate(row.assignedAt)} • {actorLabel(row.assignedBy)}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-muteStrong">Diterima</dt>
                  <dd className="text-ink">
                    {row.acceptedAt ? `${formatDate(row.acceptedAt)} • ${actorLabel(row.acceptedBy)}` : row.status === 'ASSIGNED' ? 'Belum diterima' : '-'}
                  </dd>
                </div>
                {isReleased ? (
                  <>
                    <div className="sm:col-span-2">
                      <dt className="uppercase tracking-wider text-muteStrong">Dilepas</dt>
                      <dd className="text-ink">
                        {formatDate(row.releasedAt)} • {actorLabel(row.releasedBy)}
                        {row.releasedReason ? ` • ${row.releasedReason}` : ''}
                      </dd>
                    </div>
                    {row.notes ? (
                      <div className="sm:col-span-2">
                        <dt className="uppercase tracking-wider text-muteStrong">Catatan</dt>
                        <dd className="text-mute">{row.notes}</dd>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AssignmentAcceptButton
                  assignmentId={row.assignmentId}
                  canAccept={canAccept}
                  reviewDbReady={reviewDbReady}
                  endpointBasePath={endpointBasePath}
                />
                <ReleaseAssignmentButton
                  assignmentId={row.assignmentId}
                  canRelease={canRelease}
                  reviewDbReady={reviewDbReady}
                  endpointBasePath={endpointBasePath}
                />
                <ReassignAssignmentModal
                  assignmentId={row.assignmentId}
                  canReassign={canReassign}
                  reviewDbReady={reviewDbReady}
                  currentTechnicianLabel={techLabel(row.technician)}
                  technicianOptions={technicianOptions}
                  endpointBasePath={endpointBasePath}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export { techLabel, actorLabel }
