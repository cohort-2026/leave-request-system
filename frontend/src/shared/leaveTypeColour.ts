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

export const leaveTypeChipClass: Record<LeaveTypeColour, string> = {
  violet: 'bg-violet-100 text-violet-800',
  rose: 'bg-rose-100 text-rose-800',
  amber: 'bg-amber-100 text-amber-800',
  sky: 'bg-sky-100 text-sky-800',
  slate: 'bg-slate-100 text-slate-700',
  teal: 'bg-teal-100 text-teal-800',
}

export const leaveTypePendingChipClass: Record<LeaveTypeColour, string> = {
  violet: 'border border-dashed border-violet-400 bg-transparent text-violet-800',
  rose: 'border border-dashed border-rose-400 bg-transparent text-rose-800',
  amber: 'border border-dashed border-amber-400 bg-transparent text-amber-800',
  sky: 'border border-dashed border-sky-400 bg-transparent text-sky-800',
  slate: 'border border-dashed border-slate-400 bg-transparent text-slate-700',
  teal: 'border border-dashed border-teal-400 bg-transparent text-teal-800',
}
