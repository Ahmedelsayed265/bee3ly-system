import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentPurpose } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from './credits.service';
import { EntitlementsService } from './entitlements.service';
import { PaymobProvider } from './payment/paymob.provider';
import { TapProvider } from './payment/tap.provider';
import type { PaymentProvider } from './payment/payment.interface';
import { findCreditPack, listCreditPacks } from './plans/credits';
import {
  PLAN_FEATURES,
  PLAN_LIMITS,
  TRIAL_FEATURES,
  TRIAL_LIMITS,
} from './plans/limits';
import {
  BILLING_CURRENCY,
  PLAN_PRICES,
  PUBLIC_PLANS,
  isDowngrade,
  priceFor,
  type BillingIntervalCode,
  type PublicPlan,
} from './plans/plans';
import { addBillingInterval } from './plans/period';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly access: BusinessAccessService,
    private readonly subscriptions: SubscriptionService,
    private readonly entitlements: EntitlementsService,
    private readonly credits: CreditsService,
    private readonly paymob: PaymobProvider,
    private readonly tap: TapProvider,
  ) {}

  catalog() {
    return {
      currency: BILLING_CURRENCY,
      trialDays: 7,
      plans: PUBLIC_PLANS.map((id) => ({
        id,
        monthly: PLAN_PRICES[id].MONTHLY,
        annual: PLAN_PRICES[id].ANNUAL,
        highlighted: id === 'GROWTH',
        limits: PLAN_LIMITS[id],
        features: PLAN_FEATURES[id],
      })),
      trial: { limits: TRIAL_LIMITS, features: TRIAL_FEATURES },
      creditPacks: listCreditPacks().map((pack) => ({
        ...pack,
        purchasable: this.packAmount(pack.id) != null && pack.credits != null,
      })),
    };
  }

  async overview(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const snap = await this.entitlements.snapshot(businessId);
    const payments = await this.prisma.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const { access } = snap;
    return {
      subscription: {
        status: access.status,
        plan: access.trialing ? null : access.plan,
        interval: access.interval,
        region: access.region,
        currency: access.currency,
        amount: access.amount,
        currentPeriodEnd: access.currentPeriodEnd,
        trialEndsAt: access.trialEndsAt,
        cancelAtPeriodEnd: access.cancelAtPeriodEnd,
        scheduledPlan: access.scheduledPlan,
        scheduledInterval: access.scheduledInterval,
        trialing: access.trialing,
      },
      restricted: access.restricted,
      restriction: access.restriction,
      features: access.features,
      limits: access.limits,
      usage: snap.meters,
      warnings: snap.warnings,
      credits: {
        whatsapp: snap.credits.whatsappCredits,
        ai: snap.credits.aiCredits,
      },
      payments: payments.map((payment) => ({
        id: payment.id,
        purpose: payment.purpose,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        plan: payment.plan,
        interval: payment.interval,
        createdAt: payment.createdAt,
      })),
      devConfirm: this.devConfirmEnabled(),
    };
  }

  async checkout(
    userId: string,
    input: {
      plan: PublicPlan;
      interval: BillingIntervalCode;
    },
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const access = await this.subscriptions.resolve(businessId);
    if (
      !access.trialing &&
      access.status === 'ACTIVE' &&
      access.plan === input.plan &&
      access.interval === input.interval
    ) {
      return { mode: 'current' as const };
    }
    if (
      !access.trialing &&
      access.status === 'ACTIVE' &&
      isDowngrade(
        { plan: access.plan, interval: access.interval },
        { plan: input.plan, interval: input.interval },
      )
    ) {
      await this.prisma.subscription.update({
        where: { businessId },
        data: {
          scheduledPlan: input.plan,
          scheduledInterval: input.interval,
        },
      });
      await this.prisma.billingEvent.create({
        data: {
          businessId,
          type: 'PLAN_CHANGE_SCHEDULED',
          payload: {
            plan: input.plan,
            interval: input.interval,
            effectiveAt: access.currentPeriodEnd.toISOString(),
          },
        },
      });
      return {
        mode: 'scheduled' as const,
        effectiveAt: access.currentPeriodEnd,
      };
    }

    const { amount, currency } = priceFor(input.plan, input.interval);
    return this.startCheckout({
      userId,
      businessId,
      purpose: PaymentPurpose.SUBSCRIPTION,
      amount,
      currency,
      plan: input.plan,
      interval: input.interval,
      description: `Bee3ly ${input.plan} ${input.interval}`,
    });
  }

  async checkoutCredits(userId: string, input: { packId: string }) {
    const pack = findCreditPack(input.packId);
    const amount = pack ? this.packAmount(pack.id) : null;
    if (!pack || pack.credits == null || amount == null) {
      throw new BadRequestException(
        'أسعار الرصيد الإضافي لسه بتتحدد بعد تكلفة واتساب والذكاء الاصطناعي. الباقات الأساسية متاحة دلوقتي.',
      );
    }
    const businessId = await this.access.requireBusinessId(userId);
    return this.startCheckout({
      userId,
      businessId,
      purpose: PaymentPurpose.CREDITS,
      amount,
      currency: BILLING_CURRENCY,
      creditPackId: pack.id,
      description: `Bee3ly credits ${pack.id}`,
    });
  }

  async confirmDevPayment(userId: string, paymentId: string) {
    if (!this.devConfirmEnabled()) {
      throw new NotFoundException('Not found');
    }
    const businessId = await this.access.requireBusinessId(userId);
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, businessId, status: 'PENDING' },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.activatePayment(payment.id);
    return { ok: true };
  }

  async cancel(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const sub = await this.prisma.subscription.update({
      where: { businessId },
      data: { status: 'CANCELED', cancelAtPeriodEnd: true },
    });
    if (sub.providerSubscriptionId && sub.provider) {
      await this.provider().cancelSubscription(sub.providerSubscriptionId);
    }
    await this.prisma.billingEvent.create({
      data: {
        businessId,
        type: 'SUBSCRIPTION_CANCELED',
        payload: { accessUntil: sub.currentPeriodEnd.toISOString() },
      },
    });
    return { accessUntil: sub.currentPeriodEnd };
  }

  async pause(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const sub = await this.prisma.subscription.update({
      where: { businessId },
      data: { status: 'PAUSED' },
    });
    if (sub.providerSubscriptionId && sub.provider === 'tap') {
      await this.tap.pauseSubscription(sub.providerSubscriptionId);
    }
    await this.prisma.billingEvent.create({
      data: { businessId, type: 'SUBSCRIPTION_PAUSED' },
    });
    return { status: sub.status };
  }

  async resume(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const current = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!current) throw new NotFoundException('Subscription not found');
    const status =
      current.currentPeriodEnd > new Date() ? 'ACTIVE' : 'PAST_DUE';
    const sub = await this.prisma.subscription.update({
      where: { businessId },
      data: {
        status,
        pastDueAt: status === 'PAST_DUE' ? new Date() : null,
      },
    });
    if (sub.providerSubscriptionId && sub.provider === 'tap') {
      await this.tap.resumeSubscription(sub.providerSubscriptionId);
    }
    await this.prisma.billingEvent.create({
      data: { businessId, type: 'SUBSCRIPTION_RESUMED' },
    });
    return { status: sub.status };
  }

  async activatePayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.status === 'SUCCEEDED') return;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'SUCCEEDED' },
    });
    await this.prisma.billingEvent.create({
      data: {
        businessId: payment.businessId,
        type: 'PAYMENT_SUCCEEDED',
        payload: { paymentId: payment.id, purpose: payment.purpose },
      },
    });

    if (payment.purpose === 'CREDITS' && payment.creditPackId) {
      const pack = findCreditPack(payment.creditPackId);
      if (pack?.credits) {
        await this.credits.grant({
          businessId: payment.businessId,
          kind: pack.kind,
          quantity: pack.credits,
          source: 'payment',
          externalReference: payment.id,
        });
      }
      return;
    }

    if (
      payment.purpose !== 'SUBSCRIPTION' ||
      !payment.plan ||
      !payment.interval ||
      payment.plan === 'FREE'
    ) {
      return;
    }

    const priced = priceFor(payment.plan, payment.interval);
    const periodStart = new Date();
    const periodEnd = addBillingInterval(periodStart, payment.interval);
    await this.prisma.subscription.update({
      where: { businessId: payment.businessId },
      data: {
        plan: payment.plan,
        status: 'ACTIVE',
        interval: payment.interval,
        currency: priced.currency,
        amount: priced.amount,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        pastDueAt: null,
        scheduledPlan: null,
        scheduledInterval: null,
        provider: payment.provider,
        providerSubscriptionId: payment.providerReference,
      },
    });
    await this.prisma.business.update({
      where: { id: payment.businessId },
      data: { plan: payment.plan },
    });
    await this.prisma.invoice.create({
      data: {
        businessId: payment.businessId,
        paymentId: payment.id,
        number: `BEE-${periodStart.getUTCFullYear()}-${payment.id.slice(0, 8)}`,
        amount: payment.amount,
        currency: payment.currency,
        status: 'PAID',
        periodStart,
        periodEnd,
      },
    });
    await this.prisma.billingEvent.create({
      data: {
        businessId: payment.businessId,
        type: 'SUBSCRIPTION_ACTIVATED',
        payload: {
          plan: payment.plan,
          interval: payment.interval,
          periodEnd: periodEnd.toISOString(),
        },
      },
    });
  }

  async markPaymentFailed(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.status !== 'PENDING') return;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId: payment.businessId },
    });
    if (
      sub &&
      payment.purpose === 'SUBSCRIPTION' &&
      sub.status === 'ACTIVE' &&
      payment.plan === sub.plan
    ) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE', pastDueAt: new Date() },
      });
    }
    await this.prisma.billingEvent.create({
      data: {
        businessId: payment.businessId,
        type: 'PAYMENT_FAILED',
        payload: { paymentId: payment.id },
      },
    });
  }

  private async startCheckout(input: {
    userId: string;
    businessId: string;
    purpose: PaymentPurpose;
    amount: number;
    currency: string;
    plan?: PublicPlan;
    interval?: BillingIntervalCode;
    creditPackId?: string;
    description: string;
  }) {
    const [user, business, subscription] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, name: true },
      }),
      this.prisma.business.findUnique({
        where: { id: input.businessId },
        select: { name: true },
      }),
      this.prisma.subscription.findUnique({
        where: { businessId: input.businessId },
        select: { id: true },
      }),
    ]);
    const provider = this.provider();
    const payment = await this.prisma.payment.create({
      data: {
        businessId: input.businessId,
        subscriptionId: subscription?.id,
        purpose: input.purpose,
        provider: provider.id,
        amount: input.amount,
        currency: input.currency,
        plan: input.plan,
        interval: input.interval ? input.interval : undefined,
        creditPackId: input.creditPackId,
        metadata: { currency: input.currency },
      },
    });
    const frontend = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const backend = this.config.get<string>('BACKEND_PUBLIC_URL')?.trim();
    const session = await provider.createCheckout({
      paymentId: payment.id,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      customerName: business?.name || user?.name,
      email: user?.email,
      notificationUrl: backend
        ? `${backend.replace(/\/$/, '')}/billing/webhooks/${provider.id}`
        : null,
      redirectionUrl: `${frontend.replace(/\/$/, '')}/app/billing`,
    });
    if (session.providerReference) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerReference: session.providerReference },
      });
    }
    if (!session.checkoutUrl && !this.devConfirmEnabled()) {
      throw new ServiceUnavailableException(
        'بوابة الدفع لسه مش متوصلة. الباقة هتتفعل بعد تأكيد الدفع من Paymob أو Tap.',
      );
    }
    await this.prisma.billingEvent.create({
      data: {
        businessId: input.businessId,
        type: 'CHECKOUT_CREATED',
        payload: {
          paymentId: payment.id,
          provider: provider.id,
          configured: session.configured,
        },
      },
    });
    return {
      mode: 'checkout' as const,
      paymentId: payment.id,
      checkoutUrl: session.checkoutUrl ?? null,
      devConfirm: !session.checkoutUrl && this.devConfirmEnabled(),
      providerConfigured: session.configured,
    };
  }

  private provider(): PaymentProvider {
    const paymobReady = Boolean(
      this.config.get<string>('PAYMOB_SECRET_KEY')?.trim() &&
      this.config.get<string>('PAYMOB_PUBLIC_KEY')?.trim(),
    );
    return paymobReady ? this.paymob : this.tap;
  }

  private devConfirmEnabled() {
    return this.config.get<string>('BILLING_ALLOW_DEV_CONFIRM') === 'true';
  }

  private packAmount(packId: string) {
    const raw = process.env[`CREDIT_PACK_PRICE_${packId.toUpperCase()}`];
    const amount = raw ? Number(raw) : NaN;
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }
}
