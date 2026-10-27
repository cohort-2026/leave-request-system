import { useNavigate } from 'react-router-dom'
import { Button } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { PLANS, VAT_NOTE } from '../plans'

export function PricingPage() {
  const navigate = useNavigate()

  return (
    <div className="marketing-pricing">
      <section className="marketing-hero">
        <p className="eyebrow">Pricing</p>
        <h1>Monthly plans in South African Rand</h1>
        <p>
          Seat limits are the people in your company. The first month is due at
          signup.
        </p>
      </section>
      <div className="marketing-plans">
        {PLANS.map((plan) => (
          <article key={plan.id} className="marketing-plan">
            <h2 className="marketing-plan-name">{plan.name}</h2>
            <p className="marketing-plan-price">
              {plan.priceLabel} <span>/ month</span>
            </p>
            <p>Up to {plan.seatLimit} people</p>
            <Button
              variant="primary"
              type="button"
              onClick={() =>
                navigate(`${paths.startCompany}?plan=${plan.id}`)
              }
            >
              Get started
            </Button>
          </article>
        ))}
      </div>
      <p className="marketing-vat">{VAT_NOTE}</p>
    </div>
  )
}
