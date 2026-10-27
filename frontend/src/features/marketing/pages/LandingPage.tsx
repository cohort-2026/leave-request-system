import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="marketing-landing">
      <section className="marketing-hero">
        <p className="eyebrow">Leave for many companies</p>
        <h1>Leave requests for every company, in one product.</h1>
        <p>
          Staff book time off, managers approve it, and each company keeps its
          own workspace. Choose a plan and start your company.
        </p>
        <div className="actions">
          <Button
            variant="primary"
            type="button"
            onClick={() => navigate(paths.startCompany)}
          >
            Start your company
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(paths.login)}
          >
            Sign in
          </Button>
        </div>
        <p>
          <Link to={paths.pricing}>See pricing in ZAR</Link>
        </p>
      </section>
      <ul className="marketing-points">
        <li>
          <h2>Your company</h2>
          <p>Each workspace has its own people, rules, and leave calendar.</p>
        </li>
        <li>
          <h2>Book and approve</h2>
          <p>Staff request leave. Managers and admins review it in one queue.</p>
        </li>
        <li>
          <h2>Plans in Rand</h2>
          <p>Starter, Growth, and Business are billed monthly in ZAR, ex VAT.</p>
        </li>
      </ul>
    </div>
  )
}
