import { ApiError, apiRequest } from '../../services/api'

// GET/POST/PATCH /api/notifications* until #282 ships. A 404 uses a
// per-user local store so the bell, unread count, and Profile prefs can
// be reviewed against the issue done-when.

export const NOTIFICATION_CATEGORIES = [
  'request',
  'decision',
  'reminder',
  'digest',
  'escalation',
] as const

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]

export const NOTIFICATION_CATEGORY_COPY: Record<
  NotificationCategory,
  { label: string; emailHint: string }
> = {
  request: {
    label: 'New requests',
    emailHint: 'Email when someone submits leave you need to review.',
  },
  decision: {
    label: 'Decisions',
    emailHint: 'Email when your leave is approved or rejected.',
  },
  reminder: {
    label: 'Reminders',
    emailHint: 'Email for waiting requests and leave starting tomorrow.',
  },
  digest: {
    label: 'Daily digest',
    emailHint: 'Email a manager summary of pending requests.',
  },
  escalation: {
    label: 'Escalations',
    emailHint: 'Email when a request is escalated after the wait period.',
  },
}

export type AppNotification = {
  id: number
  category: NotificationCategory
  title: string
  body: string
  leaveRequestId: number | null
  linkPath: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationPref = {
  category: NotificationCategory
  emailEnabled: boolean
}

export type NotificationList = {
  notifications: AppNotification[]
  unreadCount: number
}

export const NOTIFICATIONS_UPDATED_EVENT = 'notifications-updated'

export function notifyNotificationsUpdated() {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
}

let boundUserId: number | null = null

export function bindNotificationUser(userId: number | null) {
  boundUserId = userId
}

function isCategory(value: unknown): value is NotificationCategory {
  return (
    typeof value === 'string' &&
    (NOTIFICATION_CATEGORIES as readonly string[]).includes(value)
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function parseNotification(value: unknown): AppNotification | null {
  const row = asRecord(value)
  if (!row) return null
  const id = pickNumber(row.id)
  const category = row.category
  const title = pickString(row.title)
  const body = pickString(row.body, row.message)
  const createdAt = pickString(row.createdAt, row.created_at)
  if (id == null || !isCategory(category) || !title || !body || !createdAt) {
    return null
  }
  return {
    id,
    category,
    title,
    body,
    leaveRequestId: pickNumber(row.leaveRequestId, row.leave_request_id),
    linkPath: pickString(row.linkPath, row.link_path),
    readAt: pickString(row.readAt, row.read_at),
    createdAt,
  }
}

function parsePref(value: unknown): NotificationPref | null {
  const row = asRecord(value)
  if (!row || !isCategory(row.category)) return null
  const emailEnabled = row.emailEnabled ?? row.email_enabled
  return {
    category: row.category,
    emailEnabled: emailEnabled !== false,
  }
}

function newestFirst(items: AppNotification[]) {
  return [...items].sort((a, b) => {
    const byDate = b.createdAt.localeCompare(a.createdAt)
    return byDate !== 0 ? byDate : b.id - a.id
  })
}

function completePrefs(items: NotificationPref[]) {
  const byCategory = new Map(items.map((item) => [item.category, item]))
  return NOTIFICATION_CATEGORIES.map(
    (category) =>
      byCategory.get(category) ?? { category, emailEnabled: true },
  )
}

function parseList(body: unknown): NotificationList {
  const record = asRecord(body)
  const rawItems = Array.isArray(body)
    ? body
    : Array.isArray(record?.notifications)
      ? record.notifications
      : Array.isArray(record?.items)
        ? record.items
        : []
  const notifications = newestFirst(
    rawItems.flatMap((item) => {
      const parsed = parseNotification(item)
      return parsed ? [parsed] : []
    }),
  )
  const unreadFromItems = notifications.filter((item) => item.readAt == null)
    .length
  const unreadCount =
    pickNumber(record?.unreadCount, record?.unread_count) ?? unreadFromItems
  return { notifications, unreadCount }
}

function parsePrefs(body: unknown): NotificationPref[] {
  const record = asRecord(body)
  const rawItems = Array.isArray(body)
    ? body
    : Array.isArray(record?.prefs)
      ? record.prefs
      : Array.isArray(record?.preferences)
        ? record.preferences
        : []
  return completePrefs(
    rawItems.flatMap((item) => {
      const parsed = parsePref(item)
      return parsed ? [parsed] : []
    }),
  )
}

function storageKey() {
  return `lrs.s12.notifications.${boundUserId ?? 'anon'}`
}

type LocalStore = {
  notifications: AppNotification[]
  prefs: NotificationPref[]
}

function sampleNotifications(): AppNotification[] {
  if (!import.meta.env.DEV) return []
  const now = Date.now()
  return [
    {
      id: 1,
      category: 'decision',
      title: 'Leave approved',
      body: 'Your leave request was approved.',
      leaveRequestId: null,
      linkPath: '/leave',
      readAt: null,
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      category: 'request',
      title: 'New leave request',
      body: 'A teammate submitted a leave request for review.',
      leaveRequestId: null,
      linkPath: '/leave',
      readAt: null,
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      category: 'reminder',
      title: 'Document reminder',
      body: 'A sick-leave request is waiting for a supporting document.',
      leaveRequestId: null,
      linkPath: '/leave',
      readAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

function readStore(): LocalStore {
  if (typeof window === 'undefined') {
    return { notifications: sampleNotifications(), prefs: completePrefs([]) }
  }
  try {
    const raw = window.localStorage.getItem(storageKey())
    if (!raw) {
      const created = {
        notifications: sampleNotifications(),
        prefs: completePrefs([]),
      }
      window.localStorage.setItem(storageKey(), JSON.stringify(created))
      return created
    }
    const parsed = JSON.parse(raw) as unknown
    const record = asRecord(parsed)
    return {
      notifications: newestFirst(
        Array.isArray(record?.notifications)
          ? record.notifications.flatMap((item) => {
              const notification = parseNotification(item)
              return notification ? [notification] : []
            })
          : sampleNotifications(),
      ),
      prefs: completePrefs(
        Array.isArray(record?.prefs)
          ? record.prefs.flatMap((item) => {
              const pref = parsePref(item)
              return pref ? [pref] : []
            })
          : [],
      ),
    }
  } catch {
    return { notifications: sampleNotifications(), prefs: completePrefs([]) }
  }
}

function writeStore(store: LocalStore) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey(), JSON.stringify(store))
}

function localList(): NotificationList {
  const notifications = newestFirst(readStore().notifications)
  return {
    notifications,
    unreadCount: notifications.filter((item) => item.readAt == null).length,
  }
}

async function withFallback<T>(request: () => Promise<T>, fallback: () => T) {
  try {
    return await request()
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return fallback()
    }
    throw error
  }
}

export function listNotifications() {
  return withFallback(
    () => apiRequest<unknown>('/api/notifications').then(parseList),
    localList,
  )
}

export function listNotificationPrefs() {
  return withFallback(
    async () => {
      try {
        return parsePrefs(await apiRequest<unknown>('/api/notifications/prefs'))
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error
        const body = await apiRequest<unknown>('/api/notifications')
        const record = asRecord(body)
        if (record && (record.prefs || record.preferences)) {
          return parsePrefs(body)
        }
        throw error
      }
    },
    () => readStore().prefs,
  )
}

export function markNotificationRead(id: number) {
  return withFallback(
    () =>
      apiRequest<unknown>(`/api/notifications/${id}/read`, {
        method: 'POST',
      }).then(() => undefined),
    () => {
      const store = readStore()
      const readAt = new Date().toISOString()
      writeStore({
        ...store,
        notifications: store.notifications.map((item) =>
          item.id === id && item.readAt == null ? { ...item, readAt } : item,
        ),
      })
    },
  ).then(() => {
    notifyNotificationsUpdated()
  })
}

export function markAllNotificationsRead() {
  return withFallback(
    () =>
      apiRequest<unknown>('/api/notifications/read-all', {
        method: 'POST',
      }).then(() => undefined),
    () => {
      const store = readStore()
      const readAt = new Date().toISOString()
      writeStore({
        ...store,
        notifications: store.notifications.map((item) =>
          item.readAt == null ? { ...item, readAt } : item,
        ),
      })
    },
  ).then(() => {
    notifyNotificationsUpdated()
  })
}

export function patchNotificationPref(
  category: NotificationCategory,
  emailEnabled: boolean,
  current: NotificationPref[] = [],
) {
  const merged = completePrefs(
    (current.length > 0 ? current : readStore().prefs).map((item) =>
      item.category === category ? { category, emailEnabled } : item,
    ),
  )
  return withFallback(
    async () => {
      const body = await apiRequest<unknown>('/api/notifications/prefs', {
        method: 'PATCH',
        body: JSON.stringify({ category, emailEnabled }),
      })
      const record = asRecord(body)
      if (
        Array.isArray(body) ||
        record?.prefs ||
        record?.preferences
      ) {
        return parsePrefs(body)
      }
      return merged
    },
    () => {
      writeStore({ ...readStore(), prefs: merged })
      return merged
    },
  )
}
