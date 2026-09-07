/**
 * Usage: <PageHeader title="Book leave" action={<Button type="submit">Submit</Button>} />
 */
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, action, className = '' }: PageHeaderProps) {
  const classes = ['page-header', className].filter(Boolean).join(' ')

  return (
    <header className={classes}>
      <h1>{title}</h1>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  )
}
