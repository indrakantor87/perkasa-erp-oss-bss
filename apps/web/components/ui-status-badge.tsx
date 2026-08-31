import type { ReactNode } from 'react'

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'error'
  | 'info'
  | 'neutral'
  | 'in_progress'
  | 'pending'
  | 'closed'
  | 'assigned'
  | 'accepted'
  | 'released'

type Size = 'sm' | 'md'

type StatusBadgeProps = {
  tone?: StatusTone
  label: string
  hideLabelVisually?: boolean
  icon?: ReactNode
  iconSide?: 'left' | 'right'
  size?: Size
  uppercase?: boolean
  className?: string
  ariaLabel?: string
  role?: string
}

function resolveSemanticTone(
  tone: StatusTone
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (tone) {
    case 'closed':
    case 'success':
    case 'accepted':
    case 'released':
      return tone === 'released' ? 'neutral' : 'success'
    case 'warning':
    case 'pending':
      return 'warning'
    case 'danger':
    case 'error':
      return 'danger'
    case 'info':
    case 'assigned':
    case 'in_progress':
      return 'info'
    case 'neutral':
    default:
      return 'neutral'
  }
}

function getToneClass(tone: StatusTone): string {
  const semantic = resolveSemanticTone(tone)
  switch (semantic) {
    case 'success':
      return 'status-chip-success bg-successSoft border-successLine text-successInk'
    case 'warning':
      return 'status-chip-warning bg-warningSoft border-warningLine text-warningInk'
    case 'danger':
      return 'status-chip-danger bg-dangerSoft border-dangerLine text-dangerInk'
    case 'info':
      return 'status-chip-info bg-infoSoft border-infoLine text-infoInk'
    case 'neutral':
    default:
      return 'status-chip-neutral bg-surfaceSoft border-line text-muteStrong'
  }
}

function DefaultIcon({ tone }: { tone: StatusTone }) {
  const semantic = resolveSemanticTone(tone)
  const common = 'h-3 w-3 shrink-0'
  switch (semantic) {
    case 'success':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 111.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'warning':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 7a1 1 0 100 2 1 1 0 000-2z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'danger':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'info':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'neutral':
    default:
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <circle cx="10" cy="10" r="5" />
        </svg>
      )
  }
}

export function StatusBadge({
  tone = 'neutral',
  label,
  hideLabelVisually = false,
  icon,
  iconSide = 'left',
  size = 'md',
  uppercase = true,
  className = '',
  ariaLabel,
  role,
}: StatusBadgeProps) {
  const toneClass = getToneClass(tone)
  const spacing = size === 'sm' ? 'gap-1 px-2.5 py-0.5 text-[10px]' : 'gap-1.5 px-3 py-1 text-xs'
  const iconNode = icon ?? <DefaultIcon tone={tone} />
  const labelNode = hideLabelVisually ? (
    <span className="sr-a11y">{label}</span>
  ) : (
    <span>{label}</span>
  )
  const tracking = uppercase ? 'tracking-[0.14em]' : 'tracking-normal'
  return (
    <span
      role={role}
      aria-label={ariaLabel ?? label}
      className={[
        'status-label inline-flex items-center rounded-full border font-semibold',
        uppercase ? 'uppercase' : '',
        spacing,
        tracking,
        toneClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {iconSide === 'left' ? iconNode : null}
      {labelNode}
      {iconSide === 'right' ? iconNode : null}
    </span>
  )
}

export function resolveStatusBadgeTone(raw: string | null | undefined): StatusTone {
  if (!raw) return 'neutral'
  const key = String(raw).toUpperCase()
  if (key === 'OPEN' || key === 'PENDING' || key === 'WAITING') return 'pending'
  if (key === 'IN_PROGRESS' || key === 'ON_PROGRESS' || key.startsWith('IN ')) return 'in_progress'
  if (key === 'ASSIGNED') return 'assigned'
  if (key === 'ACCEPTED' || key === 'DIKERJAKAN') return 'accepted'
  if (key === 'RELEASED' || key === 'RETURNED') return 'released'
  if (key === 'CLOSED' || key === 'RESOLVED' || key === 'DONE' || key === 'SUCCESS') return 'closed'
  if (key === 'CANCELLED' || key === 'REJECTED' || key === 'FAILED' || key === 'ERROR') return 'danger'
  if (key === 'WARNING' || key === 'AT_RISK' || key === 'SLA_BREACH') return 'warning'
  if (key === 'INFO' || key === 'QUEUED' || key === 'SCHEDULED') return 'info'
  if (key === 'SUCCESS') return 'success'
  return 'neutral'
}
