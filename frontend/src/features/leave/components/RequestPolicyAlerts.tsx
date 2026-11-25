import { Ban, TriangleAlert, Users } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../../../components/ui/alert'
import { Badge } from '../../../components/ui/badge'
import type { LeavePolicyWarning, LeaveType } from '../leaveApi'
import {
  amberPolicyWarnings,
  unaffectedTypesSentence,
} from '../policyWarnings'

function warningTitle(kind: LeavePolicyWarning['kind']) {
  if (kind === 'block') return 'Blocked'
  if (kind === 'clash') return 'Staffing clash'
  return 'Warning'
}

export function RequestPolicyAlerts({
  warnings,
  leaveTypes,
}: {
  warnings: LeavePolicyWarning[]
  leaveTypes: LeaveType[]
}) {
  const blocked = warnings.filter((warning) => warning.kind === 'block')
  const amber = amberPolicyWarnings(warnings)

  if (blocked.length === 0 && amber.length === 0) return null

  return (
    <div className="grid gap-3">
      {blocked.map((warning, index) => (
        <Alert
          key={`${warning.kind}:${warning.message}`}
          variant="destructive"
          className="border-rose-300 bg-rose-50 text-rose-950"
        >
          <Ban />
          <AlertTitle className="flex items-center gap-2 line-clamp-none">
            Blocked
            <Badge className="border-rose-200 bg-rose-100 text-rose-900">
              Send disabled
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-rose-900">
            <p>{warning.message}</p>
            {index === 0 ? (
              <p>{unaffectedTypesSentence(leaveTypes)}</p>
            ) : null}
          </AlertDescription>
        </Alert>
      ))}
      {amber.map((warning) => (
        <Alert
          key={`${warning.kind}:${warning.message}`}
          className="border-amber-300 bg-amber-50 text-amber-950"
        >
          {warning.kind === 'clash' ? <Users /> : <TriangleAlert />}
          <AlertTitle>{warningTitle(warning.kind)}</AlertTitle>
          <AlertDescription className="text-amber-950">
            <p>{warning.message}</p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
