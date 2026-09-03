/**
 * Usage: <LeaveRequestRow request={row} onView={onView} />
 */
import { Button } from './Button'
import { StatusBadge, type RequestStatus } from './StatusBadge'

export type LeaveRequestSummary = {
  id: string
  requesterName: string
  leaveType: string
  startDate: string
  endDate: string
  status: RequestStatus
}

type LeaveRequestRowProps = {
  request: LeaveRequestSummary
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onView?: (id: string) => void
  className?: string
}

export function LeaveRequestRow({
  request,
  onApprove,
  onReject,
  onView,
  className = '',
}: LeaveRequestRowProps) {
  return (
    <>
      <td className={className}>{request.requesterName}</td>
      <td>{request.leaveType}</td>
      <td>
        {request.startDate} – {request.endDate}
      </td>
      <td>
        <StatusBadge status={request.status} />
      </td>
      <td>
        <div className="actions">
          {onView ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => onView(request.id)}
            >
              View
            </Button>
          ) : null}
          {onApprove && request.status === 'pending' ? (
            <Button
              variant="primary"
              type="button"
              onClick={() => onApprove(request.id)}
            >
              Approve
            </Button>
          ) : null}
          {onReject && request.status === 'pending' ? (
            <Button
              variant="danger"
              type="button"
              onClick={() => onReject(request.id)}
            >
              Reject
            </Button>
          ) : null}
        </div>
      </td>
    </>
  )
}
