export type Role = 'staff' | 'manager' | 'company_admin' | 'platform'

export type AccountStatus =
  | 'pending_verification'
  | 'pending_approval'
  | 'active'

export type Session = {
  id: number
  email: string
  displayName: string
  role: Role
  status: AccountStatus
  companyId: number | null
  companyName: string | null
}

export const roleLabel: Record<Role, string> = {
  staff: 'Staff',
  manager: 'Manager',
  company_admin: 'Company admin',
  platform: 'Platform',
}
