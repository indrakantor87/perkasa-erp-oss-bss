'use client'

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react'

type SharedFieldProps = {
  label?: string
  hint?: string
  error?: string
  id?: string
  block?: boolean
  required?: boolean
  wrapperClassName?: string
  hideLabel?: boolean
}

/* ---------------- TEXT / PASSWORD / SEARCH / NUMBER / DATE ---------------- */

export type UiInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'id'
> &
  SharedFieldProps & { className?: string }

const UiInputForward = forwardRef<HTMLInputElement, UiInputProps>(
  function UiInput(
    {
      label,
      hint,
      error,
      id,
      block = true,
      required,
      wrapperClassName = '',
      hideLabel,
      className = '',
      disabled,
      ...inputRest
    },
    ref
  ) {
    const inputId = id ?? inputRest.name ?? undefined
    return (
      <div className={['w-full', block ? '' : '', wrapperClassName].filter(Boolean).join(' ')}>
        {label ? (
          <label
            htmlFor={inputId}
            className={[
              'input-label',
              hideLabel ? 'sr-a11y' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
            {required ? <span aria-hidden="true" className="text-danger ml-0.5">*</span> : null}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          required={required}
          className={['input-base tap-44', className].filter(Boolean).join(' ')}
          {...inputRest}
        />
        {error ? (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            role="alert"
            className="mt-1.5 text-[12px] font-medium text-danger"
          >
            {error}
          </p>
        ) : null}
        {hint && !error ? (
          <p className="mt-1.5 text-[12px] text-mute">{hint}</p>
        ) : null}
      </div>
    )
  }
)

export const UiInput = UiInputForward

/* ---------------------------------- SELECT -------------------------------- */

export type UiSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'id'
> &
  SharedFieldProps & {
    className?: string
    children?: ReactNode
  }

const UiSelectForward = forwardRef<HTMLSelectElement, UiSelectProps>(
  function UiSelect(
    {
      label,
      hint,
      error,
      id,
      block = true,
      required,
      wrapperClassName = '',
      hideLabel,
      className = '',
      disabled,
      children,
      ...rest
    },
    ref
  ) {
    const inputId = id ?? rest.name ?? undefined
    return (
      <div className={['w-full', block ? '' : '', wrapperClassName].filter(Boolean).join(' ')}>
        {label ? (
          <label
            htmlFor={inputId}
            className={[
              'input-label',
              hideLabel ? 'sr-a11y' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
            {required ? <span aria-hidden="true" className="text-danger ml-0.5">*</span> : null}
          </label>
        ) : null}
        <select
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          required={required}
          className={['input-base tap-44 appearance-none pr-9 bg-[length:1.25rem_1.25rem] bg-no-repeat bg-[right_0.75rem_center]', className].filter(Boolean).join(' ')}
          {...rest}
        >
          {children}
        </select>
        {error ? (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            role="alert"
            className="mt-1.5 text-[12px] font-medium text-danger"
          >
            {error}
          </p>
        ) : null}
        {hint && !error ? (
          <p className="mt-1.5 text-[12px] text-mute">{hint}</p>
        ) : null}
      </div>
    )
  }
)

export const UiSelect = UiSelectForward

/* -------------------------------- TEXTAREA -------------------------------- */

export type UiTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'id'
> &
  SharedFieldProps & { className?: string }

const UiTextareaForward = forwardRef<HTMLTextAreaElement, UiTextareaProps>(
  function UiTextarea(
    {
      label,
      hint,
      error,
      id,
      block = true,
      required,
      wrapperClassName = '',
      hideLabel,
      className = '',
      disabled,
      ...rest
    },
    ref
  ) {
    const inputId = id ?? rest.name ?? undefined
    return (
      <div className={['w-full', block ? '' : '', wrapperClassName].filter(Boolean).join(' ')}>
        {label ? (
          <label
            htmlFor={inputId}
            className={[
              'input-label',
              hideLabel ? 'sr-a11y' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
            {required ? <span aria-hidden="true" className="text-danger ml-0.5">*</span> : null}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          required={required}
          className={[
            'input-base min-h-[6.5rem] py-3',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {error ? (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            role="alert"
            className="mt-1.5 text-[12px] font-medium text-danger"
          >
            {error}
          </p>
        ) : null}
        {hint && !error ? (
          <p className="mt-1.5 text-[12px] text-mute">{hint}</p>
        ) : null}
      </div>
    )
  }
)

export const UiTextarea = UiTextareaForward
