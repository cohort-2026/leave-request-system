import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  DataTable,
  type DataTableColumn,
} from '../../../shared/components'
import { adminUserPath } from '../../../shared/constants/paths'
import {
  listCompanyUsers,
  roleLabel,
  type PublicUser,
} from './usersApi'

const columns: DataTableColumn<PublicUser>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => <Link to={adminUserPath(row.id)}>{row.name}</Link>,
  },
  {
    key: 'email',
    header: 'Email',
    render: (row) => row.email ?? '',
  },
  {
    key: 'role',
    header: 'Role',
    render: (row) => roleLabel[row.role] ?? row.role,
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
          setError(err instanceof Error ? err.message : 'Could not load people.')
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
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p className="muted">Loading people…</p>
      ) : (
        <DataTable
          data={people}
          keyExtractor={(row) => row.id}
          emptyTitle="No people"
          emptyDescription="People in this company will show here."
          columns={columns}
        />
      )}
    </PageShell>
  )
}
