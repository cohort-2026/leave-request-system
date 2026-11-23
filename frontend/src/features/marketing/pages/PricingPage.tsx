import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { paths } from '../../../shared/constants/paths'
import { PLANS, VAT_NOTE } from '../plans'

export function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
      <p className="text-sm font-medium text-emerald-700">Pricing</p>
      <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
        Monthly plans in South African Rand
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
        Seat limits are the people in your company. The first month is due at
        signup.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className="flex flex-col rounded-xl border border-stone-200 bg-white p-6"
          >
            <h2 className="text-sm font-medium text-stone-500">{plan.name}</h2>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
              {plan.priceLabel}
              <span className="ml-1 text-sm font-normal text-stone-500">
                / month
              </span>
            </p>
            <p className="mt-3 mb-8 text-sm text-stone-600">
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
      <p className="mt-6 text-sm text-stone-500">{VAT_NOTE}</p>
    </div>
  )
}
