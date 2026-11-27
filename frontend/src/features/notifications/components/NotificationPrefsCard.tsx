import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/providers/useAuth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '../../../components/ui/field'
import { Skeleton } from '../../../components/ui/skeleton'
import { Switch } from '../../../components/ui/switch'
import { Alert } from '../../../shared/components'
import { ApiError } from '../../../services/api'
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_COPY,
  bindNotificationUser,
  listNotificationPrefs,
  patchNotificationPref,
  type NotificationCategory,
  type NotificationPref,
} from '../notificationsApi'

export function NotificationPrefsCard() {
  const { session } = useAuth()
  const [prefs, setPrefs] = useState<NotificationPref[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingCategory, setSavingCategory] =
    useState<NotificationCategory | null>(null)

  bindNotificationUser(session?.id ?? null)

  useEffect(() => {
    if (!session || session.role === 'platform') {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    listNotificationPrefs()
      .then((next) => {
        if (cancelled) return
        setPrefs(next)
        setError('')
      })
      .catch((caught) => {
        if (cancelled) return
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Unable to load notification preferences.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session])

  if (!session || session.role === 'platform') {
    return null
  }

  async function handleToggle(
    category: NotificationCategory,
    emailEnabled: boolean,
  ) {
    setError('')
    setMessage('')
    setSavingCategory(category)
    const previous = prefs
    setPrefs((current) =>
      current.map((item) =>
        item.category === category ? { ...item, emailEnabled } : item,
      ),
    )
    try {
      const next = await patchNotificationPref(
        category,
        emailEnabled,
        previous,
      )
      setPrefs(next)
      setMessage('Email preferences saved.')
    } catch (caught) {
      setPrefs(previous)
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Unable to save email preferences.',
      )
    } finally {
      setSavingCategory(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email notifications</CardTitle>
        <CardDescription>
          In-app alerts stay on. Choose which categories also send email.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        {loading ? (
          <div className="grid gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <FieldGroup>
            {NOTIFICATION_CATEGORIES.map((category) => {
              const copy = NOTIFICATION_CATEGORY_COPY[category]
              const pref = prefs.find((item) => item.category === category)
              const checked = pref?.emailEnabled !== false
              return (
                <Field
                  key={category}
                  className="justify-between"
                  orientation="horizontal"
                >
                  <FieldContent>
                    <FieldTitle>
                      <label htmlFor={`email-${category}`}>{copy.label}</label>
                    </FieldTitle>
                    <FieldDescription>{copy.emailHint}</FieldDescription>
                  </FieldContent>
                  <Switch
                    id={`email-${category}`}
                    checked={checked}
                    disabled={savingCategory === category}
                    onCheckedChange={(next) =>
                      void handleToggle(category, next)
                    }
                  />
                </Field>
              )
            })}
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  )
}
