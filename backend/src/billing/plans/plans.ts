export const PUBLIC_PLANS = ['STARTER', 'GROWTH', 'PRO'] as const;
export type PublicPlan = (typeof PUBLIC_PLANS)[number];
export type BillingIntervalCode = 'MONTHLY' | 'ANNUAL';

export const BILLING_CURRENCY = 'USD' as const;

export const TRIAL_DAYS = 7;
export const PAST_DUE_GRACE_DAYS = 3;

/** One public price list. Annual is 10 months of the monthly price. */
export const PLAN_PRICES: Record<
  PublicPlan,
  { MONTHLY: number; ANNUAL: number }
> = {
  STARTER: { MONTHLY: 9, ANNUAL: 90 },
  GROWTH: { MONTHLY: 19, ANNUAL: 190 },
  PRO: { MONTHLY: 39, ANNUAL: 390 },
};

export const PLAN_RANK: Record<PublicPlan, number> = {
  STARTER: 1,
  GROWTH: 2,
  PRO: 3,
};

export function priceFor(plan: PublicPlan, interval: BillingIntervalCode) {
  return { amount: PLAN_PRICES[plan][interval], currency: BILLING_CURRENCY };
}

export function isPublicPlan(value: string): value is PublicPlan {
  return (PUBLIC_PLANS as readonly string[]).includes(value);
}

/** Lower plan, or the same plan moving from annual back to monthly. */
export function isDowngrade(
  current: { plan: PublicPlan; interval: BillingIntervalCode },
  next: { plan: PublicPlan; interval: BillingIntervalCode },
) {
  if (PLAN_RANK[next.plan] < PLAN_RANK[current.plan]) return true;
  return (
    next.plan === current.plan &&
    current.interval === 'ANNUAL' &&
    next.interval === 'MONTHLY'
  );
}
