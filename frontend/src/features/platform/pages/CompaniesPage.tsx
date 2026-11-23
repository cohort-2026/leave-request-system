import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { PageShell } from '../../../app/layouts/PageShell'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../../components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table'
import { ApiError } from '../../../services/api'
import { Alert } from '../../../shared/components'
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
      <p className="max-w-2xl text-sm text-muted-foreground">
        Company status, subscription plan, and seats used against each plan
        limit. Platform access does not open a company’s leave data.
      </p>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading companies…
        </p>
      ) : error ? null : companies.length === 0 ? (
        <Empty className="rounded-xl border border-border bg-card py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No companies yet</EmptyTitle>
            <EmptyDescription>
              New companies will appear here after they are created.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead scope="col">Company</TableHead>
                <TableHead scope="col">Plan</TableHead>
                <TableHead scope="col">Seats used</TableHead>
                <TableHead scope="col">Company status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div className="grid gap-1">
                      <span className="font-medium text-foreground">
                        {company.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {company.slug}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <span>{company.planName ?? 'No plan'}</span>
                      {company.subscriptionStatus ? (
                        <span className="text-xs capitalize text-muted-foreground">
                          {company.subscriptionStatus.replaceAll('_', ' ')}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {company.seatsUsed} / {company.seatLimit ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        company.status === 'active' ? 'secondary' : 'outline'
                      }
                      className="capitalize"
                    >
                      {company.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageShell>
  )
}
