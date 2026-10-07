import { Injectable } from '@nestjs/common';
import {
  CreditKind,
  NotificationType,
  Prisma,
  UsageMeter,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingLimitException } from './billing.http';
import { usageLevel } from './plans/limits';
import { monthKey, startOfUtcDay } from './plans/period';
import { SubscriptionService } from './subscription.service';

const WARNING_COPY: Record<
  'whatsapp' | 'ai',
  Record<70 | 90 | 100, { title: string; body: string }>
> = {
  whatsapp: {
    70: {
      title: 'استخدام واتساب',
      body: 'استخدمت ٧٠٪ من استخدام واتساب المتضمن في باقتك.',
    },
    90: {
      title: 'استخدام واتساب قرب يخلص',
      body: 'استخدام واتساب قرب يخلص. تقدر ترقّي الباقة أو تشتري استخدام إضافي.',
    },
    100: {
      title: 'خلّص استخدام واتساب',
      body: 'وصلت لحد استخدام واتساب المتضمن. رقّي الباقة أو اشتري استخدام إضافي عشان تكمل.',
    },
  },
  ai: {
    70: {
      title: 'استخدام الذكاء الاصطناعي',
      body: 'استخدمت ٧٠٪ من إجراءات الذكاء الاصطناعي المتضمنة في باقتك.',
    },
    90: {
      title: 'رصيد الذكاء الاصطناعي قرب يخلص',
      body: 'إجراءات الذكاء الاصطناعي قرب تخلص. رقّي الباقة أو اشتري رصيد إضافي.',
    },
    100: {
      title: 'خلّص رصيد الذكاء الاصطناعي',
      body: 'خلصت استخدام الذكاء الاصطناعي المتضمن. اشتري رصيد إضافي أو رقّي الباقة.',
    },
  },
};

@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly notifications: NotificationsService,
  ) {}

  async periodSummary(businessId: string) {
    const periodKey = monthKey();
    return this.prisma.usageSummary.upsert({
      where: { businessId_periodKey: { businessId, periodKey } },
      create: { businessId, periodKey },
      update: {},
    });
  }

  async apiRequestsToday(businessId: string) {
    const grouped = await this.prisma.usageRecord.aggregate({
      where: {
        businessId,
        type: UsageMeter.API_REQUEST,
        createdAt: { gte: startOfUtcDay() },
      },
      _sum: { quantity: true },
    });
    return grouped._sum.quantity ?? 0;
  }

  async hasAiCapacity(businessId: string, quantity: number) {
    const access = await this.subscriptions.resolve(businessId);
    if (access.restricted || !access.features.ai) return false;
    const summary = await this.periodSummary(businessId);
    const wallet = await this.wallet(businessId);
    const includedLeft = Math.max(
      0,
      access.limits.aiActions - summary.aiActions,
    );
    return includedLeft + wallet.aiCredits >= quantity;
  }

  async consumeAi(
    businessId: string,
    quantity: number,
    source: string,
    externalReference?: string,
  ) {
    await this.consumeMetered({
      businessId,
      meter: 'ai',
      quantity,
      source,
      externalReference,
    });
  }

  async assertWhatsAppAvailable(businessId: string) {
    await this.assertMeteredRoom(businessId, 'whatsapp', 1);
  }

  async consumeWhatsApp(
    businessId: string,
    quantity: number,
    source: string,
    externalReference?: string,
  ) {
    await this.consumeMetered({
      businessId,
      meter: 'whatsapp',
      quantity,
      source,
      externalReference,
    });
  }

  async recordConversation(businessId: string, conversationId: string) {
    await this.recordAudit({
      businessId,
      type: UsageMeter.CONVERSATION,
      quantity: 1,
      unit: 'conversation',
      source: 'conversation_opened',
      externalReference: conversationId,
    });
  }

  async recordOrder(businessId: string, orderId: string) {
    await this.recordAudit({
      businessId,
      type: UsageMeter.ORDER,
      quantity: 1,
      unit: 'order',
      source: 'order_created',
      externalReference: orderId,
    });
  }

  private async assertMeteredRoom(
    businessId: string,
    meter: 'whatsapp' | 'ai',
    quantity: number,
  ) {
    const access = await this.subscriptions.resolve(businessId);
    this.subscriptions.assertWritable(access);
    const summary = await this.periodSummary(businessId);
    const wallet = await this.wallet(businessId);
    const used =
      meter === 'whatsapp' ? summary.whatsappMessages : summary.aiActions;
    const limit =
      meter === 'whatsapp'
        ? access.limits.whatsappMessages
        : access.limits.aiActions;
    const credits =
      meter === 'whatsapp' ? wallet.whatsappCredits : wallet.aiCredits;
    const includedLeft = Math.max(0, limit - used);
    if (includedLeft + credits < quantity) {
      throw new BillingLimitException(
        'USAGE_LIMIT',
        meter === 'whatsapp'
          ? WARNING_COPY.whatsapp[100].body
          : WARNING_COPY.ai[100].body,
        { meter },
      );
    }
  }

  private async consumeMetered(input: {
    businessId: string;
    meter: 'whatsapp' | 'ai';
    quantity: number;
    source: string;
    externalReference?: string;
  }) {
    await this.assertMeteredRoom(input.businessId, input.meter, input.quantity);
    const access = await this.subscriptions.resolve(input.businessId);
    const periodKey = monthKey();
    const limit =
      input.meter === 'whatsapp'
        ? access.limits.whatsappMessages
        : access.limits.aiActions;
    const summaryField =
      input.meter === 'whatsapp' ? 'whatsappMessages' : 'aiActions';
    const creditField =
      input.meter === 'whatsapp' ? 'whatsappCredits' : 'aiCredits';
    const kind: CreditKind = input.meter === 'whatsapp' ? 'WHATSAPP' : 'AI';

    const result = await this.prisma.$transaction(async (tx) => {
      const summary = await tx.usageSummary.upsert({
        where: {
          businessId_periodKey: { businessId: input.businessId, periodKey },
        },
        create: { businessId: input.businessId, periodKey },
        update: {},
      });
      const wallet = await tx.creditWallet.upsert({
        where: { businessId: input.businessId },
        create: { businessId: input.businessId },
        update: {},
      });
      const used = summary[summaryField];
      const includedLeft = Math.max(0, limit - used);
      const fromIncluded = Math.min(input.quantity, includedLeft);
      const fromCredits = input.quantity - fromIncluded;
      if (fromCredits > wallet[creditField]) {
        throw new BillingLimitException(
          'USAGE_LIMIT',
          input.meter === 'whatsapp'
            ? WARNING_COPY.whatsapp[100].body
            : WARNING_COPY.ai[100].body,
          { meter: input.meter },
        );
      }
      const updated = await tx.usageSummary.update({
        where: { id: summary.id },
        data: { [summaryField]: { increment: fromIncluded } },
      });
      let balanceAfter = wallet[creditField];
      if (fromCredits > 0) {
        const nextWallet = await tx.creditWallet.update({
          where: { id: wallet.id },
          data: { [creditField]: { decrement: fromCredits } },
        });
        balanceAfter = nextWallet[creditField];
        await tx.creditTransaction.create({
          data: {
            businessId: input.businessId,
            kind,
            delta: -fromCredits,
            balanceAfter,
            source: input.source,
            externalReference: input.externalReference,
          },
        });
      }
      await tx.usageRecord.create({
        data: {
          businessId: input.businessId,
          type:
            input.meter === 'whatsapp'
              ? UsageMeter.WHATSAPP_MESSAGE
              : UsageMeter.AI_ACTION,
          quantity: input.quantity,
          unit: input.meter === 'whatsapp' ? 'message' : 'action',
          source: input.source,
          externalReference: input.externalReference,
          metadata: { fromIncluded, fromCredits },
        },
      });
      return { used: updated[summaryField], flags: updated.warningFlags };
    });

    await this.warnIfNeeded(
      input.businessId,
      input.meter,
      result.used,
      limit,
      result.flags,
      periodKey,
    );
  }

  private async warnIfNeeded(
    businessId: string,
    meter: 'whatsapp' | 'ai',
    used: number,
    limit: number,
    flags: Prisma.JsonValue,
    periodKey: string,
  ) {
    const level = usageLevel(used, limit);
    if (level === 0) return;
    const key = `${meter}:${level}`;
    const current =
      flags && typeof flags === 'object' && !Array.isArray(flags)
        ? (flags as Record<string, boolean>)
        : {};
    if (current[key]) return;
    const copy = WARNING_COPY[meter][level];
    await this.prisma.usageSummary.update({
      where: { businessId_periodKey: { businessId, periodKey } },
      data: { warningFlags: { ...current, [key]: true } },
    });
    await this.prisma.billingEvent.create({
      data: {
        businessId,
        type: 'USAGE_WARNING',
        payload: { meter, level, used, limit },
      },
    });
    await this.notifications.create(businessId, {
      type: NotificationType.SYSTEM,
      title: copy.title,
      body: copy.body,
      data: { meter, level },
    });
  }

  private wallet(businessId: string) {
    return this.prisma.creditWallet.upsert({
      where: { businessId },
      create: { businessId },
      update: {},
    });
  }

  private async recordAudit(input: {
    businessId: string;
    type: UsageMeter;
    quantity: number;
    unit: string;
    source: string;
    externalReference?: string;
  }) {
    await this.prisma.usageRecord.create({ data: input });
  }
}
