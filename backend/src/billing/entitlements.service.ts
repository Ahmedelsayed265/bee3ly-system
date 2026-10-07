import { Injectable } from '@nestjs/common';
import { CampaignStatus, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingLimitException } from './billing.http';
import { usageLevel } from './plans/limits';
import { startOfUtcMonth } from './plans/period';
import type { ResolvedAccess } from './subscription.service';
import { SubscriptionService } from './subscription.service';
import { UsageService } from './usage.service';

const ACTIVE_CAMPAIGN_STATUSES: CampaignStatus[] = [
  CampaignStatus.READY,
  CampaignStatus.ASSISTED_LAUNCH,
  CampaignStatus.SIMULATED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
];

const OCCUPIED_CHANNEL_STATUSES = [
  'CONNECTED',
  'CONNECTING',
  'SIMULATION',
  'REAUTH_REQUIRED',
  'ERROR',
] as const;

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
    private readonly usage: UsageService,
  ) {}

  access(businessId: string) {
    return this.subscriptions.resolve(businessId);
  }

  async snapshot(businessId: string) {
    const access = await this.subscriptions.resolve(businessId);
    const monthStart = startOfUtcMonth();
    const [
      products,
      orders,
      conversations,
      campaigns,
      team,
      channels,
      summary,
      apiToday,
      wallet,
    ] = await Promise.all([
      this.prisma.product.count({ where: { businessId } }),
      this.prisma.order.count({
        where: { businessId, createdAt: { gte: monthStart } },
      }),
      this.prisma.conversation.count({
        where: { businessId, createdAt: { gte: monthStart } },
      }),
      this.prisma.campaign.count({
        where: { businessId, status: { in: ACTIVE_CAMPAIGN_STATUSES } },
      }),
      this.prisma.teamMember.count({ where: { businessId } }),
      this.prisma.socialAccount.groupBy({
        by: ['platform'],
        where: {
          businessId,
          status: { in: [...OCCUPIED_CHANNEL_STATUSES] },
        },
        _count: { _all: true },
      }),
      this.usage.periodSummary(businessId),
      this.usage.apiRequestsToday(businessId),
      this.prisma.creditWallet.upsert({
        where: { businessId },
        create: { businessId },
        update: {},
      }),
    ]);

    const byPlatform = Object.fromEntries(
      channels.map((row) => [row.platform, row._count._all]),
    ) as Partial<Record<SocialPlatform, number>>;
    const whatsappNumbers = byPlatform.WHATSAPP ?? 0;
    const socialChannels =
      (byPlatform.FACEBOOK ?? 0) +
      (byPlatform.INSTAGRAM ?? 0) +
      (byPlatform.TIKTOK ?? 0);

    const meters = {
      conversations: {
        used: conversations,
        limit: access.limits.conversationsPerMonth,
      },
      whatsapp: {
        used: summary.whatsappMessages,
        limit: access.limits.whatsappMessages,
      },
      ai: { used: summary.aiActions, limit: access.limits.aiActions },
      products: { used: products, limit: access.limits.products },
      orders: { used: orders, limit: access.limits.ordersPerMonth },
      campaigns: { used: campaigns, limit: access.limits.activeCampaigns },
      team: { used: team, limit: access.limits.teamMembers },
      storage: { used: 0, limit: access.limits.storageBytes },
      channels: { used: socialChannels, limit: access.limits.socialChannels },
      whatsappNumbers: {
        used: whatsappNumbers,
        limit: access.limits.whatsappNumbers,
      },
      adAccounts: { used: 0, limit: access.limits.adAccounts },
      automations: { used: 0, limit: access.limits.automations },
      api: { used: apiToday, limit: access.limits.apiRequestsPerDay },
    };

    const warnings = (
      [
        ['whatsapp', meters.whatsapp],
        ['ai', meters.ai],
        ['conversations', meters.conversations],
      ] as const
    )
      .map(([meter, row]) => ({
        meter,
        level: usageLevel(row.used, row.limit),
      }))
      .filter((row) => row.level > 0);

    return { access, meters, warnings, credits: wallet, byPlatform };
  }

  async assertCanCreateProduct(businessId: string) {
    const { access, meters } = await this.snapshot(businessId);
    this.subscriptions.assertWritable(access);
    this.assertRoom('products', meters.products.used, meters.products.limit);
  }

  async assertCanCreateOrder(businessId: string) {
    const { access, meters } = await this.snapshot(businessId);
    this.subscriptions.assertWritable(access);
    this.assertRoom('orders', meters.orders.used, meters.orders.limit);
  }

  async assertCanCreateCampaign(businessId: string) {
    const { access, meters } = await this.snapshot(businessId);
    this.subscriptions.assertWritable(access);
    if (!access.features.adsManagement) {
      throw new BillingLimitException(
        'PLAN_FEATURE',
        'إدارة الإعلانات مش متاحة على باقتك الحالية.',
        { feature: 'adsManagement' },
      );
    }
    this.assertRoom('campaigns', meters.campaigns.used, meters.campaigns.limit);
  }

  async assertCanSend(businessId: string) {
    const access = await this.subscriptions.resolve(businessId);
    this.subscriptions.assertWritable(access);
  }

  async assertCanStartConversation(businessId: string) {
    const { access, meters } = await this.snapshot(businessId);
    this.subscriptions.assertWritable(access);
    this.assertRoom(
      'conversations',
      meters.conversations.used,
      meters.conversations.limit,
    );
  }

  async assertCanConnect(businessId: string, platform: SocialPlatform) {
    const existing = await this.prisma.socialAccount.findUnique({
      where: { businessId_platform: { businessId, platform } },
      select: { id: true },
    });
    if (existing) return;

    const { access, meters, byPlatform } = await this.snapshot(businessId);
    this.subscriptions.assertWritable(access);
    if (platform === SocialPlatform.WHATSAPP) {
      this.assertRoom(
        'whatsappNumbers',
        meters.whatsappNumbers.used,
        meters.whatsappNumbers.limit,
      );
      return;
    }

    const cap =
      platform === SocialPlatform.FACEBOOK
        ? access.limits.facebookPages
        : platform === SocialPlatform.INSTAGRAM
          ? access.limits.instagramAccounts
          : access.limits.tiktokAccounts;
    if (cap != null && (byPlatform[platform] ?? 0) >= cap) {
      this.assertRoom(platform.toLowerCase(), byPlatform[platform] ?? 0, cap);
    }
    this.assertRoom('channels', meters.channels.used, meters.channels.limit);
  }

  private assertRoom(meter: string, used: number, limit: number) {
    if (limit <= 0 || used >= limit) {
      throw new BillingLimitException(
        'USAGE_LIMIT',
        'وصلت لحد الباقة الحالية. رقّي الباقة عشان تكمل.',
        { meter, used, limit },
      );
    }
  }
}

export type { ResolvedAccess };
