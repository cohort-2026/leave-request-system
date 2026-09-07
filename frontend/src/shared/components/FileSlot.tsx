/**
 * Usage: <FileSlot label="Supporting file" name="attachment" />
 */
import type { InputHTMLAttributes } from 'react'

type FileSlotProps = {
  label: string
  error?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'>

export function FileSlot({
  label,
  error,
  className = '',
  id,
  name,
  ...rest
}: FileSlotProps) {
  const inputId = id ?? name

  return (
    <label className={className} htmlFor={inputId}>
      {label}
      <input id={inputId} name={name} type="file" {...rest} />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  )
}
