/**
 * Usage: <EmptyState title="No leave requests" />
 */
import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const classes = ['empty-state', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="status">
      <p>{title}</p>
      {description ? <p className="muted">{description}</p> : null}
      {action ? <div className="actions">{action}</div> : null}
    </div>
  )
}
