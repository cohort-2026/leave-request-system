import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, Select } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { roleLabel } from '../../../shared/types/session'
import {
  ASSIGNABLE_ROLES,
  getCompanyUser,
  isAssignableRole,
  updateUserRole,
  type AssignableRole,
  type PublicUser,
} from './usersApi'

function parseUserId(value: string | undefined): number | null {
  if (!value) return null
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) return null
  return id
}

export function UserDetailPage() {
  const { id: rawId } = useParams()
  const id = parseUserId(rawId)

  const [person, setPerson] = useState<PublicUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<AssignableRole>('staff')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id === null) {
      setLoading(false)
      setLoadError('Invalid user id')
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setPerson(null)
    setSaved(false)
    setSaveError(null)

    getCompanyUser(id)
      .then((user) => {
        if (cancelled) return
        setPerson(user)
        if (isAssignableRole(user.role)) {
          setSelectedRole(user.role)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError
              ? err.message
              : 'Could not load this person.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (id === null || !person || selectedRole === person.role) return

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await updateUserRole(id, selectedRole)
      setPerson(updated)
      if (isAssignableRole(updated.role)) {
        setSelectedRole(updated.role)
      }
      setSaved(true)
    } catch (err: unknown) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Could not change the role.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="One person" eyebrow="Company admin">
      {loading ? <p className="muted">Loading…</p> : null}
      {loadError ? <Alert tone="error">{loadError}</Alert> : null}

      {person ? (
        <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
          <p>
            <strong>{person.displayName}</strong>
            {person.email ? <> ({person.email})</> : null}
          </p>
          <p className="muted">
            Current role: {roleLabel[person.role] ?? person.role}
          </p>

          <Select
            label="Role"
            name="role"
            id="person-role"
            value={selectedRole}
            disabled={saving}
            onChange={(event) => {
              const next = event.target.value
              if (isAssignableRole(next)) {
                setSelectedRole(next)
                setSaved(false)
                setSaveError(null)
              }
            }}
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel[role]}
              </option>
            ))}
          </Select>

          <Button
            type="submit"
            disabled={saving || selectedRole === person.role}
          >
            {saving ? 'Saving…' : 'Save role'}
          </Button>

          {saveError ? <Alert tone="error">{saveError}</Alert> : null}
          {saved ? <Alert tone="success">Role updated.</Alert> : null}
        </form>
      ) : null}

      <p>
        <Link to={paths.adminUsers}>Back to people</Link>
      </p>
    </PageShell>
  )
}
