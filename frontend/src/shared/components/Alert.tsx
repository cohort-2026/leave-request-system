/**
 * Usage: <Alert tone="error">Unknown staff number.</Alert>
 */
import type { HTMLAttributes, ReactNode } from 'react'

export type AlertTone = 'info' | 'error'

type AlertProps = {
  tone?: AlertTone
  className?: string
  children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export function Alert({
  tone = 'info',
  className = '',
  children,
  role,
  ...rest
}: AlertProps) {
  const classes = ['alert', `alert-${tone}`, className].filter(Boolean).join(' ')

  return (
    <div
      role={role ?? (tone === 'error' ? 'alert' : 'status')}
      data-tone={tone}
      className={classes}
      {...rest}
    >
      {children}
    </div>
  )
}
