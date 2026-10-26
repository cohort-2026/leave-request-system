import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'
import {
  ROLES,
  getCompanyUser,
  roleLabel,
  updateUserRole,
  type PublicUser,
  type Role,
} from './usersApi'

export function UserDetailPage() {
  const { id } = useParams()

  const [person, setPerson] = useState<PublicUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role>('staff')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    setLoading(true)
    setLoadError(null)
    getCompanyUser(id)
      .then((user) => {
        if (cancelled) return
        setPerson(user)
        setSelectedRole(user.role)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load this person.')
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
    if (!id || !person || selectedRole === person.role) return

    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const updated = await updateUserRole(id, selectedRole)
      setPerson(updated)
      setSelectedRole(updated.role)
      setSaved(true)
    } catch (err: unknown) {
      // Covers last-admin, self-change and 403 messages from the API.
      setSaveError(err instanceof Error ? err.message : 'Could not change the role.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell title="One person" eyebrow="Company admin">
      {loading && <p className="muted">Loading…</p>}
      {loadError && <p role="alert">{loadError}</p>}

      {person && (
        <form onSubmit={handleSubmit}>
          <p>
            <strong>{person.name}</strong>
            {person.email ? <> ({person.email})</> : null}
          </p>
          <p className="muted">
            Current role: {roleLabel[person.role] ?? person.role}
          </p>

          <label htmlFor="person-role">Role</label>{' '}
          <select
            id="person-role"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value as Role)
              setSaved(false)
              setSaveError(null)
            }}
            disabled={saving}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel[role]}
              </option>
            ))}
          </select>{' '}
          <button type="submit" disabled={saving || selectedRole === person.role}>
            {saving ? 'Saving…' : 'Save role'}
          </button>

          {saveError && <p role="alert">{saveError}</p>}
          {saved && <p role="status">Role updated.</p>}
        </form>
      )}

      <p>
        <Link to={paths.adminUsers}>Back to people</Link>
      </p>
    </PageShell>
  )
}
