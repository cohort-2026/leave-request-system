import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

export function CompanyBrandMark({
  logoUrl,
  className,
  iconClassName,
}: {
  logoUrl?: string | null
  className?: string
  iconClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const showLogo = Boolean(logoUrl) && !failed

  if (showLogo && logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(
          'size-8 shrink-0 rounded-lg bg-white object-contain',
          className,
        )}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground',
        className,
      )}
    >
      <CalendarDays aria-hidden="true" className={cn('size-4', iconClassName)} />
    </span>
  )
}
