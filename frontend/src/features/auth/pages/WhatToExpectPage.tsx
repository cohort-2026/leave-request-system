import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { paths } from '../../../shared/constants/paths'

const features = [
  {
    title: 'Request leave in one place',
    description: 'Submit leave requests, see your remaining balance and track each request from submission to decision.',
  },
  {
    title: 'Clear approvals',
    description: 'Managers and company administrators can review requests, approve or reject them and keep decisions visible.',
  },
  {
    title: 'Shared calendars',
    description: 'See team availability, working days, public holidays and company blocked dates in one calendar view.',
  },
  {
    title: 'Organisation controls',
    description: 'Company administrators can manage people, departments, leave types, rules and employee invite links.',
  },
  {
    title: 'Secure organisation access',
    description: 'Users see only the people, policies and leave information permitted by their role and organisation.',
  },
  {
    title: 'Self-service onboarding',
    description: 'Employees can join through a company-specific invite link without requiring manual account creation for every person.',
  },
]

export function WhatToExpectPage() {
  return (
    <PageShell title="What to expect" eyebrow="Leave request platform">
      <p className="auth-lede">
        A focused workspace for employees, managers and administrators to keep leave organised.
      </p>
      <div className="feature-list">
        {features.map((feature) => (
          <article className="feature-item" key={feature.title}>
            <span className="feature-check" aria-hidden="true">✓</span>
            <div>
              <h2>{feature.title}</h2>
              <p>{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="auth-switch">
        Ready to continue? <Link to={paths.login}>Sign in</Link>
      </p>
    </PageShell>
  )
}
