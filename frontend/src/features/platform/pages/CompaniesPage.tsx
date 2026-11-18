import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { ApiError } from '../../../services/api'
import { Alert, DataTable, EmptyState } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import {
  fetchPlatformCompanies,
  type PlatformCompany,
} from '../platformApi'

export function CompaniesPage() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchPlatformCompanies()
      .then((result) => {
        if (active) {
          setCompanies(result)
          setError(null)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : 'Could not load companies.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const columns = [
    {
      key: 'company',
      header: 'Company',
      render: (company: PlatformCompany) => (
        <div className="grid gap-1">
          <span className="font-medium text-foreground">{company.name}</span>
          <span className="text-xs text-muted-foreground">{company.slug}</span>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (company: PlatformCompany) => (
        <div className="grid gap-1">
          <span>{company.planName ?? 'No plan'}</span>
          {company.subscriptionStatus ? (
            <span className="text-xs capitalize text-muted-foreground">
              {company.subscriptionStatus.replaceAll('_', ' ')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'seats',
      header: 'Seats used',
      render: (company: PlatformCompany) => (
        <span className="font-medium tabular-nums">
          {company.seatsUsed} / {company.seatLimit ?? '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Company status',
      render: (company: PlatformCompany) => (
        <Badge
          variant={company.status === 'active' ? 'secondary' : 'outline'}
          className="capitalize"
        >
          {company.status}
        </Badge>
      ),
    },
  ]

  return (
    <PageShell
      title="Companies"
      eyebrow="Platform"
      action={
        <Button asChild>
          <Link to={paths.platformNewCompany}>New company</Link>
        </Button>
      }
    >
      <p className="max-w-2xl text-muted-foreground">
        View company status, subscription plan, and active seats. Platform
        access does not open a company’s leave data.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Company directory</CardTitle>
          <CardDescription>
            Active users counted against each plan’s seat limit.
          </CardDescription>
        </CardHeader>
        {error ? (
          <CardContent>
            <Alert tone="error">{error}</Alert>
          </CardContent>
        ) : loading ? (
          <CardContent>
            <p className="text-sm text-muted-foreground" role="status">
              Loading companies…
            </p>
          </CardContent>
        ) : companies.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No companies yet"
              description="New companies will appear here after they are created."
            />
          </CardContent>
        ) : (
          <CardContent>
            <DataTable
              data={companies}
              keyExtractor={(company) => String(company.id)}
              columns={columns}
              emptyTitle="No companies yet"
            />
          </CardContent>
        )}
      </Card>
    </PageShell>
  )
}
