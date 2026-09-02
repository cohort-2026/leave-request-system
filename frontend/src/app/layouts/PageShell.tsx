import type { ReactNode } from 'react'

type PageShellProps = {
  title: string
  eyebrow?: string
  children: ReactNode
}

export function PageShell({ title, eyebrow, children }: PageShellProps) {
  return (
    <section className="page">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      <div className="stack">{children}</div>
    </section>
  )
}
