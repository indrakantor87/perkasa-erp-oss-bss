'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'icon'

export type ButtonSize = 'sm' | 'md' | 'lg'

type ExtraButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingLabel?: string
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  block?: boolean
  ariaLabel?: string
}

export type UiButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> &
  ExtraButtonProps & { className?: string }

function variantClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return 'btn-primary'
    case 'secondary':
      return 'btn-secondary'
    case 'ghost':
      return 'btn-ghost'
    case 'danger':
      return 'btn-danger'
    case 'success':
      return 'btn-success'
    case 'icon':
      return 'btn-secondary !p-0'
  }
}

function sizeClass(size: ButtonSize, variant: ButtonVariant): string {
  const iconVariant = variant === 'icon'
  switch (size) {
    case 'sm':
      return iconVariant ? 'h-9 w-9' : 'min-h-[2.25rem] px-3 text-[13px]'
    case 'lg':
      return iconVariant ? 'h-12 w-12' : 'min-h-[3.25rem] px-5 text-[15px]'
    case 'md':
    default:
      return iconVariant ? 'tap-44 h-11 w-11' : ''
  }
}

function ButtonSpinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin opacity-80"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

const UiButtonForward = forwardRef<HTMLButtonElement, UiButtonProps>(
  function UiButton(
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      loadingLabel,
      leadingIcon,
      trailingIcon,
      block = false,
      ariaLabel,
      type = 'button',
      disabled,
      children,
      className = '',
      onClick,
      ...rest
    },
    ref
  ) {
    const actuallyDisabled = disabled || loading
    const variantCls = variantClass(variant)
    const sizeCls = sizeClass(size, variant)
    const blockCls = block ? 'w-full' : ''
    const onClickHandler = actuallyDisabled
      ? undefined
      : onClick
    return (
      <button
        ref={ref}
        type={type}
        disabled={actuallyDisabled}
        aria-disabled={actuallyDisabled ? true : undefined}
        aria-busy={loading ? true : undefined}
        aria-label={ariaLabel}
        onClick={onClickHandler}
        className={[
          'btn-base',
          variantCls,
          sizeCls,
          blockCls,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? <ButtonSpinner /> : leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
        {loading && loadingLabel ? <span>{loadingLabel}</span> : children}
        {!loading && trailingIcon ? <span aria-hidden="true">{trailingIcon}</span> : null}
      </button>
    )
  }
)

export const UiButton = UiButtonForward

export function IconChevronDown({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function IconClose({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.22 6.22a.75.75 0 011.06 0L10 6.94l.72-.72a.75.75 0 111.06 1.06l-.72.72.72.72a.75.75 0 11-1.06 1.06L10 9.06l-.72.72a.75.75 0 01-1.06-1.06l.72-.72-.72-.72a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function IconPlus({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M10 4a.75.75 0 01.75.75V9.25h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5V4.75A.75.75 0 0110 4z"
        clipRule="evenodd"
      />
    </svg>
  )
}
