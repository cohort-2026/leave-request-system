import { Link } from 'react-router-dom'
import { paths } from '../../../shared/constants/paths'

const features = [
  {
    number: '01',
    title: 'Employee self-service',
    description: 'Employees can check balances, submit leave and follow decisions without chasing HR.',
  },
  {
    number: '02',
    title: 'Approval workflows',
    description: 'Managers get the context they need to approve requests and keep teams moving.',
  },
  {
    number: '03',
    title: 'Company calendars',
    description: 'Working weeks, public holidays and blocked dates stay configurable for every organisation.',
  },
  {
    number: '04',
    title: 'Admin self-service',
    description: 'Company admins manage people, leave types, policies and invite links in one workspace.',
  },
]

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link className="landing-logo" to={paths.welcome}>
          <span>LR</span>
          Leave request
        </Link>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#security">Security</a>
        </nav>
        <div className="landing-nav-actions">
          <Link className="landing-login" to={paths.login}>Sign in</Link>
          <Link className="landing-nav-cta" to={paths.register}>Get started</Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker">Leave management for growing teams</p>
            <h1>Leave admin that keeps everyone in the loop.</h1>
            <p className="landing-lede">
              One calm, configurable workspace for employees, managers and HR teams to request, approve and plan time away.
            </p>
            <div className="landing-actions">
              <Link className="landing-primary-cta" to={paths.register}>Start with your organisation</Link>
              <Link className="landing-secondary-cta" to={paths.login}>Sign in to workspace</Link>
            </div>
            <p className="landing-note">Built for multi-company teams · Secure access · Configurable policies</p>
          </div>
          <div className="landing-product-preview" aria-label="Leave request dashboard preview">
            <div className="preview-topbar">
              <span className="preview-brand"><i /> Leave request</span>
              <span className="preview-avatar">TN</span>
            </div>
            <div className="preview-body">
              <div className="preview-heading">
                <div><small>COMPANY WORKSPACE</small><strong>Good morning, Thandi</strong></div>
                <span className="preview-date">September 2026</span>
              </div>
              <div className="preview-metrics">
                <div><strong>12</strong><span>Days remaining</span></div>
                <div><strong>01</strong><span>Pending request</span></div>
                <div><strong>05</strong><span>Team away</span></div>
              </div>
              <div className="preview-calendar">
                <div className="preview-calendar-head"><strong>Team availability</strong><span>View calendar →</span></div>
                <div className="preview-week"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span></div>
                <div className="preview-days"><b>14</b><b>15</b><b className="preview-active">16</b><b>17</b><b>18</b></div>
                <div className="preview-bar"><span /> <strong>Thandi · Annual leave</strong><em>Approved</em></div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-proof" aria-label="Product benefits">
          <span>One platform for</span><strong>Employees</strong><strong>Managers</strong><strong>HR teams</strong><strong>Growing organisations</strong>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-heading">
            <p className="landing-kicker">Everything in one place</p>
            <h2>Less chasing. More clarity.</h2>
            <p>Give every organisation a sensible starting point, then make the details fit the way each team works.</p>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature) => (
              <article className="landing-feature" key={feature.number}>
                <span>{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-split-section" id="how-it-works">
          <div>
            <p className="landing-kicker">Designed to work as you grow</p>
            <h2>Simple on day one. Flexible when policy gets complicated.</h2>
          </div>
          <div className="landing-steps">
            <div><b>01</b><p><strong>Set up your workspace.</strong> Configure your organisation, people, leave types and calendar.</p></div>
            <div><b>02</b><p><strong>Invite your team.</strong> Employees join through a company-specific link and manage their own requests.</p></div>
            <div><b>03</b><p><strong>Keep decisions moving.</strong> Managers review requests while everyone sees the same source of truth.</p></div>
          </div>
        </section>

        <section className="landing-security" id="security">
          <div><p className="landing-kicker">Built for responsible teams</p><h2>Your organisation stays in its own lane.</h2></div>
          <p>Role-based access and tenant boundaries keep people, policies, calendars and leave data separated. Security, privacy and data processing information is available before your team signs in.</p>
          <div className="landing-security-links"><Link to={paths.security}>Security</Link><Link to={paths.privacy}>Privacy</Link><Link to={paths.dpa}>DPA</Link></div>
        </section>

        <section className="landing-faq">
          <div><p className="landing-kicker">Questions, answered</p><h2>Good to know.</h2></div>
          <div className="landing-faq-list">
            <details><summary>Who is the platform for?</summary><p>Employees, managers and organisation administrators who need a clearer way to manage leave.</p></details>
            <details><summary>Can each organisation configure its own rules?</summary><p>Yes. Leave types, working calendars, public holidays and approval responsibilities are organisation-specific.</p></details>
            <details><summary>How do employees join?</summary><p>Organisation administrators provide a company-specific invite link that connects employees to the correct workspace.</p></details>
          </div>
        </section>

        <section className="landing-final-cta">
          <p className="landing-kicker">Make leave easier to run</p>
          <h2>Give your team a better way to take time off.</h2>
          <Link className="landing-primary-cta" to={paths.register}>Create your organisation workspace</Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="landing-logo"><span>LR</span> Leave request</span>
        <div><Link to={paths.terms}>Terms</Link><Link to={paths.privacy}>Privacy</Link><Link to={paths.security}>Security</Link><Link to={paths.login}>Sign in</Link></div>
      </footer>
    </div>
  )
}
