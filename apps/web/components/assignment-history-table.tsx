import { AssignmentAcceptButton } from '@/components/assignment-accept-button'
import { ReleaseAssignmentButton } from '@/components/release-assignment-button'
import { ReassignAssignmentModal, type TechnicianOption } from '@/components/reassign-assignment-modal'
import type { AssignmentHistoryItem } from '@/lib/services/tracking-service'

type AssignmentHistoryTableProps = {
  assignments: AssignmentHistoryItem[]
  reviewDbReady: boolean
  endpointBasePath: string
  sessionRole: string
  sessionUserId: number | null
  technicianOptions: TechnicianOption[]
}

function getAssignmentStatusBadge(status: 'ASSIGNED' | 'ACCEPTED' | 'RELEASED'): { label: string; className: string } {
  switch (status) {
    case 'ACCEPTED':
      return {
        label: 'ACCEPTED',
        className: 'inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700',
      }
    case 'RELEASED':
      return {
        label: 'RELEASED',
        className: 'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600',
      }
    default:
      return {
        label: 'ASSIGNED',
        className: 'inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700',
      }
  }
}

const P58A_FULL_ACCESS_ROLES = new Set(['OWNER', 'SUPER_ADMIN', 'ADMIN', 'NOC_OPERATOR', 'TT_OPERATOR'])

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
      <section className="rounded-3xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Riwayat Penugasan
        </p>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-600">Belum ada riwayat penugasan</p>
          <p className="mt-1 text-xs text-slate-500">
            Ticket ini belum pernah ditugaskan ke teknisi lapangan.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Riwayat Penugasan
          </p>
          <p className="mt-1 text-xs text-slate-500">{assignments.length} total riwayat penugasan</p>
        </div>
      </div>

      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <th className="border-b border-line px-3 py-3 font-semibold">Teknisi</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Peran</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Status</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Primary</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Ditugaskan</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Acceptance</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Released</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Alasan / Actor</th>
              <th className="border-b border-line px-3 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((row) => {
              const statusBadge = getAssignmentStatusBadge(row.status)
              const isReleased = row.status === 'RELEASED'
              const isSelf = sessionUserId != null && Number(row.technician.userId) === Number(sessionUserId)
              const canAccept = !isReleased && row.status === 'ASSIGNED' && sessionRole === 'FIELD_TECHNICIAN' && isSelf
              const canRelease = !isReleased && (hasFullAccess || (sessionRole === 'FIELD_TECHNICIAN' && isSelf))
              const canReassign = !isReleased && hasFullAccess
              const assignedByLabel = actorLabel(row.assignedBy)
              const acceptedByLabel = actorLabel(row.acceptedBy)
              const releasedByLabel = actorLabel(row.releasedBy)

              return (
                <tr key={row.assignmentId} className="align-top">
                  <td className="border-b border-line px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">{techLabel(row.technician)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">User #{row.technician.userId}</div>
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-600">{row.role || '-'}</span>
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <span className={statusBadge.className}>{statusBadge.label}</span>
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {row.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        ★ UTAMA
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Support</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <div className="text-sm text-slate-800">{formatDate(row.assignedAt)}</div>
                    <div className="mt-0.5 text-xs text-slate-500">Oleh: {assignedByLabel}</div>
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {row.status === 'ACCEPTED' ? (
                      <>
                        <div className="text-sm text-slate-800">{formatDate(row.acceptedAt)}</div>
                        <div className="mt-0.5 text-xs text-slate-500">Oleh: {acceptedByLabel}</div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">{row.status === 'ASSIGNED' ? 'Belum diterima' : '-'}</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {isReleased ? (
                      <>
                        <div className="text-sm text-slate-800">{formatDate(row.releasedAt)}</div>
                        <div className="mt-0.5 text-xs text-slate-500">Oleh: {releasedByLabel}</div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    {isReleased && row.releasedReason ? (
                      <div className="max-w-xs text-xs text-slate-600">
                        <p className="font-semibold text-slate-700">{row.releasedReason}</p>
                        {row.notes ? <p className="mt-1 text-slate-500">{row.notes}</p> : null}
                      </div>
                    ) : row.notes ? (
                      <div className="max-w-xs text-xs text-slate-500">{row.notes}</div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="border-b border-line px-3 py-3">
                    <div className="flex flex-col items-end gap-2 whitespace-nowrap">
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 lg:hidden">
        {assignments.map((row) => {
          const statusBadge = getAssignmentStatusBadge(row.status)
          const isReleased = row.status === 'RELEASED'
          const isSelf = sessionUserId != null && Number(row.technician.userId) === Number(sessionUserId)
          const canAccept = !isReleased && row.status === 'ASSIGNED' && sessionRole === 'FIELD_TECHNICIAN' && isSelf
          const canRelease = !isReleased && (hasFullAccess || (sessionRole === 'FIELD_TECHNICIAN' && isSelf))
          const canReassign = !isReleased && hasFullAccess
          return (
            <article key={row.assignmentId} className="rounded-2xl border border-line bg-slate-50/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{techLabel(row.technician)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={statusBadge.className}>{statusBadge.label}</span>
                    {row.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        ★ UTAMA
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="uppercase tracking-wider text-slate-400">Ditugaskan</dt>
                  <dd className="text-slate-700">{formatDate(row.assignedAt)} • {actorLabel(row.assignedBy)}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider text-slate-400">Diterima</dt>
                  <dd className="text-slate-700">
                    {row.acceptedAt ? `${formatDate(row.acceptedAt)} • ${actorLabel(row.acceptedBy)}` : row.status === 'ASSIGNED' ? 'Belum diterima' : '-'}
                  </dd>
                </div>
                {isReleased ? (
                  <>
                    <div className="sm:col-span-2">
                      <dt className="uppercase tracking-wider text-slate-400">Dilepas</dt>
                      <dd className="text-slate-700">
                        {formatDate(row.releasedAt)} • {actorLabel(row.releasedBy)}
                        {row.releasedReason ? ` • ${row.releasedReason}` : ''}
                      </dd>
                    </div>
                    {row.notes ? (
                      <div className="sm:col-span-2">
                        <dt className="uppercase tracking-wider text-slate-400">Catatan</dt>
                        <dd className="text-slate-600">{row.notes}</dd>
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
