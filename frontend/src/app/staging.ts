import type { Role, Session } from '../shared/types/session'

// Staging branch only. Keep this false on main.
export const STAGING_AUTH_BYPASS = true

const STORAGE_KEY = 'lrs_staging_role'

const STAGING_USERS: Record<Role, Omit<Session, 'role' | 'status'>> = {
  staff: {
    id: 1,
    email: 'staff@leave.local',
    displayName: 'Staff',
    companyId: 1,
    companyName: 'Acme',
  },
  manager: {
    id: 2,
    email: 'manager@leave.local',
    displayName: 'Manager',
    companyId: 1,
    companyName: 'Acme',
  },
  company_admin: {
    id: 3,
    email: 'admin@leave.local',
    displayName: 'Company admin',
    companyId: 1,
    companyName: 'Acme',
  },
  platform: {
    id: 4,
    email: 'platform@leave.local',
    displayName: 'Platform',
    companyId: null,
    companyName: null,
  },
}

export const STAGING_ROLES: Role[] = [
  'staff',
  'manager',
  'company_admin',
  'platform',
]

export function isStagingRole(value: string): value is Role {
  return STAGING_ROLES.includes(value as Role)
}

export function readStagingRole(): Role {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isStagingRole(stored)) {
      return stored
    }
  } catch {
    // Private mode can throw on localStorage.
  }
  return 'staff'
}

export function writeStagingRole(role: Role) {
  try {
    localStorage.setItem(STORAGE_KEY, role)
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function mockStagingSession(role: Role): Session {
  return {
    ...STAGING_USERS[role],
    role,
    status: 'active',
  }
}
