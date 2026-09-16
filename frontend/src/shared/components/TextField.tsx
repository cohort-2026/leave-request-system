/**
 * Usage: <TextField label="Email" name="email" type="email" />
 */
import type { InputHTMLAttributes, ReactNode } from 'react'

type TextFieldProps = {
  label: string
  error?: string
  className?: string
  trailingAction?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

export function TextField({
  label,
  error,
  className = '',
  trailingAction,
  id,
  name,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? name
  const errorId = `${inputId}-error`
  const classes = ['field', className].filter(Boolean).join(' ')

  return (
    <label className={classes} htmlFor={inputId}>
      {label}
      <span className="field-control">
        <input
          id={inputId}
          name={name}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {trailingAction}
      </span>
      {error ? (
        <span id={errorId} className="field-error">
          {error}
        </span>
      ) : null}
    </label>
  )
}
