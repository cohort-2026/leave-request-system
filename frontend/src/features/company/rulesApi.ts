import { apiRequest } from '../../services/api'

export type StaffReviewer = 'manager' | 'company_admin'

export type CompanyLeaveRules = {
  staffReviewer: StaffReviewer
  managerReviewer: 'company_admin'
  minNoticeDays: number
  escalateAfterHours: number
  autoApproveAfterHours: number
}

export function getCompanyLeaveRules() {
  return apiRequest<CompanyLeaveRules>('/api/companies/current/rules')
}

export function saveCompanyLeaveRules(rules: CompanyLeaveRules) {
  return apiRequest<CompanyLeaveRules>('/api/companies/current/rules', {
    method: 'PATCH',
    body: JSON.stringify(rules),
  })
}
