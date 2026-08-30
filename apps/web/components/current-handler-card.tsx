import type { CurrentHandlerInfo } from '@/lib/services/tracking-service'

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

function getStatusBadge(status: 'ASSIGNED' | 'ACCEPTED'): { label: string; className: string } {
  if (status === 'ACCEPTED') {
    return {
      label: 'DIKERJAKAN',
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    }
  }
  return {
    label: 'MENUNGGU ACCEPT',
    className: 'bg-sky-50 text-sky-700 border border-sky-200',
  }
}

function getNextActionChip(tone?: 'info' | 'warning' | 'success' | 'default'): string {
  switch (tone) {
    case 'warning':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'info':
      return 'bg-sky-50 text-sky-700 border border-sky-200'
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200'
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
      <section className="rounded-3xl border border-line bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              Penanganan Saat Ini
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-lg font-semibold shrink-0">
                ?
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">Belum ada PIC</p>
                <p className="text-sm text-muted">Belum ada teknisi yang ditugaskan untuk ticket ini.</p>
              </div>
            </div>
            {nextActionLabel ? (
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getNextActionChip(nextActionTone)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                {nextActionLabel}
              </div>
            ) : null}
            {children ? <div className="mt-5">{children}</div> : null}
          </div>
        </div>
      </section>
    )
  }

  const badge = getStatusBadge(currentHandler.status)
  const display = currentHandler.displayName?.trim() || currentHandler.username || `User #${currentHandler.userId}`

  return (
    <section className={compact ? 'rounded-2xl border border-line bg-surface p-4' : 'rounded-3xl border border-line bg-surface p-5'}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white text-base font-semibold">
            {getInitials(currentHandler.displayName, currentHandler.username)}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
              Penanganan Saat Ini
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-lg font-bold text-slate-900">{display}</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            {currentHandler.username && (currentHandler.displayName?.trim() !== currentHandler.username.trim()) ? (
              <p className="mt-1 text-sm text-muted">@{currentHandler.username}</p>
            ) : null}
            <div className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400">Ditugaskan</span>
                <p className="font-medium text-slate-800">{formatDate(currentHandler.assignedAt)}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400">Diterima</span>
                <p className="font-medium text-slate-800">
                  {currentHandler.acceptedAt ? formatDate(currentHandler.acceptedAt) : '-'}
                </p>
              </div>
            </div>
            {nextActionLabel ? (
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getNextActionChip(nextActionTone)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                {nextActionLabel}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export { getInitials, formatDate }
