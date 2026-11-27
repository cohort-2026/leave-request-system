import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { ApiError } from '../../services/api'
import {
  NOTIFICATIONS_UPDATED_EVENT,
  bindNotificationUser,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from './notificationsApi'

export function useNotifications(enabled: boolean) {
  const { session } = useAuth()
  bindNotificationUser(session?.id ?? null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(enabled)

  const refresh = useCallback(() => {
    if (!enabled) {
      setNotifications([])
      setUnreadCount(0)
      setError('')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    listNotifications()
      .then((result) => {
        if (!active) return
        setNotifications(result.notifications)
        setUnreadCount(result.unreadCount)
        setError('')
      })
      .catch((caught) => {
        if (!active) return
        setNotifications([])
        setUnreadCount(0)
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Unable to load notifications.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [enabled])

  useEffect(() => {
    const cancel = refresh()
    return () => {
      cancel?.()
    }
  }, [refresh])

  useEffect(() => {
    if (!enabled) return
    const onUpdate = () => {
      refresh()
    }
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate)
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdate)
    }
  }, [enabled, refresh])

  const markOne = useCallback(async (id: number) => {
    setNotifications((current) => {
      const readAt = new Date().toISOString()
      return current.map((item) =>
        item.id === id && item.readAt == null ? { ...item, readAt } : item,
      )
    })
    setUnreadCount((count) => Math.max(0, count - 1))
    try {
      await markNotificationRead(id)
    } catch (caught) {
      refresh()
      throw caught
    }
  }, [refresh])

  const markAll = useCallback(async () => {
    const readAt = new Date().toISOString()
    setNotifications((current) =>
      current.map((item) =>
        item.readAt == null ? { ...item, readAt } : item,
      ),
    )
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch (caught) {
      refresh()
      throw caught
    }
  }, [refresh])

  return {
    notifications,
    unreadCount,
    error,
    loading,
    refresh,
    markOne,
    markAll,
  }
}
