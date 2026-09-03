import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import {
  DataTable,
  type DataTableColumn,
} from '../../../shared/components'
import { adminUserPath } from '../../../shared/constants/paths'

type PersonRow = {
  id: string
  name: string
  role: string
  status: string
}

const samplePeople: PersonRow[] = [
  {
    id: 'u-thandi',
    name: 'Thandi Nkosi',
    role: 'Staff',
    status: 'Active',
  },
  {
    id: 'u-sipho',
    name: 'Sipho Dlamini',
    role: 'Manager',
    status: 'Active',
  },
  {
    id: 'u-lebo',
    name: 'Lebo Maseko',
    role: 'Company admin',
    status: 'Active',
  },
  {
    id: 'demo',
    name: 'New hire',
    role: 'Staff',
    status: 'Waiting',
  },
]

const columns: DataTableColumn<PersonRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (row) => <Link to={adminUserPath(row.id)}>{row.name}</Link>,
  },
  {
    key: 'role',
    header: 'Role',
    render: (row) => row.role,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => row.status,
  },
]

export function UsersPage() {
  return (
    <PageShell title="People" eyebrow="Company admin">
      <p className="muted">
        Everyone in this company: claimed, not claimed, and still waiting.
      </p>
      <DataTable
        data={samplePeople}
        keyExtractor={(row) => row.id}
        emptyTitle="No people"
        emptyDescription="People in this company will show here."
        columns={columns}
      />
    </PageShell>
  )
}
