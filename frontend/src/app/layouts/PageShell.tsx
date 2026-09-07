import type { ReactNode } from 'react'
import { PageHeader } from '../../shared/components'

type PageShellProps = {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
}

export function PageShell({ title, eyebrow, action, children }: PageShellProps) {
  return (
    <section className="page">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <PageHeader title={title} action={action} />
      <div className="stack">{children}</div>
    </section>
  )
}
