/**
 * Usage: <StatusBadge status="pending" />
 */
import type { HTMLAttributes } from 'react'
import { Badge } from '../../components/ui/badge'


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
    if (status === 'cancelled') {
    return (
      <Badge
        variant="secondary"
        data-status={status}
        className={[
          'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {labels[status]}
      </Badge>
    )
  }

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
