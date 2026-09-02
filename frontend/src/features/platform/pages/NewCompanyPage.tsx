import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

export function NewCompanyPage() {
  return (
    <PageShell title="New company" eyebrow="Platform">
      <p className="muted">Creates the company and the first company admin.</p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label>
          Company name
          <input name="companyName" />
        </label>
        <label>
          First admin email
          <input type="email" name="adminEmail" />
        </label>
        <button type="submit" disabled>
          Create (wired later)
        </button>
      </form>
      <p>
        <Link to={paths.platform}>Back to companies</Link>
      </p>
    </PageShell>
  )
}
