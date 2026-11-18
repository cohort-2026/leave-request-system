import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { PageShell } from '../../../app/layouts/PageShell'
import { useAuth } from '../../../app/providers/useAuth'
import { Alert } from '../../../shared/components'
import { adminUserPath } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import { roleLabel, type AccountStatus } from '../../../shared/types/session'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ASSIGNABLE_ROLES,
  isAssignableRole,
  listCompanyUsers,
  updateUserRole,
  type PublicUser,
} from './usersApi'

const statusLabel: Record<AccountStatus, string> = {
  active: 'Active',
  pending_verification: 'Pending verification',
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function UsersPage() {
  const { session } = useAuth()
  const [people, setPeople] = useState<PublicUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingUserId, setSavingUserId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    listCompanyUsers()
      .then((users) => {
        if (!cancelled) setPeople(users)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'Could not load people.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredPeople = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return people
    return people.filter(
      (person) =>
        person.displayName.toLowerCase().includes(query) ||
        person.email.toLowerCase().includes(query) ||
        (person.departmentName ?? '').toLowerCase().includes(query),
    )
  }, [people, searchQuery])

  async function handleRoleChange(user: PublicUser, nextValue: string) {
    if (!isAssignableRole(nextValue) || nextValue === user.role) return

    setError(null)
    setSavingUserId(user.id)
    try {
      const updated = await updateUserRole(user.id, nextValue)
      setPeople((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : 'Could not update user role.',
      )
    } finally {
      setSavingUserId(null)
    }
  }

  return (
    <PageShell title="People" eyebrow="Company admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Manage team members, departments, and access roles across your organisation.
          </p>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name, email, department…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search people"
            />
          </div>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Loading people…
          </div>
        ) : filteredPeople.length === 0 ? (
          <Empty className="rounded-xl border border-border bg-card py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users className="size-5" />
              </EmptyMedia>
              <EmptyTitle>
                {searchQuery ? 'No matching people' : 'No people yet'}
              </EmptyTitle>
              <EmptyDescription>
                {searchQuery
                  ? 'Try clearing your search filter to see everyone in this company.'
                  : 'People in this company will appear here once added.'}
              </EmptyDescription>
            </EmptyHeader>
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            ) : null}
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeople.map((person) => {
                  const isSelf = session?.id === person.id
                  const canEditRole =
                    !isSelf && isAssignableRole(person.role)
                  const isSaving = savingUserId === person.id

                  return (
                    <TableRow key={person.id} className="group">
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-border">
                            <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                              {getInitials(person.displayName, person.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              to={adminUserPath(String(person.id))}
                              className="block truncate font-medium text-foreground hover:underline"
                            >
                              {person.displayName}
                            </Link>
                            <span className="block truncate text-xs text-muted-foreground">
                              {person.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {person.departmentName ?? 'Unassigned'}
                      </TableCell>

                      <TableCell>
                        {canEditRole ? (
                          <select
                            aria-label={`Role for ${person.displayName}`}
                            value={person.role}
                            disabled={isSaving}
                            onChange={(e) =>
                              void handleRoleChange(person, e.target.value)
                            }
                            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ASSIGNABLE_ROLES.map((roleOption) => (
                              <option key={roleOption} value={roleOption}>
                                {roleLabel[roleOption] ?? roleOption}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="secondary">
                            {roleLabel[person.role] ?? person.role}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            person.status === 'active' ? 'outline' : 'secondary'
                          }
                          className={
                            person.status === 'active'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : ''
                          }
                        >
                          {statusLabel[person.status] ?? person.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={adminUserPath(String(person.id))}>
                            Manage
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageShell>
  )
}
