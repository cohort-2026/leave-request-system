/**
 * Locked ZAR catalog for the public pricing page (#106).
 * Switch to GET /api/billing/plans when that API exists (#105).
 */
export type Plan = {
  id: 'starter' | 'growth' | 'business'
  name: string
  priceZar: number
  priceLabel: string
  seatLimit: number
  trialDays?: number
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceZar: 199,
    priceLabel: 'R199',
    seatLimit: 15,
    trialDays: 14,
  },
  {
    id: 'growth',
    name: 'Growth',
    priceZar: 499,
    priceLabel: 'R499',
    seatLimit: 50,
  },
  {
    id: 'business',
    name: 'Business',
    priceZar: 1199,
    priceLabel: 'R1 199',
    seatLimit: 200,
  },
]

export const VAT_NOTE =
  'Prices in South African Rand (ZAR), exclusive of 15% VAT.'
