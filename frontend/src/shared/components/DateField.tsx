/**
 * Usage: <DateField label="Start" name="start" />
 */
import type { InputHTMLAttributes } from 'react'

type DateFieldProps = {
  label: string
  error?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'>

export function DateField({
  label,
  error,
  className = '',
  id,
  name,
  ...rest
}: DateFieldProps) {
  const inputId = id ?? name

  return (
    <label className={className} htmlFor={inputId}>
      {label}
      <input id={inputId} name={name} type="date" {...rest} />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  )
}
