'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ShellIconButtonVariant = 'soft' | 'surface' | 'ghost' | 'accent'
export type ShellIconButtonSize = 'sm' | 'md'

type ExtraProps = {
  variant?: ShellIconButtonVariant
  size?: ShellIconButtonSize
  label: string
  active?: boolean
  icon: ReactNode
}

export type ShellIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'children' | 'aria-label'
> &
  ExtraProps & { className?: string }

const ShellIconButtonForward = forwardRef<HTMLButtonElement, ShellIconButtonProps>(
  function ShellIconButton(
    {
      variant = 'surface',
      size = 'md',
      label,
      active,
      icon,
      className = '',
      disabled,
      type = 'button',
      onClick,
      ...rest
    },
    ref
  ) {
    const sizePx = size === 'sm' ? 'h-10 w-10' : 'tap-44 h-11 w-11'

    const variantClass = (() => {
      switch (variant) {
        case 'accent':
          return active
            ? 'bg-accent text-accentInk border-transparent shadow-card'
            : 'bg-surfaceSoft text-ink border-line hover:[border-color:var(--color-line-strong)]'
        case 'ghost':
          return active
            ? 'bg-surfaceSoft text-ink border-transparent'
            : 'bg-transparent text-mute hover:text-ink hover:bg-surfaceSoft border-transparent'
        case 'soft':
          return active
            ? 'bg-surfaceElevated text-ink border-line shadow-soft'
            : 'bg-surfaceSoft text-ink border-line hover:[border-color:var(--color-line-strong)]'
        case 'surface':
        default:
          return active
            ? 'bg-surfaceElevated text-ink border-line shadow-soft'
            : 'bg-surface text-ink border-line hover:bg-surfaceSoft hover:[border-color:var(--color-line-strong)]'
      }
    })()

    return (
      <button
        ref={ref}
        type={type}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active ? 'true' : undefined}
        title={label}
        className={[
          'btn-base !rounded-full',
          sizePx,
          '!p-0 inline-flex items-center justify-center border duration-fast ui-standard',
          'shrink-0 focus-visible:shadow-focus',
          variantClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <span aria-hidden="true" className="inline-flex items-center justify-center">
          {icon}
        </span>
        <span className="sr-a11y">{label}</span>
      </button>
    )
  }
)

export const ShellIconButton = ShellIconButtonForward

export function IconSun({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export function IconMoon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
    </svg>
  )
}

export function IconSearch({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconChevronDown({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function IconChevronRight({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function IconChevronLeft({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  )
}

export function IconClose({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function IconMenu({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconBell({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

export function IconLogout({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function IconLanguage({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20z" />
    </svg>
  )
}

export function IconAvatar({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
