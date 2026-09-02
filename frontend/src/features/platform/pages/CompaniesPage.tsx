import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

export function CompaniesPage() {
  return (
    <PageShell title="Companies" eyebrow="Platform">
      <p className="muted">
        The list of companies only. This person does not open another company’s
        leave.
      </p>
      <p>
        <Link to={paths.platformNewCompany}>New company</Link>
      </p>
    </PageShell>
  )
}
