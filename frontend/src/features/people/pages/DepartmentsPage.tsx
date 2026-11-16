import { useEffect, useState, type FormEvent } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert } from '../../../shared/components'
import { ApiError } from '../../../services/api'
import { Button } from '../../../components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '../../../components/ui/empty'
import { Input } from '../../../components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table'
import { Label } from '../../../components/ui/label'
import {
  createDepartment,
  listDepartments,
  updateDepartmentManager,
  type Department,
} from '../departmentsApi'
import { listCompanyUsers, type PublicUser } from './usersApi'

type SheetMode = 'create' | { department: Department } | null

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [managers, setManagers] = useState<PublicUser[]>([])
  const [departmentName, setDepartmentName] = useState('')
  const [managerId, setManagerId] = useState('')
  const [sheetMode, setSheetMode] = useState<SheetMode>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const editingDepartment =
    sheetMode && typeof sheetMode === 'object' ? sheetMode.department : null

  useEffect(() => {
    let cancelled = false

    Promise.all([listDepartments(), listCompanyUsers()])
      .then(([loadedDepartments, users]) => {
        if (cancelled) return
        setDepartments(loadedDepartments)
        setManagers(users.filter((user) => user.role === 'manager'))
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

  function openCreateSheet() {
    setDepartmentName('')
    setSaveError(null)
    setSavedMessage(null)
    setSheetMode('create')
  }

  function openEditSheet(department: Department) {
    setManagerId(
      department.managerId === null ? '' : String(department.managerId),
    )
    setSaveError(null)
    setSavedMessage(null)
    setSheetMode({ department })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSavedMessage(null)

    try {
      if (sheetMode === 'create') {
        const created = await createDepartment(departmentName)
        setDepartments((current) => [...current, created])
        setSavedMessage('Department created.')
      } else if (editingDepartment) {
        const updated = await updateDepartmentManager(
          editingDepartment.id,
          managerId ? Number(managerId) : null,
        )
        setDepartments((current) =>
          current.map((department) =>
            department.id === updated.id ? updated : department,
          ),
        )
        setSavedMessage(`Manager updated for ${updated.name}.`)
      } else {
        return
      }

      setSheetMode(null)
    } catch (error: unknown) {
      setSaveError(
        getErrorMessage(
          error,
          sheetMode === 'create'
            ? 'Could not create department.'
            : 'Could not set the manager.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="Departments" eyebrow="Company admin">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="m-0 text-sm text-muted-foreground">
            Organize people into teams and assign a manager to each department.
          </p>
        </div>
        <Button type="button" onClick={openCreateSheet}>
          <PlusIcon aria-hidden="true" />
          Add department
        </Button>
      </div>

      {loadError ? <Alert tone="error">{loadError}</Alert> : null}
      {savedMessage ? <Alert tone="success">{savedMessage}</Alert> : null}

      {loading ? (
        <p className="muted">Loading departments…</p>
      ) : loadError ? null : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead scope="col">Department</TableHead>
                <TableHead scope="col">Manager</TableHead>
                <TableHead scope="col" className="w-24 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length ? (
                departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="font-medium">
                      {department.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {department.managerName ?? 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Edit manager for ${department.name}`}
                        onClick={() => openEditSheet(department)}
                      >
                        <PencilIcon aria-hidden="true" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="p-4">
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyTitle>No departments yet</EmptyTitle>
                        <EmptyDescription>
                          Add a department to organize people in your company.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) setSheetMode(null)
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'create'
                ? 'Add department'
                : 'Edit department manager'}
            </SheetTitle>
            <SheetDescription>
              {sheetMode === 'create'
                ? 'Create a department for your company.'
                : `Choose who manages ${editingDepartment?.name ?? 'this department'}.`}
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-5 px-4"
            onSubmit={handleSubmit}
          >
            {saveError ? <Alert tone="error">{saveError}</Alert> : null}
            {sheetMode === 'create' ? (
              <div className="grid gap-2">
                <Label htmlFor="department-name">Department name</Label>
                <Input
                  id="department-name"
                  name="departmentName"
                  value={departmentName}
                  maxLength={80}
                  required
                  autoFocus
                  disabled={saving}
                  onChange={(event) => setDepartmentName(event.target.value)}
                />
              </div>
            ) : editingDepartment ? (
              <div className="grid gap-2">
                <Label htmlFor="department-manager">Manager</Label>
                <select
                  id="department-manager"
                  name="managerId"
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  value={managerId}
                  disabled={saving}
                  onChange={(event) => setManagerId(event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.displayName}
                    </option>
                  ))}
                </select>
                {!managers.length ? (
                  <p className="m-0 text-sm text-muted-foreground">
                    No managers are available to assign.
                  </p>
                ) : null}
              </div>
            ) : null}
            <SheetFooter className="flex-row justify-end border-t p-4">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setSheetMode(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  saving ||
                  (sheetMode === 'create' && !departmentName.trim())
                }
              >
                {saving
                  ? 'Saving…'
                  : sheetMode === 'create'
                    ? 'Create department'
                    : 'Save manager'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
