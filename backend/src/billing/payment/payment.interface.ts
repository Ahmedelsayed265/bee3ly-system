export type CheckoutInput = {
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  notificationUrl?: string | null;
  redirectionUrl?: string | null;
};

export type CheckoutSession = {
  configured: boolean;
  checkoutUrl?: string;
  providerReference?: string;
};

export type WebhookOutcome = {
  paymentId: string | null;
  status: 'succeeded' | 'failed' | 'ignored';
  providerReference?: string;
};

export interface PaymentProvider {
  readonly id: 'paymob' | 'tap';
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  createSubscription(input: CheckoutInput): Promise<CheckoutSession>;
  cancelSubscription(providerSubscriptionId: string): Promise<{ supported: boolean }>;
  pauseSubscription(providerSubscriptionId: string): Promise<{ supported: boolean }>;
  resumeSubscription(providerSubscriptionId: string): Promise<{ supported: boolean }>;
  updateSubscription(input: CheckoutInput): Promise<CheckoutSession>;
  handleWebhook(
    payload: unknown,
    hmac: string | undefined,
  ): Promise<WebhookOutcome>;
}
