export const VAT_RATE_BP = 1500;
export const CURRENCY = "ZAR";
export const VAT_NOTE =
  "Prices in South African Rand (ZAR), exclusive of 15% VAT.";

export type PlanCode = "starter" | "growth" | "business";

export type Plan = {
  code: PlanCode;
  name: string;
  amountCents: number;
  seatLimit: number;
};

export const PLANS: Plan[] = [
  { code: "starter", name: "Starter", amountCents: 19900, seatLimit: 15 },
  { code: "growth", name: "Growth", amountCents: 49900, seatLimit: 50 },
  { code: "business", name: "Business", amountCents: 119900, seatLimit: 200 },
];

export type PlanQuote = Plan & {
  vatCents: number;
  totalCents: number;
  currency: typeof CURRENCY;
  amountLabel: string;
  vatLabel: string;
  totalLabel: string;
};

export function isPlanCode(value: string): value is PlanCode {
  return PLANS.some((plan) => plan.code === value);
}

export function formatZarCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const rands = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const grouped = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}R${grouped}.${frac}`;
}

export function quotePlan(code: string): PlanQuote | null {
  const plan = PLANS.find((item) => item.code === code);
  if (!plan) {
    return null;
  }
  const vatCents = Math.round((plan.amountCents * VAT_RATE_BP) / 10_000);
  const totalCents = plan.amountCents + vatCents;
  return {
    ...plan,
    vatCents,
    totalCents,
    currency: CURRENCY,
    amountLabel: formatZarCents(plan.amountCents),
    vatLabel: formatZarCents(vatCents),
    totalLabel: formatZarCents(totalCents),
  };
}

export function publicPlans() {
  return PLANS.map((plan) => {
    const quote = quotePlan(plan.code)!;
    return {
      code: quote.code,
      name: quote.name,
      amountCents: quote.amountCents,
      amountLabel: formatZarCents(quote.amountCents).replace(/\.00$/, ""),
      seatLimit: quote.seatLimit,
      currency: CURRENCY,
      vatNote: VAT_NOTE,
    };
  });
}
