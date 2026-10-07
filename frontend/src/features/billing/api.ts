import { api } from '@/lib/api';

export type BillingInterval = 'MONTHLY' | 'ANNUAL';
export type PublicPlan = 'STARTER' | 'GROWTH' | 'PRO';

export type UsageMeter = { used: number; limit: number };

export type BillingOverview = {
  subscription: {
    status: string;
    plan: PublicPlan | null;
    interval: BillingInterval;
    currency: string;
    amount: number;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    scheduledPlan: PublicPlan | null;
    scheduledInterval: BillingInterval | null;
    trialing: boolean;
  };
  restricted: boolean;
  restriction: 'TRIAL_ENDED' | 'SUBSCRIPTION_INACTIVE' | null;
  usage: {
    conversations: UsageMeter;
    whatsapp: UsageMeter;
    ai: UsageMeter;
    products: UsageMeter;
    orders: UsageMeter;
    campaigns: UsageMeter;
    team: UsageMeter;
    storage: UsageMeter;
    channels: UsageMeter;
    whatsappNumbers: UsageMeter;
    adAccounts: UsageMeter;
    automations: UsageMeter;
    api: UsageMeter;
  };
  warnings: Array<{ meter: string; level: 0 | 70 | 90 | 100 }>;
  credits: { whatsapp: number; ai: number };
  payments: Array<{
    id: string;
    purpose: string;
    status: string;
    amount: number;
    currency: string;
    plan: string | null;
    interval: string | null;
    createdAt: string;
  }>;
  devConfirm: boolean;
};

export type PlanLimits = {
  socialChannels: number;
  whatsappNumbers: number;
  teamMembers: number;
  products: number;
  ordersPerMonth: number;
  conversationsPerMonth: number;
  whatsappMessages: number;
  activeCampaigns: number;
  adAccounts: number;
  automations: number;
  aiActions: number;
  apiRequestsPerDay: number;
  storageBytes: number;
};

export type PlanFeatures = {
  advancedAnalytics: boolean;
  api: boolean;
  adsManagement: boolean;
  exports: 'basic' | 'yes' | 'advanced';
  prioritySupport: boolean;
};

export type CatalogPlan = {
  id: PublicPlan;
  monthly: number;
  annual: number;
  highlighted: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
};

export type BillingCatalog = {
  currency: string;
  plans: CatalogPlan[];
};

export type CheckoutResult =
  | { mode: 'current' }
  | { mode: 'scheduled'; effectiveAt: string }
  | {
      mode: 'checkout';
      paymentId: string;
      checkoutUrl: string | null;
      devConfirm: boolean;
      providerConfigured: boolean;
    };

export function fetchBillingOverview() {
  return api.get<BillingOverview>('/billing/overview').then((res) => res.data);
}

export function fetchBillingCatalog() {
  return api.get<BillingCatalog>('/billing/catalog').then((res) => res.data);
}

export function startCheckout(input: {
  plan: PublicPlan;
  interval: BillingInterval;
}) {
  return api
    .post<CheckoutResult>('/billing/checkout', input)
    .then((res) => res.data);
}

export function confirmPaymobReturn(search: string) {
  return api
    .post<{ ok: boolean; status: 'succeeded' | 'failed' }>(
      '/billing/paymob-return',
      { search },
    )
    .then((res) => res.data);
}

export function confirmDevPayment(paymentId: string) {
  return api
    .post<{ ok: boolean }>('/billing/dev/confirm', { paymentId })
    .then((res) => res.data);
}

export function cancelSubscription() {
  return api
    .post<{ accessUntil: string }>('/billing/cancel')
    .then((res) => res.data);
}
