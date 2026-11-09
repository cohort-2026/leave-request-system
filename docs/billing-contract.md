# Billing contract

ZAR catalog, integer cents, 15% VAT at checkout. There is no live payment provider yet.

| Code | Name | Monthly (ex VAT) | Seats |
| --- | --- | --- | --- |
| `starter` | Starter | R199.00 (`19900`) | 15 |
| `growth` | Growth | R499.00 (`49900`) | 50 |
| `business` | Business | R1 199.00 (`119900`) | 200 |

VAT is 15.00% (`vatRateBp: 1500`). `vatCents = round(amountCents * 1500 / 10000)`. Currency is always `ZAR`.

## Company signup

A company is **not** created until payment completes.

1. `POST /api/companies/signup` `{ companyName, displayName, email, password, planCode }` stores a hashed checkout (1 hour) and returns the quote. No user row, no cookie.
2. `POST /api/companies/signup/mock-pay` `{ token }` is the **development** completion. It creates the company, `company_admin` (`pending_verification`), an `active` subscription, and a paid invoice, then emails the verify link. Refused when `NODE_ENV === "production"`.
3. A later live sandbox (PayFast / Paystack ITN) should call the same completion path. Do not send card numbers to this API. The mock pay page only uses test PANs in the browser.

## Addresses

### `GET /api/billing/plans` — anyone

Public catalog.

### `POST /api/companies/signup` — anyone

Creates a checkout, not a company.

- 201 checkout JSON (`checkoutToken`, plan, amounts, labels, `expiresAt`)
- 400 bad input / unknown plan
- 409 email already used
- 503 billing or companies tables missing

### `POST /api/companies/signup/mock-pay` — anyone, local only

Body: `{ "token" }`. Completes the checkout.

- 201 public user + `{ company, subscription, invoice }`
- 400 invalid, expired, or already completed checkout
- 409 email already used
- 503 when `NODE_ENV === "production"`, or tables missing

No session cookie. Card numbers are never stored.
