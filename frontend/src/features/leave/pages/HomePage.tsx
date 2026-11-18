import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CalendarX } from 'lucide-react'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert } from '../../../components/ui/alert'
import { Button } from '../../../components/ui/button'
import { Card, CardContent } from '../../../components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../../components/ui/empty'
import { Progress } from '../../../components/ui/progress'
import { Skeleton } from '../../../components/ui/skeleton'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { getLeaveBalances, type LeaveBalance } from '../balancesApi'

type TypeColour = 'violet' | 'rose' | 'amber' | 'sky' | 'slate' | 'teal'

// Full class names are written out so Tailwind can see them. The "!" beats the
// default card and progress colours, because `cn` does not merge conflicts.
const colourStyles: Record<
  TypeColour,
  { card: string; square: string; figure: string; track: string; bar: string }
> = {
  violet: {
    card: 'bg-violet-50! ring-violet-200!',
    square: 'bg-violet-600',
    figure: 'text-violet-800',
    track: 'bg-violet-100!',
    bar: '[&>[data-slot=progress-indicator]]:bg-violet-600!',
  },
  rose: {
    card: 'bg-rose-50! ring-rose-200!',
    square: 'bg-rose-500',
    figure: 'text-rose-800',
    track: 'bg-rose-100!',
    bar: '[&>[data-slot=progress-indicator]]:bg-rose-500!',
  },
  amber: {
    card: 'bg-amber-50! ring-amber-200!',
    square: 'bg-amber-500',
    figure: 'text-amber-800',
    track: 'bg-amber-100!',
    bar: '[&>[data-slot=progress-indicator]]:bg-amber-500!',
  },
  sky: {
    card: 'bg-sky-50! ring-sky-200!',
    square: 'bg-sky-500',
    figure: 'text-sky-800',
    track: 'bg-sky-100!',
    bar: '[&>[data-slot=progress-indicator]]:bg-sky-500!',
  },
  slate: {
    card: 'bg-slate-50! ring-slate-200!',
    square: 'bg-slate-500',
    figure: 'text-slate-800',
    track: 'bg-slate-200!',
    bar: '[&>[data-slot=progress-indicator]]:bg-slate-500!',
  },
  teal: {
    card: 'bg-teal-50! ring-teal-200!',
    square: 'bg-teal-500',
    figure: 'text-teal-800',
    track: 'bg-teal-100!',
    bar: '[&>[data-slot=progress-indicator]]:bg-teal-500!',
  },
}

function colourFor(leaveType: string): TypeColour {
  const name = leaveType.toLowerCase()
  if (name.includes('annual')) return 'violet'
  if (name.includes('sick')) return 'rose'
  if (name.includes('family')) return 'amber'
  if (name.includes('parental')) return 'sky'
  if (name.includes('unpaid')) return 'slate'
  if (name.includes('study')) return 'teal'
  return 'slate'
}

function formatDays(days: number) {
  return String(Number(days.toFixed(2)))
}

function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Could not load your leave balances.'
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function BalanceCard({ balance }: { balance: LeaveBalance }) {
  const styles = colourStyles[colourFor(balance.leaveType)]
  const unlimited = !balance.hasBalance
  const pending = balance.pending
  const showProgress = !unlimited && balance.entitled > 0
  const committed = balance.taken + pending
  const progress = showProgress
    ? (committed / balance.entitled) * 100
    : 0

  return (
    <Card
      className={`shadow-sm [--card-spacing:--spacing(5)] ${styles.card}`}
      data-leave-type={balance.leaveType}
    >
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-3 shrink-0 rounded-[3px] ${styles.square}`}
          />
          <h2 className="truncate text-sm font-medium text-foreground">
            {balance.leaveType}
          </h2>
        </div>

        <div className="grid gap-0.5">
          <p
            className={`text-4xl leading-none font-semibold tracking-tight ${styles.figure}`}
          >
            {unlimited ? 'No limit' : formatDays(balance.available ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            {unlimited ? 'Available' : 'Days available'}
          </p>
        </div>

        {showProgress ? (
          <Progress
            value={progress}
            aria-label={`${balance.leaveType} days used or pending`}
            className={`h-1.5 ${styles.track} ${styles.bar}`}
          />
        ) : null}

        <dl
          className={`grid gap-3 ${unlimited ? 'grid-cols-2' : 'grid-cols-3'}`}
        >
          {unlimited ? null : (
            <Stat label="Entitled" value={formatDays(balance.entitled)} />
          )}
          <Stat label="Taken" value={formatDays(balance.taken)} />
          <Stat label="Pending" value={formatDays(pending)} />
        </dl>
      </CardContent>
    </Card>
  )
}

function BalanceSkeletons() {
  return (
    <div
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      <span className="sr-only" role="status">
        Loading your leave balances
      </span>
      {[0, 1, 2, 3].map((index) => (
        <Card
          key={index}
          aria-hidden="true"
          className="shadow-sm [--card-spacing:--spacing(5)]"
        >
          <CardContent className="grid gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-1.5 w-full" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function HomePage() {
  const { session } = useAuth()

  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session || session.role === 'platform') {
      return
    }
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await getLeaveBalances()
        if (cancelled) return
        setBalances(data)
      } catch (loadError: unknown) {
        if (!cancelled) setError(getErrorMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [session])

  if (!session) {
    return <Navigate to={paths.login} replace />
  }

  if (session.role === 'platform') {
    return <Navigate to={paths.platform} replace />
  }

  const firstName = session.displayName.trim().split(/\s+/)[0] || 'there'

  return (
    <PageShell
      title={`Hi, ${firstName}`}
      action={
        <Button asChild>
          <Link to={paths.leaveNew}>Request leave</Link>
        </Button>
      }
    >
      {loading ? <BalanceSkeletons /> : null}

      {!loading && error ? (
        <Alert variant="destructive">{error}</Alert>
      ) : null}

      {!loading && !error && balances.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX />
            </EmptyMedia>
            <EmptyTitle>No leave balances yet</EmptyTitle>
            <EmptyDescription>
              Your balances will appear here once leave types are set up for
              your company.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!loading && !error && balances.length > 0 ? (
        <section
          aria-label="Your leave balances"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {balances.map((balance) => (
            <BalanceCard
              key={balance.leaveTypeId ?? balance.leaveType}
              balance={balance}
            />
          ))}
        </section>
      ) : null}
    </PageShell>
  )
}
