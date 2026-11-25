import type {
  LeaveApprovalStep,
  LeavePolicyWarning,
  LeavePreviewResponse,
  LeaveType,
  LeaveWarningKind,
} from './leaveApi'

const FALLBACK_UNAFFECTED_TYPES = ['Sick', 'Family responsibility']

function isLeaveWarningKind(value: unknown): value is LeaveWarningKind {
  return value === 'block' || value === 'warn' || value === 'clash'
}

export function parsePolicyWarnings(
  warnings: LeavePreviewResponse['warnings'],
): LeavePolicyWarning[] {
  if (!Array.isArray(warnings)) return []

  return warnings.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    if (!isLeaveWarningKind(item.kind)) return []
    if (typeof item.message !== 'string') return []
    const message = item.message.trim()
    if (!message) return []
    return [{ kind: item.kind, message }]
  })
}

export function firstBlockWarning(warnings: LeavePolicyWarning[]) {
  return warnings.find((warning) => warning.kind === 'block')
}

export function amberPolicyWarnings(warnings: LeavePolicyWarning[]) {
  return warnings.filter(
    (warning) => warning.kind === 'warn' || warning.kind === 'clash',
  )
}

export function typesUnaffectedByBlocks(types: LeaveType[]): string[] {
  const named = types
    .filter((type) => type.ignoresBlocks)
    .map((type) => type.name.trim())
    .filter(Boolean)
  if (named.length > 0) return named

  const byName = types
    .filter((type) => {
      const name = type.name.toLowerCase()
      return name === 'sick' || name === 'family responsibility'
    })
    .map((type) => type.name.trim())
    .filter(Boolean)
  return byName.length > 0 ? byName : FALLBACK_UNAFFECTED_TYPES
}

export function unaffectedTypesSentence(types: LeaveType[]): string {
  const names = typesUnaffectedByBlocks(types)
  if (names.length === 1) {
    return `${names[0]} can still be requested on these dates.`
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} can still be requested on these dates.`
  }
  const last = names[names.length - 1]
  return `${names.slice(0, -1).join(', ')}, and ${last} can still be requested on these dates.`
}

export function approvalStepsFrom(
  preview: LeavePreviewResponse | undefined,
): LeaveApprovalStep[] {
  if (!preview) return []
  const steps = preview.approvalSteps
  if (Array.isArray(steps) && steps.length > 0) {
    return steps.flatMap((step) => {
      if (!step || typeof step !== 'object') return []
      if (typeof step.name !== 'string' || !step.name.trim()) return []
      return [
        {
          name: step.name.trim(),
          reason:
            typeof step.reason === 'string' && step.reason.trim()
              ? step.reason.trim()
              : null,
        },
      ]
    })
  }

  const name =
    preview.approverName ?? preview.approver ?? preview.reviewerName ?? null
  return typeof name === 'string' && name.trim()
    ? [{ name: name.trim() }]
    : []
}

export function approvalStepsSentence(steps: LeaveApprovalStep[]): string | null {
  if (steps.length === 0) return null
  const names = steps.map((step) => step.name)
  const reason = steps.map((step) => step.reason).find(Boolean)
  const chain =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')}, then ${names[names.length - 1]}`
  return reason ? `${chain}, ${reason}` : chain
}
