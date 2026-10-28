import { useEffect, useState, type FormEvent } from 'react'
import { PageShell } from '../../../app/layouts/PageShell'
import { ApiError } from '../../../services/api'
import {
  Alert,
  Button,
  DataTable,
  Select,
  TextField,
  type DataTableColumn,
} from '../../../shared/components'
import {
  createDepartment,
  listDepartments,
  updateDepartmentManager,
  type Department,
} from '../departmentsApi'
import { listCompanyUsers, type PublicUser } from './usersApi'

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

const departmentColumns = (
  managers: PublicUser[],
  managerSelections: Record<number, string>,
  savingDepartmentId: number | null,
  onManagerChange: (departmentId: number, managerId: string) => void,
  onManagerSubmit: (
    event: FormEvent<HTMLFormElement>,
    department: Department,
  ) => void,
): DataTableColumn<Department>[] => [
  {
    key: 'name',
    header: 'Department',
    render: (department) => department.name,
  },
  {
    key: 'manager',
    header: 'Manager',
    render: (department) => (
      <form
        className="flex items-end gap-stack"
        onSubmit={(event) => onManagerSubmit(event, department)}
      >
        <Select
          label={`Manager for ${department.name}`}
          name={`manager-${department.id}`}
          value={managerSelections[department.id] ?? ''}
          disabled={savingDepartmentId !== null}
          onChange={(event) =>
            onManagerChange(department.id, event.target.value)
          }
        >
          <option value="">Unassigned</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.displayName}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          variant="secondary"
          disabled={
            savingDepartmentId !== null ||
            (managerSelections[department.id] ?? '') ===
              (department.managerId === null
                ? ''
                : String(department.managerId))
          }
        >
          {savingDepartmentId === department.id ? 'Saving…' : 'Set manager'}
        </Button>
      </form>
    ),
  },
]

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [managers, setManagers] = useState<PublicUser[]>([])
  const [managerSelections, setManagerSelections] = useState<
    Record<number, string>
  >({})
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [savingDepartmentId, setSavingDepartmentId] = useState<number | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false

    Promise.all([listDepartments(), listCompanyUsers()])
      .then(([loadedDepartments, users]) => {
        if (cancelled) return
        setDepartments(loadedDepartments)
        setManagers(users.filter((user) => user.role === 'manager'))
        setManagerSelections(
          Object.fromEntries(
            loadedDepartments.map((department) => [
              department.id,
              department.managerId === null
                ? ''
                : String(department.managerId),
            ]),
          ),
        )
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            getErrorMessage(error, 'Could not load departments or managers.'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setSaveError(null)
    setSavedMessage(null)
    try {
      const created = await createDepartment(name)
      setDepartments((current) => [...current, created])
      setManagerSelections((current) => ({ ...current, [created.id]: '' }))
      setName('')
      setSavedMessage('Department created.')
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, 'Could not create department.'))
    } finally {
      setCreating(false)
    }
  }

  async function handleManagerSubmit(
    event: FormEvent<HTMLFormElement>,
    department: Department,
  ) {
    event.preventDefault()
    const selection = managerSelections[department.id] ?? ''
    const managerId = selection ? Number(selection) : null
    setSavingDepartmentId(department.id)
    setSaveError(null)
    setSavedMessage(null)
    try {
      const updated = await updateDepartmentManager(department.id, managerId)
      setDepartments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setSavedMessage(`Manager updated for ${updated.name}.`)
    } catch (error: unknown) {
      setSaveError(getErrorMessage(error, 'Could not set the manager.'))
    } finally {
      setSavingDepartmentId(null)
    }
  }

  return (
    <PageShell title="Departments" eyebrow="Company admin">
      <p className="muted">Teams in this company, and who manages each team.</p>
      {loadError ? <Alert tone="error">{loadError}</Alert> : null}
      {saveError ? <Alert tone="error">{saveError}</Alert> : null}
      {savedMessage ? <Alert tone="success">{savedMessage}</Alert> : null}

      <form className="flex flex-col gap-stack" onSubmit={handleCreate}>
        <TextField
          label="Department name"
          name="departmentName"
          value={name}
          maxLength={80}
          required
          onChange={(event) => setName(event.target.value)}
          disabled={creating}
        />
        <Button type="submit" disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'Create department'}
        </Button>
      </form>

      {loading ? (
        <p className="muted">Loading departments…</p>
      ) : loadError ? null : (
        <DataTable
          data={departments}
          keyExtractor={(department) => String(department.id)}
          emptyTitle="No departments"
          emptyDescription="Create a department to organize people in your company."
          columns={departmentColumns(
            managers,
            managerSelections,
            savingDepartmentId,
            (departmentId, managerId) => {
              setManagerSelections((current) => ({
                ...current,
                [departmentId]: managerId,
              }))
              setSavedMessage(null)
              setSaveError(null)
            },
            handleManagerSubmit,
          )}
        />
      )}
    </PageShell>
  )
}
