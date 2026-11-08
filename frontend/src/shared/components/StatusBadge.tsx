/**
 * Usage: <StatusBadge status="pending" />
 */
import type { HTMLAttributes } from 'react'

export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'waiting'

const labels: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  waiting: 'Waiting',
}

type StatusBadgeProps = {
  status: RequestStatus
  className?: string
} & Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'children'>

export function StatusBadge({
  status,
  className = '',
  ...rest
}: StatusBadgeProps) {
  const classes = ['status-badge', `status-badge-${status}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <span data-status={status} className={classes} {...rest}>
      {labels[status]}
    </span>
  )
}
