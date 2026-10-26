// Data layer for the People pages (issue #127).
// ASSUMPTIONS to check against the backend promote/demote issue:
//   GET   /api/company/users            -> PublicUser[]  (or { users: PublicUser[] })
//   GET   /api/company/users/:id        -> PublicUser    (or { user: PublicUser })
//   PATCH /api/company/users/:id/role   body { role }    -> PublicUser (or { user })
// Cookies/session are sent with credentials: 'include'. If your app already has
// an API client, replace `request` below with it and keep the rest.
//
// Set VITE_USE_MOCK_USERS=true in .env.local to use the in-memory mock instead.

export type Role = 'staff' | 'manager' | 'company_admin'

export const ROLES: Role[] = ['staff', 'manager', 'company_admin']

export const roleLabel: Record<Role, string> = {
  staff: 'Staff',
  manager: 'Manager',
  company_admin: 'Company admin',
}

export type PublicUser = {
  id: string
  name: string
  email?: string
  role: Role
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK_USERS === 'true'

// ---------- live API ----------

function fallbackMessage(status: number): string {
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'That person could not be found.'
  if (status === 409) return 'That change is not allowed.'
  return `Something went wrong (${status}). Please try again.`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.')
  }

  if (!res.ok) {
    let message = fallbackMessage(res.status)
    try {
      const body = await res.json()
      const fromServer = body?.error?.message ?? body?.message ?? body?.error
      if (typeof fromServer === 'string' && fromServer) message = fromServer
    } catch {
      // body was not JSON; keep the fallback message
    }
    throw new ApiError(res.status, message)
  }

  return (await res.json()) as T
}

// ---------- mock (matches the public user JSON above) ----------

let mockUsers: PublicUser[] = [
  { id: 'u-thandi', name: 'Thandi Nkosi', email: 'thandi@example.com', role: 'staff' },
  { id: 'u-sipho', name: 'Sipho Dlamini', email: 'sipho@example.com', role: 'manager' },
  { id: 'u-lebo', name: 'Lebo Maseko', email: 'lebo@example.com', role: 'company_admin' },
]

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

async function mockList(): Promise<PublicUser[]> {
  await delay()
  return mockUsers.map((u) => ({ ...u }))
}

async function mockGet(id: string): Promise<PublicUser> {
  await delay()
  const found = mockUsers.find((u) => u.id === id)
  if (!found) throw new ApiError(404, 'That person could not be found.')
  return { ...found }
}

async function mockSetRole(id: string, role: Role): Promise<PublicUser> {
  await delay()
  const found = mockUsers.find((u) => u.id === id)
  if (!found) throw new ApiError(404, 'That person could not be found.')
  const admins = mockUsers.filter((u) => u.role === 'company_admin')
  if (found.role === 'company_admin' && role !== 'company_admin' && admins.length === 1) {
    throw new ApiError(409, 'A company must keep at least one company admin.')
  }
  found.role = role
  return { ...found }
}

// ---------- public functions ----------

function unwrapList(body: PublicUser[] | { users: PublicUser[] }): PublicUser[] {
  return Array.isArray(body) ? body : body.users
}

function unwrapUser(body: PublicUser | { user: PublicUser }): PublicUser {
  return 'user' in body ? body.user : body
}

export async function listCompanyUsers(): Promise<PublicUser[]> {
  if (USE_MOCK) return mockList()
  return unwrapList(await request('/api/company/users'))
}

export async function getCompanyUser(id: string): Promise<PublicUser> {
  if (USE_MOCK) return mockGet(id)
  return unwrapUser(await request(`/api/company/users/${encodeURIComponent(id)}`))
}

export async function updateUserRole(id: string, role: Role): Promise<PublicUser> {
  if (USE_MOCK) return mockSetRole(id, role)
  return unwrapUser(
    await request(`/api/company/users/${encodeURIComponent(id)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  )
}
