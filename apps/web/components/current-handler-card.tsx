import type { CurrentHandlerInfo } from '@/lib/services/tracking-service'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'

type CurrentHandlerCardProps = {
  currentHandler: CurrentHandlerInfo | null
  nextActionLabel?: string
  nextActionTone?: 'info' | 'warning' | 'success' | 'default'
  reviewDbReady: boolean
  endpointBasePath: string
  canAccept?: boolean
  canRelease?: boolean
  canReassign?: boolean
  children?: React.ReactNode
  compact?: boolean
}

function resolveNextActionTone(tone?: 'info' | 'warning' | 'success' | 'default'): StatusTone {
  switch (tone) {
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
    case 'success':
      return 'success'
    default:
      return 'neutral'
  }
}

function getInitials(displayName: string | null, username: string): string {
  const text = String(displayName ?? username ?? 'U').trim()
  if (!text) return 'U'
  const parts = text.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return text.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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

export function CurrentHandlerCard({
  currentHandler,
  nextActionLabel,
  nextActionTone,
  children,
  compact = false,
}: CurrentHandlerCardProps) {
  if (!currentHandler) {
    return (
      <section aria-label="Current handler panel" className={compact ? 'card-tier-2 border border-line p-4' : 'card-tier-2 border border-line p-5'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
              Penanganan Saat Ini
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surfaceStrong text-muteStrong text-lg font-semibold" aria-hidden="true">
                ?
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-inkStrong">Belum ada PIC</p>
                <p className="text-sm text-mute">Belum ada teknisi yang ditugaskan untuk ticket ini.</p>
              </div>
            </div>
            {nextActionLabel ? (
              <div className="mt-4">
                <StatusBadge tone={resolveNextActionTone(nextActionTone)} label={nextActionLabel} size="sm" uppercase />
              </div>
            ) : null}
            {children ? <div className="mt-5">{children}</div> : null}
          </div>
        </div>
      </section>
    )
  }

  const statusTone: StatusTone = currentHandler.status === 'ACCEPTED' ? 'accepted' : 'assigned'
  const statusLabel = currentHandler.status === 'ACCEPTED' ? 'DIKERJAKAN' : 'MENUNGGU ACCEPT'
  const display = currentHandler.displayName?.trim() || currentHandler.username || `User #${currentHandler.userId}`

  return (
    <section aria-label="Current handler panel" className={compact ? 'card-tier-2 border border-line p-4' : 'card-tier-2 border border-line p-5'}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accentInk text-base font-semibold"
          >
            {getInitials(currentHandler.displayName, currentHandler.username)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
              Penanganan Saat Ini
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-lg font-bold text-inkStrong truncate">{display}</p>
              <StatusBadge tone={statusTone} label={statusLabel} size="sm" uppercase ariaLabel={`Status penanganan: ${statusLabel}`} />
            </div>
            {currentHandler.username && (currentHandler.displayName?.trim() !== currentHandler.username.trim()) ? (
              <p className="mt-1 text-sm text-mute">@{currentHandler.username}</p>
            ) : null}
            <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-mute">Ditugaskan</p>
                <p className="font-medium text-ink">{formatDate(currentHandler.assignedAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-mute">Diterima</p>
                <p className="font-medium text-ink">
                  {currentHandler.acceptedAt ? formatDate(currentHandler.acceptedAt) : '-'}
                </p>
              </div>
            </div>
            {nextActionLabel ? (
              <div className="mt-4">
                <StatusBadge tone={resolveNextActionTone(nextActionTone)} label={nextActionLabel} size="sm" uppercase />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export { getInitials, formatDate }
