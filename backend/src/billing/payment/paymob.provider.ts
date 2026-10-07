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
export class PaymobProvider implements PaymentProvider {
  readonly id = 'paymob' as const;
  private readonly logger = new Logger(PaymobProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const secret = this.config.get<string>('PAYMOB_SECRET_KEY')?.trim();
    const publicKey = this.config.get<string>('PAYMOB_PUBLIC_KEY')?.trim();
    const integrationId = this.config.get<string>('PAYMOB_INTEGRATION_ID')?.trim();
    if (!secret || !publicKey || !integrationId) {
      return { configured: false };
    }

    const amountCents = input.amount * 100;
    const res = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        Authorization: `Token ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: input.currency,
        payment_methods: [Number(integrationId)],
        items: [
          {
            name: input.description,
            amount: amountCents,
            description: input.description,
            quantity: 1,
          },
        ],
        billing_data: {
          first_name: (input.customerName || 'Bee3ly').slice(0, 50),
          last_name: 'Merchant',
          email: input.email || 'billing@bee3ly.app',
          phone_number: input.phone || '+201000000000',
          apartment: 'NA',
          floor: 'NA',
          street: 'NA',
          building: 'NA',
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'Cairo',
          country: 'EG',
          state: 'NA',
        },
        special_reference: input.paymentId,
        notification_url: input.notificationUrl || undefined,
        redirection_url: input.redirectionUrl || undefined,
        extras: { paymentId: input.paymentId },
      }),
    });

    const data = (await res.json().catch(() => null)) as {
      id?: string;
      client_secret?: string;
      detail?: string;
    } | null;
    if (!res.ok || !data?.client_secret) {
      this.logger.warn(
        `Paymob intention failed ${res.status}: ${JSON.stringify(data)?.slice(0, 300)}`,
      );
      return { configured: true };
    }

    const checkoutUrl =
      `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}` +
      `&clientSecret=${encodeURIComponent(data.client_secret)}`;
    return {
      configured: true,
      checkoutUrl,
      providerReference: data.id,
    };
  }

  createSubscription(input: CheckoutInput) {
    return this.createCheckout(input);
  }

  cancelSubscription(_providerSubscriptionId: string) {
    return Promise.resolve({ supported: false });
  }

  pauseSubscription(_providerSubscriptionId: string) {
    return Promise.resolve({ supported: false });
  }

  resumeSubscription(_providerSubscriptionId: string) {
    return Promise.resolve({ supported: false });
  }

  updateSubscription(input: CheckoutInput) {
    return this.createCheckout(input);
  }

  handleWebhook(payload: unknown, hmac: string | undefined): Promise<WebhookOutcome> {
    const secret = this.config.get<string>('PAYMOB_HMAC_SECRET')?.trim();
    const obj = this.transactionObject(payload);
    if (!obj) return Promise.resolve({ paymentId: null, status: 'ignored' });
    if (!secret || !hmac || !this.hmacMatches(obj, hmac, secret)) {
      this.logger.warn('Rejected Paymob webhook with invalid HMAC');
      return Promise.resolve({ paymentId: null, status: 'ignored' });
    }

    const order = (obj.order ?? {}) as { merchant_order_id?: unknown };
    const extra = (obj.payment_key_claims as { extra?: { paymentId?: unknown } } | undefined)
      ?.extra;
    const paymentId = this.asId(order.merchant_order_id) ?? this.asId(extra?.paymentId);
    const success = obj.success === true && obj.pending !== true;
    return Promise.resolve({
      paymentId,
      status: success ? 'succeeded' : 'failed',
      providerReference: obj.id != null ? String(obj.id) : undefined,
    });
  }

  private transactionObject(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object') return null;
    const body = payload as { obj?: unknown };
    const obj = body.obj ?? payload;
    if (!obj || typeof obj !== 'object') return null;
    return obj as Record<string, unknown>;
  }

  private asId(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private hmacMatches(
    obj: Record<string, unknown>,
    hmac: string,
    secret: string,
  ) {
    const source = (obj.source_data ?? {}) as Record<string, unknown>;
    const order = (obj.order ?? {}) as Record<string, unknown>;
    const concatenated = [
      obj.amount_cents,
      obj.created_at,
      obj.currency,
      obj.error_occured,
      obj.has_parent_transaction,
      obj.id,
      obj.integration_id,
      obj.is_3d_secure,
      obj.is_auth,
      obj.is_capture,
      obj.is_refunded,
      obj.is_standalone_payment,
      obj.is_voided,
      order.id,
      obj.owner,
      obj.pending,
      source.pan,
      source.sub_type,
      source.type,
      obj.success,
    ]
      .map((value) => (value == null ? '' : String(value)))
      .join('');
    const digest = createHmac('sha512', secret).update(concatenated).digest('hex');
    const a = Buffer.from(digest);
    const b = Buffer.from(hmac);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
