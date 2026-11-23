import { CalendarDays } from 'lucide-react'

type BrandPreviewProps = {
  companyName: string
  slogan: string
  primary: string
  logoUrl?: string | null
}

export function BrandPreview({
  companyName,
  slogan,
  primary,
  logoUrl,
}: BrandPreviewProps) {
  const name = companyName.trim() || 'Your company'

  return (
    <div
      className="overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 shadow-sm"
      style={{ ['--preview-primary' as string]: primary }}
    >
      <div
        className="flex items-center gap-2 border-b border-stone-200 px-3 py-2.5"
        style={{ borderColor: 'color-mix(in srgb, var(--preview-primary) 18%, #e7e5e4)' }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="size-8 rounded-md bg-white object-contain"
          />
        ) : (
          <span
            className="flex size-8 items-center justify-center rounded-md text-white"
            style={{ background: primary }}
          >
            <CalendarDays aria-hidden="true" className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">{name}</p>
          <p className="truncate text-xs text-stone-500">
            {slogan.trim() || 'Leave that is easy to follow'}
          </p>
        </div>
      </div>
      <div className="grid gap-3 p-3">
        <div className="rounded-lg bg-[#faf8f5] p-3 text-stone-900">
          <p className="text-xs text-stone-500">Home preview</p>
          <p className="mt-1 font-medium text-stone-900">Welcome back</p>
          <button
            type="button"
            className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: primary }}
          >
            Request leave
          </button>
        </div>
      </div>
    </div>
  )
}
