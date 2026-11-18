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
  | 'pending_hr'

const labels: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  waiting: 'Waiting',
  pending_hr: 'Awaiting HR',
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
  const tone = status === 'pending_hr' ? 'pending_hr' : status
  const classes = ['status-badge', `status-badge-${tone}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <span data-status={status} className={classes} {...rest}>
      {labels[status]}
    </span>
  )
}
