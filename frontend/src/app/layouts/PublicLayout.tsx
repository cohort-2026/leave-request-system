import { Link, Outlet } from 'react-router-dom'
import { paths } from '../../shared/constants/paths'

export function PublicLayout() {
  return (
    <div className="public-shell">
      <div className="public-frame">
        <aside className="public-intro">
          <p className="brand-mark"><span>LR</span> Leave request</p>
          <div className="public-intro-copy">
            <p className="kicker">Your time, clearly managed</p>
            <h2>Make space for what matters.</h2>
            <p>One calm place to request leave, follow decisions, and keep your team in sync.</p>
          </div>
          <p className="public-note">Built for thoughtful teams.</p>
        </aside>
        <main className="public-card">
          <Link className="mobile-brand" to={paths.login}>Leave request</Link>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
