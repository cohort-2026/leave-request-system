export type Role = 'staff' | 'manager' | 'company_admin' | 'platform'

export type AccountStatus =
  | 'pending_verification'
  | 'pending_approval'
  | 'active'

export type Session = {
  displayName: string
  role: Role
  status: AccountStatus
  companyName: string | null
}

export const roleLabel: Record<Role, string> = {
  staff: 'Staff',
  manager: 'Manager',
  company_admin: 'Company admin',
  platform: 'Platform',
}
