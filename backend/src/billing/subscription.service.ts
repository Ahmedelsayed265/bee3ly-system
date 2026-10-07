import { Injectable } from '@nestjs/common';
import {
  BillingInterval,
  BillingRegion,
  PlanTier,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingLimitException } from './billing.http';
import {
  PLAN_FEATURES,
  PLAN_LIMITS,
  TRIAL_FEATURES,
  TRIAL_LIMITS,
  type PlanFeatures,
  type PlanLimits,
} from './plans/limits';
import {
  PAST_DUE_GRACE_DAYS,
  TRIAL_DAYS,
  type BillingIntervalCode,
  type PublicPlan,
} from './plans/plans';
import { addDays } from './plans/period';

export type ResolvedAccess = {
  businessId: string;
  status: SubscriptionStatus;
  plan: PublicPlan;
  interval: BillingIntervalCode;
  region: BillingRegion;
  currency: string;
  amount: number;
  currentPeriodEnd: Date;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlan: PublicPlan | null;
  scheduledInterval: BillingIntervalCode | null;
  restricted: boolean;
  restriction: 'TRIAL_ENDED' | 'SUBSCRIPTION_INACTIVE' | null;
  limits: PlanLimits;
  features: PlanFeatures;
  trialing: boolean;
};

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async ensure(businessId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (existing) {
      await this.prisma.creditWallet.upsert({
        where: { businessId },
        create: { businessId },
        update: {},
      });
      return existing;
    }

    const now = new Date();
    const trialEndsAt = addDays(now, TRIAL_DAYS);
    try {
      const created = await this.prisma.subscription.create({
        data: {
          businessId,
          plan: PlanTier.GROWTH,
          status: SubscriptionStatus.TRIALING,
          interval: BillingInterval.MONTHLY,
          region: BillingRegion.EG,
          currency: 'USD',
          amount: 0,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
          trialEndsAt,
        },
      });
      await this.prisma.creditWallet.create({ data: { businessId } });
      await this.prisma.billingEvent.create({
        data: {
          businessId,
          type: 'TRIAL_STARTED',
          payload: { trialEndsAt: trialEndsAt.toISOString() },
        },
      });
      return created;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const row = await this.prisma.subscription.findUnique({
          where: { businessId },
        });
        if (row) return row;
      }
      throw error;
    }
  }

  async resolve(businessId: string): Promise<ResolvedAccess> {
    let sub = await this.ensure(businessId);
    const now = new Date();
    let status = sub.status;
    const overdueGraceEnd = graceEndsAt(sub);

    if (status === 'TRIALING' && sub.trialEndsAt && sub.trialEndsAt <= now) {
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      status = 'EXPIRED';
      await this.markTrialExpired(businessId);
    } else if (
      status === 'ACTIVE' &&
      sub.scheduledPlan &&
      isPublicPaidPlan(sub.scheduledPlan) &&
      sub.currentPeriodEnd <= now
    ) {
      const nextPlan = sub.scheduledPlan;
      const nextInterval = sub.scheduledInterval ?? sub.interval;
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          plan: nextPlan,
          interval: nextInterval,
          scheduledPlan: null,
          scheduledInterval: null,
          status: 'PAST_DUE',
          pastDueAt: now,
          amount: 0,
        },
      });
      await this.prisma.business.update({
        where: { id: businessId },
        data: { plan: nextPlan },
      });
      status = 'PAST_DUE';
    } else if (status === 'ACTIVE' && sub.currentPeriodEnd <= now) {
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE', pastDueAt: sub.currentPeriodEnd },
      });
      status = 'PAST_DUE';
    } else if (status === 'CANCELED' && sub.currentPeriodEnd <= now) {
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      status = 'EXPIRED';
    } else if (
      status === 'PAST_DUE' &&
      overdueGraceEnd != null &&
      overdueGraceEnd <= now
    ) {
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      status = 'EXPIRED';
    }

    const trialing = status === 'TRIALING';
    const plan = isPublicPaidPlan(sub.plan) ? sub.plan : 'GROWTH';
    const graceEnd = graceEndsAt(sub);
    const inGrace = status === 'PAST_DUE' && graceEnd != null && graceEnd > now;
    const restricted =
      status === 'EXPIRED' ||
      status === 'PAUSED' ||
      (status === 'PAST_DUE' && !inGrace);
    const neverPaid = sub.amount === 0 && !sub.provider;
    const restriction = !restricted
      ? null
      : status === 'EXPIRED' && neverPaid
        ? 'TRIAL_ENDED'
        : 'SUBSCRIPTION_INACTIVE';

    return {
      businessId,
      status,
      plan,
      interval: sub.interval,
      region: sub.region,
      currency: sub.currency,
      amount: sub.amount,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      scheduledPlan: isPublicPaidPlan(sub.scheduledPlan)
        ? sub.scheduledPlan
        : null,
      scheduledInterval: sub.scheduledInterval,
      restricted,
      restriction: restricted ? restriction : null,
      limits: trialing ? TRIAL_LIMITS : PLAN_LIMITS[plan],
      features: trialing ? TRIAL_FEATURES : PLAN_FEATURES[plan],
      trialing,
    };
  }

  assertWritable(access: ResolvedAccess) {
    if (!access.restricted) return;
    if (access.restriction === 'TRIAL_ENDED') {
      throw new BillingLimitException(
        'TRIAL_ENDED',
        'انتهت الفترة التجريبية. اختار باقة عشان تكمل استخدام بيعلى.',
      );
    }
    throw new BillingLimitException(
      'SUBSCRIPTION_INACTIVE',
      'الاشتراك مش فعال. جدد الباقة عشان تكمل.',
    );
  }

  private async markTrialExpired(businessId: string) {
    const already = await this.prisma.billingEvent.findFirst({
      where: { businessId, type: 'TRIAL_EXPIRED' },
    });
    if (already) return;
    await this.prisma.billingEvent.create({
      data: { businessId, type: 'TRIAL_EXPIRED' },
    });
  }
}

function graceEndsAt(row: { pastDueAt: Date | null }): Date | null {
  if (row.pastDueAt == null) return null;
  return addDays(row.pastDueAt, PAST_DUE_GRACE_DAYS);
}

function isPublicPaidPlan(
  plan: PlanTier | null | undefined,
): plan is PublicPlan {
  return plan === 'STARTER' || plan === 'GROWTH' || plan === 'PRO';
}
