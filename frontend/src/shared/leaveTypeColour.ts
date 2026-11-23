export type LeaveTypeColour =
  | 'violet'
  | 'rose'
  | 'amber'
  | 'sky'
  | 'slate'
  | 'teal'

export function leaveTypeColour(leaveType: string): LeaveTypeColour {
  const name = leaveType.toLowerCase()
  if (name.includes('annual')) return 'violet'
  if (name.includes('sick')) return 'rose'
  if (name.includes('family')) return 'amber'
  if (name.includes('parental')) return 'sky'
  if (name.includes('unpaid')) return 'slate'
  if (name.includes('study')) return 'teal'
  return 'slate'
}

export const leaveTypeDotClass: Record<LeaveTypeColour, string> = {
  violet: 'bg-leave-annual',
  rose: 'bg-leave-sick',
  amber: 'bg-leave-family',
  sky: 'bg-leave-parental',
  slate: 'bg-leave-unpaid',
  teal: 'bg-leave-study',
}
