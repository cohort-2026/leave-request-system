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
  createCompanyLeaveType,
  getCompanyLeaveTypes,
  updateCompanyLeaveType,
  type CompanyLeaveType,
  type LeaveTypeInput,
} from '../leaveTypesApi'

type LeaveTypeForm = {
  name: string
  defaultDays: number | ''
  isActive: boolean
  allowBackdate: boolean
  requiresDocumentAfterDays: number | ''
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function emptyForm(): LeaveTypeForm {
  return {
    name: '',
    defaultDays: 0,
    isActive: true,
    allowBackdate: false,
    requiresDocumentAfterDays: '',
  }
}

function leaveTypeForm(leaveType: CompanyLeaveType): LeaveTypeForm {
  return {
    name: leaveType.name,
    defaultDays: leaveType.defaultDays,
    isActive: leaveType.isActive,
    allowBackdate: leaveType.allowBackdate,
    requiresDocumentAfterDays: leaveType.requiresDocumentAfterDays ?? '',
  }
}

function leaveTypeColumns(
  onEdit: (leaveType: CompanyLeaveType) => void,
  saving: boolean,
): DataTableColumn<CompanyLeaveType>[] {
  return [
    { key: 'name', header: 'Name', render: (type) => type.name },
    {
      key: 'defaultDays',
      header: 'Default days',
      render: (type) => type.defaultDays,
    },
    {
      key: 'backdate',
      header: 'Backdate',
      render: (type) => (type.allowBackdate ? 'Allowed' : 'Not allowed'),
    },
    {
      key: 'documentAfter',
      header: 'File required after',
      render: (type) =>
        type.requiresDocumentAfterDays === null
          ? 'Not required'
          : `${type.requiresDocumentAfterDays} days`,
    },
    {
      key: 'active',
      header: 'Active',
      render: (type) => (type.isActive ? 'Yes' : 'No'),
    },
    {
      key: 'edit',
      header: '',
      className: 'cell-action',
      render: (type) => (
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => onEdit(type)}
          aria-label={`Edit ${type.name}`}
        >
          Edit
        </Button>
      ),
    },
  ]
}

export function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<CompanyLeaveType[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState<LeaveTypeForm | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    getCompanyLeaveTypes()
      .then((loadedTypes) => {
        if (!cancelled) setLeaveTypes(loadedTypes)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            getErrorMessage(error, 'Could not load leave types.'),
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

  async function reloadLeaveTypes() {
    setLoading(true)
    setLoadError(null)
    try {
      setLeaveTypes(await getCompanyLeaveTypes())
    } catch (error: unknown) {
      setLoadError(getErrorMessage(error, 'Could not load leave types.'))
    } finally {
      setLoading(false)
    }
  }

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setActionError(null)
    setNotice(null)
  }

  function startEdit(leaveType: CompanyLeaveType) {
    setEditingId(leaveType.id)
    setForm(leaveTypeForm(leaveType))
    setActionError(null)
    setNotice(null)
  }

  function closeForm() {
    setForm(null)
    setEditingId(null)
    setActionError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !form ||
      typeof form.defaultDays !== 'number' ||
      !Number.isInteger(form.defaultDays) ||
      form.defaultDays < 0 ||
      (form.requiresDocumentAfterDays !== '' &&
        (!Number.isInteger(form.requiresDocumentAfterDays) ||
          form.requiresDocumentAfterDays < 0))
    ) {
      return
    }

    const input: LeaveTypeInput = {
      name: form.name.trim(),
      defaultDays: form.defaultDays,
      isActive: form.isActive,
      allowBackdate: form.allowBackdate,
      requiresDocumentAfterDays:
        form.requiresDocumentAfterDays === ''
          ? null
          : form.requiresDocumentAfterDays,
    }

    setSaving(true)
    setActionError(null)
    setNotice(null)
    try {
      const savedType =
        editingId === null
          ? await createCompanyLeaveType(input)
          : await updateCompanyLeaveType(editingId, input)
      setLeaveTypes((current) =>
        [...(current ?? []).filter((item) => item.id !== savedType.id), savedType]
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      setForm(null)
      setEditingId(null)
      setNotice(editingId === null ? 'Leave type added.' : 'Leave type saved.')
    } catch (error: unknown) {
      setActionError(
        getErrorMessage(
          error,
          editingId === null
            ? 'Could not add the leave type.'
            : 'Could not save the leave type.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  const columns = leaveTypeColumns(startEdit, saving)

  return (
    <PageShell title="Leave types" eyebrow="Company admin">
      <p className="muted">
        Manage the leave types and defaults available to your company.
      </p>
      {loadError ? (
        <>
          <Alert tone="error">{loadError}</Alert>
          <Button
            type="button"
            onClick={() => void reloadLeaveTypes()}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Try again'}
          </Button>
        </>
      ) : null}
      {actionError ? <Alert tone="error">{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="actions">
        {form ? (
          <Button
            type="button"
            variant="secondary"
            onClick={closeForm}
            disabled={saving}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            onClick={startCreate}
            disabled={loading || loadError !== null}
          >
            Add leave type
          </Button>
        )}
      </div>

      {form ? (
        <section className="stack" aria-labelledby="leave-type-form-heading">
          <h2 id="leave-type-form-heading">
            {editingId === null ? 'Add leave type' : 'Edit leave type'}
          </h2>
          <form
            className="flex flex-col gap-stack"
            onSubmit={handleSubmit}
            aria-busy={saving}
          >
            <TextField
              label="Name"
              name="leaveTypeName"
              value={form.name}
              maxLength={80}
              required
              disabled={saving}
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, name: event.target.value } : current,
                )
              }
            />
            <TextField
              label="Default days"
              name="defaultDays"
              type="number"
              min={0}
              max={2147483647}
              step={1}
              value={form.defaultDays}
              required
              disabled={saving}
              onChange={(event) => {
                const value = event.target.value
                setForm((current) =>
                  current
                    ? {
                        ...current,
                        defaultDays: value === '' ? '' : Number(value),
                      }
                    : current,
                )
              }}
            />
            <Select
              label="Allow backdating"
              name="allowBackdate"
              value={String(form.allowBackdate)}
              disabled={saving}
              onChange={(event) =>
                setForm((current) =>
                  current
                    ? {
                        ...current,
                        allowBackdate: event.target.value === 'true',
                      }
                    : current,
                )
              }
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
            <TextField
              label="File required after (days)"
              name="requiresDocumentAfterDays"
              type="number"
              min={0}
              max={2147483647}
              step={1}
              value={form.requiresDocumentAfterDays}
              hint="Leave blank if a supporting file is not required."
              disabled={saving}
              onChange={(event) => {
                const value = event.target.value
                setForm((current) =>
                  current
                    ? {
                        ...current,
                        requiresDocumentAfterDays:
                          value === '' ? '' : Number(value),
                      }
                    : current,
                )
              }}
            />
            <Select
              label="Active"
              name="isActive"
              value={String(form.isActive)}
              disabled={saving}
              onChange={(event) =>
                setForm((current) =>
                  current
                    ? { ...current, isActive: event.target.value === 'true' }
                    : current,
                )
              }
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </Select>
            <div className="actions">
              <Button
                variant="primary"
                type="submit"
                disabled={
                  saving ||
                  form.name.trim().length === 0 ||
                  form.defaultDays === '' ||
                  !Number.isInteger(form.defaultDays) ||
                  form.defaultDays < 0 ||
                  (form.requiresDocumentAfterDays !== '' &&
                    (!Number.isInteger(form.requiresDocumentAfterDays) ||
                      form.requiresDocumentAfterDays < 0))
                }
              >
                {saving
                  ? 'Saving…'
                  : editingId === null
                    ? 'Add leave type'
                    : 'Save changes'}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {loading ? <p className="muted">Loading leave types available…</p> : null}
      {!loading && !loadError && leaveTypes ? (
        <DataTable
          data={leaveTypes}
          keyExtractor={(leaveType) => String(leaveType.id)}
          columns={columns}
          emptyTitle="No leave types yet"
          emptyDescription="Add a leave type to get started."
        />
      ) : null}
    </PageShell>
  )
}
