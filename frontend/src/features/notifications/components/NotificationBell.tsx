import {
  useEffect,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Bell, Inbox } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../app/providers/useAuth'
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
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '../../../components/ui/item'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '../../../components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../components/ui/sheet'
import { Skeleton } from '../../../components/ui/skeleton'
import { useIsMobile } from '../../../hooks/use-mobile'
import { Alert } from '../../../shared/components'
import { leaveDetailPath } from '../../../shared/constants/paths'
import {
  NOTIFICATION_CATEGORY_COPY,
  type AppNotification,
} from '../notificationsApi'
import { useNotifications } from '../useNotifications'
import { cn } from '../../../lib/utils'

function hrefFor(item: AppNotification) {
  if (item.linkPath) return item.linkPath
  if (item.leaveRequestId != null) {
    return leaveDetailPath(String(item.leaveRequestId))
  }
  return null
}

function timeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatDistanceToNow(date, { addSuffix: true })
}

function NotificationList({
  notifications,
  loading,
  error,
  onOpenItem,
}: {
  notifications: AppNotification[]
  loading: boolean
  error: string
  onOpenItem: (item: AppNotification) => void
}) {
  if (error) {
    return <Alert tone="error">{error}</Alert>
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No notifications</EmptyTitle>
          <EmptyDescription>
            Leave requests, decisions, and reminders will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ItemGroup className="gap-1">
      {notifications.map((item) => {
        const href = hrefFor(item)
        const unread = item.readAt == null
        const content = (
          <>
            <ItemContent>
              <ItemTitle className="flex items-center gap-2">
                {unread ? (
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full bg-primary"
                  />
                ) : null}
                <span className="min-w-0 truncate">{item.title}</span>
              </ItemTitle>
              <ItemDescription className="line-clamp-2">
                {item.body}
              </ItemDescription>
              <p className="text-xs text-muted-foreground">
                {NOTIFICATION_CATEGORY_COPY[item.category].label}
                {' · '}
                {timeLabel(item.createdAt)}
              </p>
            </ItemContent>
          </>
        )

        return (
          <Item
            key={item.id}
            variant={unread ? 'muted' : 'default'}
            className="p-0"
          >
            {href ? (
              <Link
                to={href}
                className="flex w-full items-start gap-3 p-3 text-left no-underline"
                onClick={() => onOpenItem(item)}
              >
                {content}
              </Link>
            ) : (
              <button
                type="button"
                className="flex w-full items-start gap-3 p-3 text-left"
                onClick={() => onOpenItem(item)}
              >
                {content}
              </button>
            )}
          </Item>
        )
      })}
    </ItemGroup>
  )
}

function BellTrigger({
  unreadCount,
  className,
  ...props
}: { unreadCount: number } & ComponentProps<typeof Button>) {
  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : 'Notifications'
  return (
    <Button
      {...props}
      aria-label={label}
      className={cn('relative', className)}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Bell aria-hidden="true" />
      {unreadCount > 0 ? (
        <Badge
          className="absolute -top-1 -right-1 h-5 min-w-5 justify-center px-1"
          variant="default"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      ) : null}
    </Button>
  )
}

function PanelHeader({
  unreadCount,
  canMarkAll,
  onMarkAll,
  TitleTag,
}: {
  unreadCount: number
  canMarkAll: boolean
  onMarkAll: () => void
  TitleTag: ComponentType<{ children?: ReactNode; className?: string }>
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <TitleTag>Notifications</TitleTag>
      {canMarkAll ? (
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={() => void onMarkAll()}
        >
          Mark all read
        </Button>
      ) : unreadCount > 0 ? (
        <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
      ) : null}
    </div>
  )
}

export function NotificationBell() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const enabled = session != null && session.role !== 'platform'
  const {
    notifications,
    unreadCount,
    error,
    loading,
    refresh,
    markOne,
    markAll,
  } = useNotifications(enabled)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  if (!enabled) return null

  async function handleOpenItem(item: AppNotification) {
    if (item.readAt == null) {
      try {
        await markOne(item.id)
      } catch {
        // Refresh in the hook restores the unread state.
      }
    }
    setOpen(false)
  }

  const panel = (
    <NotificationList
      notifications={notifications}
      loading={loading}
      error={error}
      onOpenItem={(item) => void handleOpenItem(item)}
    />
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <BellTrigger unreadCount={unreadCount} />
        </SheetTrigger>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <PanelHeader
              TitleTag={SheetTitle}
              unreadCount={unreadCount}
              canMarkAll={unreadCount > 0 && !error}
              onMarkAll={() => void markAll()}
            />
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{panel}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <BellTrigger unreadCount={unreadCount} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0 sm:w-96">
        <PopoverHeader className="border-b p-3">
          <PanelHeader
            TitleTag={PopoverTitle}
            unreadCount={unreadCount}
            canMarkAll={unreadCount > 0 && !error}
            onMarkAll={() => void markAll()}
          />
        </PopoverHeader>
        <div className="max-h-96 overflow-y-auto p-2">{panel}</div>
      </PopoverContent>
    </Popover>
  )
}
