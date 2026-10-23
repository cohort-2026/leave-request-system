/**
 * Usage: <TextField label="Email" name="email" type="email" />
 */
import type { InputHTMLAttributes, ReactNode } from 'react'

type TextFieldProps = {
  label: string
  hint?: ReactNode
  error?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

export function TextField({
  label,
  hint,
  error,
  className = '',
  id,
  name,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? name
  const classes = ['field', className].filter(Boolean).join(' ')
  const describedBy = [
    ariaDescribedBy,
    hint ? `${inputId}-hint` : '',
    error ? `${inputId}-error` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={classes} htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        name={name}
        {...rest}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : ariaInvalid}
      />
      {hint ? (
        <span id={`${inputId}-hint`} className="field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${inputId}-error`} className="field-error">
          {error}
        </span>
      ) : null}
    </label>
  )
}
