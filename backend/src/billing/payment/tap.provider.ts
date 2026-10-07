import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CheckoutInput,
  CheckoutSession,
  PaymentProvider,
  WebhookOutcome,
} from './payment.interface';

@Injectable()
export class TapProvider implements PaymentProvider {
  readonly id = 'tap' as const;
  private readonly logger = new Logger(TapProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const secret = this.config.get<string>('TAP_SECRET_KEY')?.trim();
    if (!secret) return { configured: false };

    const res = await fetch('https://api.tap.company/v2/charges', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        customer_initiated: true,
        threeDSecure: true,
        description: input.description,
        metadata: { paymentId: input.paymentId },
        reference: { transaction: input.paymentId, order: input.paymentId },
        receipt: { email: true, sms: false },
        customer: {
          first_name: input.customerName || 'Bee3ly',
          email: input.email || 'billing@bee3ly.app',
          phone: { country_code: '966', number: '500000000' },
        },
        source: { id: 'src_all' },
        post: input.notificationUrl
          ? { url: input.notificationUrl }
          : undefined,
        redirect: input.redirectionUrl
          ? { url: input.redirectionUrl }
          : undefined,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      id?: string;
      transaction?: { url?: string };
    } | null;
    if (!res.ok || !data?.transaction?.url) {
      this.logger.warn(
        `Tap charge failed ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`,
      );
      return { configured: true };
    }
    return {
      configured: true,
      checkoutUrl: data.transaction.url,
      providerReference: data.id,
    };
  }

  createSubscription(input: CheckoutInput) {
    return this.createCheckout(input);
  }

  cancelSubscription(providerSubscriptionId: string) {
    void providerSubscriptionId;
    return Promise.resolve({ supported: false });
  }

  pauseSubscription(providerSubscriptionId: string) {
    void providerSubscriptionId;
    return Promise.resolve({ supported: false });
  }

  resumeSubscription(providerSubscriptionId: string) {
    void providerSubscriptionId;
    return Promise.resolve({ supported: false });
  }

  updateSubscription(input: CheckoutInput) {
    return this.createCheckout(input);
  }

  handleWebhook(
    payload: unknown,
    hmac: string | undefined,
  ): Promise<WebhookOutcome> {
    const secret = this.config.get<string>('TAP_SECRET_KEY')?.trim();
    if (!payload || typeof payload !== 'object') {
      return Promise.resolve({ paymentId: null, status: 'ignored' });
    }
    const body = payload as {
      id?: unknown;
      amount?: unknown;
      currency?: unknown;
      status?: unknown;
      reference?: { payment?: unknown; gateway?: unknown };
      metadata?: { paymentId?: unknown };
      response?: { code?: unknown };
    };
    if (!secret || !hmac || !this.hashMatches(body, hmac, secret)) {
      this.logger.warn('Rejected Tap webhook with invalid hash');
      return Promise.resolve({ paymentId: null, status: 'ignored' });
    }
    const paymentId =
      typeof body.metadata?.paymentId === 'string'
        ? body.metadata.paymentId
        : null;
    const status =
      typeof body.status === 'string' ? body.status.toUpperCase() : '';
    const succeeded = status === 'CAPTURED' || status === 'SUCCESS';
    const failed =
      status === 'FAILED' || status === 'CANCELLED' || status === 'DECLINED';
    return Promise.resolve({
      paymentId,
      status: succeeded ? 'succeeded' : failed ? 'failed' : 'ignored',
      providerReference: typeof body.id === 'string' ? body.id : undefined,
    });
  }

  private text(value: unknown): string {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }
    return '';
  }

  private hashMatches(
    body: {
      id?: unknown;
      amount?: unknown;
      currency?: unknown;
      status?: unknown;
      reference?: { payment?: unknown; gateway?: unknown };
    },
    hmac: string,
    secret: string,
  ) {
    const toHash = [
      `x_id${this.text(body.id)}`,
      `x_amount${this.text(body.amount)}`,
      `x_currency${this.text(body.currency)}`,
      `x_gateway_reference${this.text(body.reference?.gateway)}`,
      `x_payment_reference${this.text(body.reference?.payment)}`,
      `x_status${this.text(body.status)}`,
    ].join('');
    const digest = createHmac('sha256', secret).update(toHash).digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(hmac);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
