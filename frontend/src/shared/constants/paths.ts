import type { Role } from '../types/session'

export const paths = {
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  register: '/register',
  startCompany: '/start-company',
  startCompanyPay: '/start-company/pay',
  pricing: '/pricing',
  onboardDisabled: '/onboard/disabled',
  onboard: '/onboard/:token',
  verify: '/verify',
  resetAuthenticator: '/reset-authenticator',
  profile: '/profile',
  forbidden: '/forbidden',
  pendingApproval: '/pending-approval',
  home: '/',
  leave: '/leave',
  leaveNew: '/leave/new',
  leaveDetail: '/leave/:id',
  calendar: '/calendar',
  teamQueue: '/team/queue',
  teamReview: '/team/queue/:id',
  adminUsers: '/admin/users',
  adminUser: '/admin/users/:id',
  adminApprovals: '/admin/approvals',
  adminRules: '/admin/rules',
  adminImport: '/admin/import',
  adminDepartments: '/admin/departments',
  adminLeaveTypes: '/admin/leave-types',
  adminCalendarSettings: '/admin/calendar-settings',
  adminBlocks: '/admin/blocks',
  adminOnboarding: '/admin/onboarding',
  adminSso: '/admin/sso',
  platform: '/platform',
  platformNewCompany: '/platform/companies/new',
} as const

export function onboardPath(token: string) {
  return `/onboard/${token}`
}

export function leaveDetailPath(id: string) {
  return `/leave/${id}`
}

export function teamReviewPath(id: string) {
  return `/team/queue/${id}`
}

export function adminUserPath(id: string) {
  return `/admin/users/${id}`
}

export function homeFor(role: Role) {
  return role === 'platform' ? paths.platform : paths.home
}
