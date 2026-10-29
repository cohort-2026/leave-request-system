import { apiRequest } from '../../services/api'
import type { PublicUser } from './pages/usersApi'

export type Department = {
  id: number
  name: string
  managerId: number | null
  managerName: string | null
}

type DepartmentsResponse = {
  departments: Department[]
}

export function listDepartments() {
  return apiRequest<DepartmentsResponse>(
    '/api/companies/current/departments',
  ).then((body) => body.departments)
}

export function createDepartment(name: string) {
  return apiRequest<Department>('/api/companies/current/departments', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function updateDepartmentManager(
  id: number,
  managerId: number | null,
) {
  return apiRequest<Department>(
    `/api/companies/current/departments/${id}/manager`,
    {
      method: 'PATCH',
      body: JSON.stringify({ managerId }),
    },
  )
}

export function updateUserDepartment(
  id: number,
  departmentId: number | null,
) {
  return apiRequest<PublicUser>(`/api/users/${id}/department`, {
    method: 'PATCH',
    body: JSON.stringify({ departmentId }),
  })
}