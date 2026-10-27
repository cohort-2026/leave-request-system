import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageShell } from '../../../app/layouts/PageShell'
import { Alert, Button, TextField } from '../../../shared/components'
import { paths } from '../../../shared/constants/paths'
import { ApiError } from '../../../services/api'
import {
  clearSignupCheckout,
  mockPayCompanySignup,
  readSignupCheckout,
  type SignupCheckout,
} from '../api'

const SUCCESS_PAN = '4242424242424242'
const DECLINE_PAN = '4000000000000002'

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function checkoutFromState(state: unknown): SignupCheckout | null {
  if (!state || typeof state !== 'object') {
    return null
  }
  const value = state as Partial<SignupCheckout>
  if (typeof value.checkoutToken !== 'string' || typeof value.email !== 'string') {
    return null
  }
  return value as SignupCheckout
}

export function StartCompanyPayPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const checkout = useMemo(
    () => checkoutFromState(location.state) ?? readSignupCheckout(),
    [location.state],
  )
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!checkout) {
    return (
      <div className="company-signup-layout">
        <PageShell title="Payment checkout" eyebrow="Workspace setup">
          <Alert tone="error">
            This checkout is missing. Start your company again.
          </Alert>
          <p>
            <Link to={paths.startCompany}>Back to start your company</Link>
          </p>
        </PageShell>
      </div>
    )
  }

  const order = checkout

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const pan = digitsOnly(cardNumber)
    if (!expiry.trim() || digitsOnly(cvc).length < 3) {
      setError('Enter the development card details to continue.')
      return
    }
    if (pan === DECLINE_PAN) {
      setError('Payment declined. Use 4242 4242 4242 4242 for a successful development payment.')
      return
    }
    if (pan !== SUCCESS_PAN) {
      setError('Use the development card 4242 4242 4242 4242. Do not enter a real card.')
      return
    }

    setSubmitting(true)
    try {
      await mockPayCompanySignup(order.checkoutToken)
      clearSignupCheckout()
      navigate(paths.verify, {
        replace: true,
        state: { email: order.email },
      })
    } catch (payError) {
      if (payError instanceof ApiError) {
        setError(payError.message)
      } else {
        setError('Unable to complete development payment. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="company-signup-layout">
      <PageShell title="Development payment" eyebrow="Workspace setup">
        <p className="company-signup-intro">
          Complete signup for {order.companyName}. This is a local mock
          checkout. A live payment sandbox will replace it later.
        </p>
        <Alert>
          No real card is charged. Card numbers stay in the browser and are not
          sent to the API. Success: 4242 4242 4242 4242. Decline: 4000 0000 0000
          0002.
        </Alert>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <dl className="company-signup-summary">
          <div>
            <dt>Plan</dt>
            <dd>
              {order.plan.name} · up to {order.plan.seatLimit} people
            </dd>
          </div>
          <div>
            <dt>Subtotal (ex VAT)</dt>
            <dd>{order.amountLabel}</dd>
          </div>
          <div>
            <dt>VAT 15%</dt>
            <dd>{order.vatLabel}</dd>
          </div>
          <div>
            <dt>Due today</dt>
            <dd>{order.totalLabel} {order.currency}</dd>
          </div>
        </dl>
        <form className="flex flex-col gap-stack" onSubmit={handleSubmit}>
          <TextField
            label="Card number"
            name="mock-card-number"
            inputMode="numeric"
            autoComplete="off"
            value={cardNumber}
            onChange={(event) => setCardNumber(event.target.value)}
            hint="Development only. Do not enter a real card number."
            required
            disabled={submitting}
          />
          <div className="company-signup-card-row">
            <TextField
              label="Expiry"
              name="mock-card-expiry"
              placeholder="MM/YY"
              autoComplete="off"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              required
              disabled={submitting}
            />
            <TextField
              label="CVC"
              name="mock-card-cvc"
              inputMode="numeric"
              autoComplete="off"
              value={cvc}
              onChange={(event) => setCvc(event.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Paying…' : `Pay ${order.totalLabel} (mock)`}
          </Button>
        </form>
        <p>
          <Link to={paths.startCompany}>Back</Link>
        </p>
      </PageShell>
      <aside className="company-signup-aside" aria-label="Workspace setup">
        <p className="company-signup-aside-label">Built for your team</p>
        <h2>A development stand-in for sandbox checkout.</h2>
        <p>
          Later this step becomes PayFast or Paystack. The company is created
          only after payment succeeds.
        </p>
        <ol className="company-signup-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Create your workspace</strong>
              <small>Company and admin details are held on the checkout.</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Pay (development)</strong>
              <small>Mock pay records a ZAR invoice with 15% VAT.</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Verify your email</strong>
              <small>Then enroll two-factor authentication on first login.</small>
            </div>
          </li>
        </ol>
        <p className="company-signup-aside-footnote">
          Live charges are not taken in this environment.
        </p>
      </aside>
    </div>
  )
}
