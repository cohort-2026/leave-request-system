import type { ReactNode } from 'react'
import { cn } from '../../../lib/utils'

type PreviewKind = 'home' | 'approvals' | 'calendar'

const tabs = ['Home', 'My leave', 'Calendar']

function WindowChrome({
  title,
  activeTab,
  children,
}: {
  title: string
  activeTab: string
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_18px_50px_-24px_rgba(28,25,23,0.35)]">
      <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-3 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2 rounded-full bg-stone-300" />
          <span className="size-2 rounded-full bg-stone-300" />
          <span className="size-2 rounded-full bg-stone-300" />
        </span>
        <p className="truncate text-[11px] font-medium text-stone-500">{title}</p>
      </div>
      <div className="flex items-center gap-1 border-b border-stone-200 px-3 py-2">
        <span className="mr-2 flex size-6 items-center justify-center rounded-md bg-emerald-600 text-[10px] font-semibold text-white">
          A
        </span>
        {tabs.map((tab) => (
          <span
            key={tab}
            className={cn(
              'rounded-md px-2 py-1 text-[11px]',
              tab === activeTab
                ? 'bg-emerald-50 font-medium text-emerald-800'
                : 'text-stone-500',
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="bg-[#faf8f5] p-3">{children}</div>
    </div>
  )
}

function HomeBody() {
  const cards = [
    { name: 'Annual', remaining: '12', of: 'of 15', tone: 'bg-violet-50 text-violet-800' },
    { name: 'Sick', remaining: '8', of: 'of 10', tone: 'bg-rose-50 text-rose-800' },
    { name: 'Family', remaining: '3', of: 'of 3', tone: 'bg-amber-50 text-amber-800' },
  ]

  return (
    <>
      <p className="text-[13px] font-semibold text-stone-900">Welcome back, Thandi</p>
      <p className="mt-0.5 text-[11px] text-stone-500">
        12 days still available this year
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {cards.map((card) => (
          <div
            key={card.name}
            className={cn('rounded-lg px-2 py-2', card.tone)}
          >
            <p className="text-[10px] font-medium">{card.name}</p>
            <p className="text-lg font-semibold leading-none tracking-tight">
              {card.remaining}
            </p>
            <p className="mt-1 text-[10px] opacity-80">{card.of}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
          Pending
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-medium text-stone-900">Annual leave</p>
            <p className="text-[11px] text-stone-500">18–20 Nov · 3 working days</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            Waiting
          </span>
        </div>
      </div>
    </>
  )
}

function ApprovalsBody() {
  const rows = [
    { name: 'Sipho Ndlovu', type: 'Annual', dates: '18–20 Nov', days: '3 days' },
    { name: 'Ayesha Patel', type: 'Sick', dates: '14 Nov, morning', days: '0.5 day' },
  ]

  return (
    <>
      <p className="text-[13px] font-semibold text-stone-900">Approvals</p>
      <p className="mt-0.5 text-[11px] text-stone-500">2 requests waiting on you</p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2"
          >
            <div>
              <p className="text-[12px] font-medium text-stone-900">{row.name}</p>
              <p className="text-[11px] text-stone-500">
                {row.type} · {row.dates}
              </p>
            </div>
            <span className="text-[11px] text-stone-500">{row.days}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-1.5">
        <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] text-stone-600">
          Decline
        </span>
        <span className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white">
          Approve
        </span>
      </div>
    </>
  )
}

function CalendarBody() {
  const days = ['M', 'T', 'W', 'T', 'F']
  const marks: Record<number, 'leave' | 'holiday'> = {
    2: 'leave',
    3: 'leave',
    4: 'leave',
    11: 'holiday',
  }

  return (
    <>
      <p className="text-[13px] font-semibold text-stone-900">November 2026</p>
      <p className="mt-0.5 text-[11px] text-stone-500">Team leave and public holidays</p>
      <div className="mt-3 grid grid-cols-5 gap-1">
        {days.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className="text-center text-[10px] font-medium text-stone-400"
          >
            {day}
          </span>
        ))}
        {Array.from({ length: 15 }, (_, i) => {
          const mark = marks[i]
          return (
            <span
              key={i}
              className={cn(
                'flex h-8 items-center justify-center rounded-md text-[11px]',
                mark === 'leave' && 'bg-violet-100 font-medium text-violet-800',
                mark === 'holiday' && 'bg-stone-200 font-medium text-stone-700',
                !mark && 'bg-white text-stone-600',
              )}
            >
              {i + 2}
            </span>
          )
        })}
      </div>
    </>
  )
}

export function ProductPreview({
  kind = 'home',
  className,
}: {
  kind?: PreviewKind
  className?: string
}) {
  const title =
    kind === 'approvals'
      ? 'Leave request · Approvals'
      : kind === 'calendar'
        ? 'Leave request · Calendar'
        : 'Leave request · Acme'

  return (
    <div className={cn('pointer-events-none select-none', className)} aria-hidden="true">
      <WindowChrome
        title={title}
        activeTab={kind === 'calendar' ? 'Calendar' : 'Home'}
      >
        {kind === 'approvals' ? (
          <ApprovalsBody />
        ) : kind === 'calendar' ? (
          <CalendarBody />
        ) : (
          <HomeBody />
        )}
      </WindowChrome>
    </div>
  )
}
