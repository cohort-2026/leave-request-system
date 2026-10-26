import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  Alert,
  DataTable,
  type DataTableColumn,
} from '../../../shared/components'
import { adminUserPath } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { roleLabel, type AccountStatus } from '../../../shared/types/session'
import { listCompanyUsers, type PublicUser } from './usersApi'

const statusLabel: Record<AccountStatus, string> = {
  active: 'Active',
  pending_verification: 'Pending verification',
  pending_approval: 'Pending approval',
}

const columns: DataTableColumn<PublicUser>[] = [
  {
    key: 'displayName',
    header: 'Name',
    render: (row) => (
      <Link to={adminUserPath(String(row.id))}>{row.displayName}</Link>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    render: (row) => row.email,
  },
  {
    key: 'role',
    header: 'Role',
    render: (row) => roleLabel[row.role] ?? row.role,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => statusLabel[row.status] ?? row.status,
  },
]

export function UsersPage() {
  const [people, setPeople] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listCompanyUsers()
      .then((users) => {
        if (!cancelled) setPeople(users)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load people.',
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

  return (
    <PageShell title="People" eyebrow="Company admin">
      <p className="muted">Everyone in this company.</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? (
        <p className="muted">Loading people…</p>
      ) : error ? null : (
        <DataTable
          data={people}
          keyExtractor={(row) => String(row.id)}
          emptyTitle="No people"
          emptyDescription="People in this company will show here."
          columns={columns}
        />
      )}
    </PageShell>
  )
}
