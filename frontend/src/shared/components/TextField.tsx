/**
 * Usage: <TextField label="Email" name="email" type="email" />
 */
import type { InputHTMLAttributes } from 'react'

type TextFieldProps = {
  label: string
  error?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

export function TextField({
  label,
  error,
  className = '',
  id,
  name,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? name
  const classes = ['field', className].filter(Boolean).join(' ')

  return (
    <label className={classes} htmlFor={inputId}>
      {label}
      <input id={inputId} name={name} {...rest} />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  )
}
