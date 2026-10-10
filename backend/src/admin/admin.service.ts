import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { BillingMetricsService } from '../billing/billing.metrics.service';
import {
  PLAN_LIMITS,
  TRIAL_LIMITS,
  usageLevel,
} from '../billing/plans/limits';
import { monthKey, startOfUtcMonth } from '../billing/plans/period';
import { PrismaService } from '../prisma/prisma.service';

function planLimits(plan: string, status: string | null) {
  if (status === 'TRIALING') return TRIAL_LIMITS;
  if (plan === 'STARTER' || plan === 'GROWTH' || plan === 'PRO') {
    return PLAN_LIMITS[plan];
  }
  return null;
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function meter(used: number, limit: number | null) {
  return {
    used,
    limit,
    level: limit == null ? 0 : usageLevel(used, limit),
  };
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly metrics: BillingMetricsService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.upsert({
      where: { email },
      update: { isPlatformAdmin: true, passwordHash },
      create: {
        email,
        name: 'Bee3ly Admin',
        passwordHash,
        isPlatformAdmin: true,
      },
    });
    this.logger.log(`Platform admin ready for ${email}`);
  }

  async overview() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);
    const [
      users,
      businesses,
      orders,
      revenue,
      openConversations,
      connectedChannels,
      plans,
      businessesWithoutSubscription,
      weekOrders,
      recentBusinesses,
      metrics,
      messagesLast30Days,
      needsHuman,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.order.count({ where: { createdAt: { gte: since } } }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { totalEgp: true },
      }),
      this.prisma.conversation.count({ where: { status: 'OPEN' } }),
      this.prisma.socialAccount.count({ where: { status: 'CONNECTED' } }),
      this.prisma.subscription.groupBy({
        by: ['plan'],
        _count: { _all: true },
      }),
      this.prisma.business.count({ where: { subscription: null } }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { createdAt: true, totalEgp: true },
      }),
      this.prisma.business.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          plan: true,
          createdAt: true,
          subscription: { select: { plan: true, status: true } },
          _count: { select: { orders: true } },
        },
      }),
      this.metrics.snapshot(),
      this.prisma.message.count({ where: { createdAt: { gte: since } } }),
      this.prisma.conversation.count({
        where: { needsHuman: true, status: 'OPEN' },
      }),
    ]);
    const usage = await this.usage();

    const sales = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      const key = localDayKey(day);
      const matched = weekOrders.filter(
        (order) => localDayKey(order.createdAt) === key,
      );
      return {
        day: key,
        orders: matched.length,
        revenueEgp: matched.reduce((sum, order) => sum + order.totalEgp, 0),
      };
    });

    return {
      users,
      businesses,
      ordersLast30Days: orders,
      revenueEgpLast30Days: revenue._sum.totalEgp ?? 0,
      openConversations,
      needsHuman,
      messagesLast30Days,
      connectedChannels,
      billing: metrics,
      plans: [
        ...plans.map((row) => ({ plan: row.plan, count: row._count._all })),
        ...(businessesWithoutSubscription
          ? [{ plan: 'FREE', count: businessesWithoutSubscription }]
          : []),
      ],
      sales,
      recentBusinesses: recentBusinesses.map((row) => ({
        id: row.id,
        name: row.name,
        plan: row.subscription?.plan ?? row.plan,
        status: row.subscription?.status ?? null,
        orders: row._count.orders,
        createdAt: row.createdAt,
      })),
      alerts: usage
        .filter((row) => row.level >= 70)
        .slice(0, 8),
    };
  }

  async businesses(search = '') {
    const query = search.trim();
    const rows = await this.prisma.business.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              {
                members: {
                  some: {
                    user: { email: { contains: query, mode: 'insensitive' } },
                  },
                },
              },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        members: {
          where: { role: 'OWNER' },
          take: 1,
          include: { user: { select: { email: true, name: true } } },
        },
        subscription: { select: { plan: true, status: true } },
        _count: {
          select: { orders: true, conversations: true, products: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      plan: row.subscription?.plan ?? row.plan,
      subscriptionStatus: row.subscription?.status ?? null,
      ownerName: row.members[0]?.user.name ?? null,
      ownerEmail: row.members[0]?.user.email ?? null,
      orders: row._count.orders,
      conversations: row._count.conversations,
      products: row._count.products,
      createdAt: row.createdAt,
    }));
  }

  async business(id: string) {
    const row = await this.prisma.business.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        subscription: true,
        socialAccounts: {
          select: { platform: true, status: true, displayName: true },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalEgp: true,
            customerName: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            conversations: true,
            products: true,
            campaigns: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Business not found');
    const monthStart = startOfUtcMonth();
    const plan = row.subscription?.plan ?? row.plan;
    const status = row.subscription?.status ?? null;
    const limits = planLimits(plan, status);
    const [summary, messageRoles, conversationStatuses, conversationChannels] =
      await Promise.all([
        this.prisma.usageSummary.findUnique({
          where: {
            businessId_periodKey: { businessId: id, periodKey: monthKey() },
          },
        }),
        this.prisma.message.groupBy({
          by: ['role'],
          where: {
            createdAt: { gte: monthStart },
            conversation: { businessId: id },
          },
          _count: { _all: true },
        }),
        this.prisma.conversation.groupBy({
          by: ['status'],
          where: { businessId: id },
          _count: { _all: true },
        }),
        this.prisma.conversation.groupBy({
          by: ['channel'],
          where: { businessId: id },
          _count: { _all: true },
        }),
      ]);
    const monthOrders = await this.prisma.order.count({
      where: { businessId: id, createdAt: { gte: monthStart } },
    });
    const monthConversations = await this.prisma.conversation.count({
      where: { businessId: id, createdAt: { gte: monthStart } },
    });
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      plan,
      subscriptionStatus: status,
      amount: row.subscription?.amount ?? null,
      currency: row.subscription?.currency ?? 'USD',
      interval: row.subscription?.interval ?? null,
      periodEnd: row.subscription?.currentPeriodEnd ?? null,
      trialEndsAt: row.subscription?.trialEndsAt ?? null,
      cancelAtPeriodEnd: row.subscription?.cancelAtPeriodEnd ?? false,
      usage: {
        conversations: meter(
          monthConversations,
          limits?.conversationsPerMonth ?? null,
        ),
        whatsapp: meter(
          summary?.whatsappMessages ?? 0,
          limits?.whatsappMessages ?? null,
        ),
        ai: meter(summary?.aiActions ?? 0, limits?.aiActions ?? null),
        orders: meter(monthOrders, limits?.ordersPerMonth ?? null),
      },
      messages: Object.fromEntries(
        messageRoles.map((entry) => [entry.role, entry._count._all]),
      ),
      conversationStatuses: conversationStatuses.map((entry) => ({
        status: entry.status,
        count: entry._count._all,
      })),
      conversationChannels: conversationChannels.map((entry) => ({
        channel: entry.channel,
        count: entry._count._all,
      })),
      members: row.members.map((member) => ({
        role: member.role,
        name: member.user.name,
        email: member.user.email,
      })),
      channels: row.socialAccounts,
      recentOrders: row.orders,
      orders: row._count.orders,
      conversations: row._count.conversations,
      products: row._count.products,
      campaigns: row._count.campaigns,
      createdAt: row.createdAt,
    };
  }

  async users(search = '') {
    const query = search.trim();
    const rows = await this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        isPlatformAdmin: true,
        createdAt: true,
        memberships: {
          select: { role: true, business: { select: { name: true } } },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      isPlatformAdmin: row.isPlatformAdmin,
      createdAt: row.createdAt,
      businesses: row.memberships.map(
        (membership) => `${membership.business.name} · ${membership.role}`,
      ),
    }));
  }

  async subscriptions() {
    const [billing, rows] = await Promise.all([
      this.metrics.snapshot(),
      this.prisma.subscription.findMany({
        orderBy: { currentPeriodEnd: 'asc' },
        take: 100,
        include: {
          business: { select: { id: true, name: true, type: true } },
        },
      }),
    ]);
    return {
      billing,
      rows: rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        businessName: row.business.name,
        type: row.business.type,
        plan: row.plan,
        status: row.status,
        interval: row.interval,
        amount: row.amount,
        currency: row.currency,
        periodEnd: row.currentPeriodEnd,
        trialEndsAt: row.trialEndsAt,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      })),
    };
  }

  async usage() {
    const monthStart = startOfUtcMonth();
    const periodKey = monthKey();
    const [businesses, summaries, conversationCounts, orderCounts] =
      await Promise.all([
        this.prisma.business.findMany({
          orderBy: { name: 'asc' },
          take: 100,
          select: {
            id: true,
            name: true,
            plan: true,
            subscription: { select: { plan: true, status: true } },
          },
        }),
        this.prisma.usageSummary.findMany({ where: { periodKey } }),
        this.prisma.conversation.groupBy({
          by: ['businessId'],
          where: { createdAt: { gte: monthStart } },
          _count: { _all: true },
        }),
        this.prisma.order.groupBy({
          by: ['businessId'],
          where: { createdAt: { gte: monthStart } },
          _count: { _all: true },
        }),
      ]);
    const summaryByBusiness = new Map(
      summaries.map((row) => [row.businessId, row]),
    );
    const conversationsByBusiness = new Map(
      conversationCounts.map((row) => [row.businessId, row._count._all]),
    );
    const ordersByBusiness = new Map(
      orderCounts.map((row) => [row.businessId, row._count._all]),
    );
    return businesses
      .map((row) => {
        const plan = row.subscription?.plan ?? row.plan;
        const status = row.subscription?.status ?? null;
        const limits = planLimits(plan, status);
        const summary = summaryByBusiness.get(row.id);
        const conversations = meter(
          conversationsByBusiness.get(row.id) ?? 0,
          limits?.conversationsPerMonth ?? null,
        );
        const whatsapp = meter(
          summary?.whatsappMessages ?? 0,
          limits?.whatsappMessages ?? null,
        );
        const ai = meter(summary?.aiActions ?? 0, limits?.aiActions ?? null);
        const orders = meter(
          ordersByBusiness.get(row.id) ?? 0,
          limits?.ordersPerMonth ?? null,
        );
        return {
          id: row.id,
          name: row.name,
          plan,
          status,
          conversations,
          whatsapp,
          ai,
          orders,
          level: Math.max(
            conversations.level,
            whatsapp.level,
            ai.level,
            orders.level,
          ),
        };
      })
      .sort((a, b) => b.level - a.level || b.conversations.used - a.conversations.used);
  }
}
