import { apiRequest } from '../../../services/api'
import type { AccountStatus, Role } from '../../../shared/types/session'

export type AssignableRole = 'staff' | 'manager' | 'company_admin'

export const ASSIGNABLE_ROLES: AssignableRole[] = [
  'staff',
  'manager',
  'company_admin',
]

export type PublicUser = {
  id: number
  email: string
  role: Role
  displayName: string
  status: AccountStatus
  companyName: string | null
  departmentId: number | null
  departmentName: string | null
}

type UsersListResponse = {
  users: PublicUser[]
}

export function isAssignableRole(value: string): value is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value)
}

export function listCompanyUsers() {
  return apiRequest<UsersListResponse>('/api/companies/current/users').then(
    (body) => body.users,
  )
}

export function getCompanyUser(id: number) {
  return apiRequest<PublicUser>(`/api/users/${id}`)
}

export function updateUserRole(id: number, role: AssignableRole) {
  return apiRequest<PublicUser>(`/api/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}
