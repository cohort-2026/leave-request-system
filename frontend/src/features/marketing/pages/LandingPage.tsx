import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { paths } from '../../../shared/constants/paths'
import { PLANS, VAT_NOTE } from '../plans'
import { ProductPreview } from '../components/ProductPreview'

const jobs = [
  {
    kind: 'home' as const,
    title: 'See what is left before anyone books',
    body: 'Home shows entitled, taken, pending, and available days for each leave type. Unpaid leave is marked as no limit, so staff are not blocked by a zero balance.',
  },
  {
    kind: 'approvals' as const,
    title: 'Approve from one queue',
    body: 'Staff request leave. Managers and company admins review it in one place, with the working-day count already calculated. A sole admin is approved automatically when nobody else can review.',
  },
  {
    kind: 'calendar' as const,
    title: 'Keep the company calendar honest',
    body: 'Each workspace has its own people, working week, and public holidays. Leave marks sit on the same calendar, so clashes are visible before you say yes.',
  },
]

const steps = [
  {
    n: '1',
    title: 'Start the company',
    body: 'Name the workspace, pick a monthly plan, and pay the first month. You become the company admin.',
  },
  {
    n: '2',
    title: 'Invite the team',
    body: 'Share one invite link. People join as staff, verify email, and set an authenticator. Promote managers later.',
  },
  {
    n: '3',
    title: 'Book and approve',
    body: 'Staff request time off against live balances. You review the queue. The calendar updates when leave is approved.',
  },
]

const faqs = [
  {
    q: 'Do people register themselves?',
    a: 'No public register. You start the company, then staff join with the invite link you create. Sign in is for people who already have an account.',
  },
  {
    q: 'What currency is this?',
    a: VAT_NOTE + ' The first month is due at signup.',
  },
  {
    q: 'Can each company look like itself?',
    a: 'Yes. After you are in, Appearance lets you set a logo, slogan, and colours. Those show on the signed-in app for that company.',
  },
  {
    q: 'I already have an invite. Where do I go?',
    a: 'Open the link your admin sent. It takes you to join that company. Use Sign in if your account is already set up.',
  },
]

function CtaRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <Button asChild size="lg" className="h-11 px-5 text-sm">
        <Link to={paths.startCompany}>Start your company</Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="h-11 px-5 text-sm">
        <Link to={paths.login}>Sign in</Link>
      </Button>
    </div>
  )
}

export function LandingPage() {
  return (
    <div>
      <section className="border-b border-stone-200">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:py-20">
          <div>
            <p className="text-sm font-medium text-emerald-700">Leave for companies</p>
            <h1 className="mt-3 max-w-xl text-[2.15rem] font-semibold tracking-tight text-stone-900 sm:text-5xl sm:leading-[1.08]">
              Leave requests, without the spreadsheet.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-stone-600 sm:text-lg">
              Staff book time off. Managers approve it. Each company keeps its
              own people, rules, and calendar, billed monthly in Rand.
            </p>
            <CtaRow className="mt-8" />
            <p className="mt-4 text-sm text-stone-500">
              First month due at signup.{' '}
              <Link
                to={paths.pricing}
                className="font-medium text-stone-800 underline-offset-4 hover:underline"
              >
                See pricing in ZAR
              </Link>
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8">
          <p className="text-sm leading-6 text-stone-600">
            <span className="block font-semibold text-stone-900">
              One workspace per company
            </span>
            People, leave types, and the calendar stay inside that company.
          </p>
          <p className="text-sm leading-6 text-stone-600">
            <span className="block font-semibold text-stone-900">
              Balances you can show staff
            </span>
            Entitled, taken, pending, and available — including half days.
          </p>
          <p className="text-sm leading-6 text-stone-600">
            <span className="block font-semibold text-stone-900">
              Plans from R199 / month
            </span>
            Starter, Growth, and Business. Seat limits are the people in the
            company.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <p className="text-sm font-medium text-emerald-700">How it works</p>
        <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-stone-900">
          Open the company, then run leave from there.
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.n}>
              <span className="inline-flex size-8 items-center justify-center rounded-full border border-stone-200 text-sm font-semibold text-stone-800">
                {step.n}
              </span>
              <h3 className="mt-4 text-base font-semibold text-stone-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl space-y-20 px-5 py-16 sm:px-8">
          {jobs.map((job, index) => (
            <div
              key={job.title}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <div className={index % 2 === 1 ? 'lg:order-2' : undefined}>
                <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                  {job.title}
                </h2>
                <p className="mt-4 max-w-md text-base leading-7 text-stone-600">
                  {job.body}
                </p>
              </div>
              <ProductPreview
                kind={job.kind}
                className={index % 2 === 1 ? 'lg:order-1' : undefined}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Pricing</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
              Monthly plans in Rand
            </h2>
          </div>
          <Link
            to={paths.pricing}
            className="text-sm font-medium text-stone-800 underline-offset-4 hover:underline"
          >
            Full pricing
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-xl border border-stone-200 bg-white p-5"
            >
              <h3 className="text-sm font-medium text-stone-500">{plan.name}</h3>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                {plan.priceLabel}
                <span className="ml-1 text-sm font-normal text-stone-500">
                  / month
                </span>
              </p>
              <p className="mt-2 mb-6 text-sm text-stone-600">
                Up to {plan.seatLimit} people
              </p>
              <Button asChild className="mt-auto h-10">
                <Link to={`${paths.startCompany}?plan=${plan.id}`}>
                  Start your company
                </Link>
              </Button>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-stone-500">{VAT_NOTE}</p>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
            Questions before you start
          </h2>
          <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
            {faqs.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="cursor-pointer list-none text-base font-medium text-stone-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {item.q}
                    <span className="mt-0.5 text-stone-400 group-open:hidden">
                      +
                    </span>
                    <span className="mt-0.5 hidden text-stone-400 group-open:inline">
                      −
                    </span>
                  </span>
                </summary>
                <p className="mt-2 max-w-prose text-sm leading-6 text-stone-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-stone-900">
            Start the company, then invite the team.
          </h2>
          <p className="mt-3 max-w-lg text-base leading-7 text-stone-600">
            You will verify email and set an authenticator before anyone books
            leave. That is the same path staff use after they join.
          </p>
          <CtaRow className="mt-8" />
        </div>
      </section>
    </div>
  )
}
