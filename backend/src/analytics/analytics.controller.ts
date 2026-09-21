import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  @Get('overview')
  async overview(@CurrentUser() user: AuthUser) {
    const businessId = await this.access.requireBusinessId(user.id);
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [
      orders,
      leads,
      conversations,
      revenueAgg,
      unreadNotifications,
      aiHandled,
      humanHandoffs,
      convertedLeads,
    ] = await Promise.all([
      this.prisma.order.count({ where: { businessId } }),
      this.prisma.lead.count({ where: { businessId } }),
      this.prisma.conversation.count({ where: { businessId } }),
      this.prisma.order.aggregate({
        where: { businessId },
        _sum: { totalEgp: true },
      }),
      this.prisma.notification.count({
        where: { businessId, readAt: null },
      }),
      this.prisma.conversation.count({
        where: { businessId, mode: 'AI' },
      }),
      this.prisma.conversation.count({
        where: { businessId, needsHuman: true },
      }),
      this.prisma.lead.count({
        where: { businessId, status: 'CONVERTED' },
      }),
    ]);

    const recentOrders = await this.prisma.order.findMany({
      where: { businessId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { totalEgp: true, createdAt: true, campaignId: true },
    });

    const salesByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const total = recentOrders
        .filter((o) => o.createdAt.toISOString().slice(0, 10) === key)
        .reduce((sum, o) => sum + o.totalEgp, 0);
      return { day: String(d.getDate()).padStart(2, '0'), value: total };
    });

    const campaigns = await this.prisma.campaign.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        objective: true,
        budget: true,
      },
    });

    const campaignStats = await Promise.all(
      campaigns.map(async (c) => {
        const [cConversations, cLeads, cOrders, cRevenue] = await Promise.all([
          this.prisma.conversation.count({ where: { campaignId: c.id } }),
          this.prisma.lead.count({ where: { campaignId: c.id } }),
          this.prisma.order.count({ where: { campaignId: c.id } }),
          this.prisma.order.aggregate({
            where: { campaignId: c.id },
            _sum: { totalEgp: true },
          }),
        ]);
        return {
          ...c,
          conversations: cConversations,
          leads: cLeads,
          orders: cOrders,
          revenueEgp: cRevenue._sum.totalEgp ?? 0,
        };
      }),
    );

    const conversionRate =
      conversations > 0
        ? Math.round(((orders + convertedLeads) / conversations) * 1000) / 10
        : null;

    return {
      metrics: {
        salesEgp: revenueAgg._sum.totalEgp ?? 0,
        orders,
        leads,
        conversations,
        unreadNotifications,
        aiHandled,
        humanHandoffs,
        conversions: orders + convertedLeads,
        conversionRate,
      },
      salesByDay,
      campaigns: campaignStats,
      enoughData: conversations > 0 || orders > 0 || leads > 0,
    };
  }
}
