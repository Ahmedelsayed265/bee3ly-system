import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Internal commercial snapshot. COGS is not invented until it is measured. */
  async snapshot() {
    const [active, trialing, expiredTrials, activated, canceled] =
      await Promise.all([
        this.prisma.subscription.findMany({
          where: { status: 'ACTIVE' },
          select: { amount: true, interval: true },
        }),
        this.prisma.subscription.count({ where: { status: 'TRIALING' } }),
        this.prisma.billingEvent.count({ where: { type: 'TRIAL_EXPIRED' } }),
        this.prisma.billingEvent.count({
          where: { type: 'SUBSCRIPTION_ACTIVATED' },
        }),
        this.prisma.subscription.count({ where: { status: 'CANCELED' } }),
      ]);

    const mrr = active.reduce((sum, sub) => {
      const monthly = sub.interval === 'ANNUAL' ? sub.amount / 12 : sub.amount;
      return sum + monthly;
    }, 0);
    const paying = active.length;
    const trialsClosed = expiredTrials + activated;

    return {
      mrr: round(mrr),
      arr: round(mrr * 12),
      arpu: paying ? round(mrr / paying) : 0,
      payingCustomers: paying,
      trialing,
      trialToPaid: trialsClosed
        ? round(activated / trialsClosed)
        : null,
      canceled,
      cogsPerCustomer: null,
      grossMargin: null,
    };
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
