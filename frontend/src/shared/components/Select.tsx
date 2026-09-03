/**
 * Usage: <Select label="Leave type" name="leaveType"><option>Annual</option></Select>
 */
import type { ReactNode, SelectHTMLAttributes } from 'react'

type SelectProps = {
  label: string
  error?: string
  className?: string
  children: ReactNode
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>

export function Select({
  label,
  error,
  className = '',
  id,
  name,
  children,
  ...rest
}: SelectProps) {
  const selectId = id ?? name
  const classes = ['field', className].filter(Boolean).join(' ')

  return (
    <label className={classes} htmlFor={selectId}>
      {label}
      <select id={selectId} name={name} {...rest}>
        {children}
      </select>
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  )
}
