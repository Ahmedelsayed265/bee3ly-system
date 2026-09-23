import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { AttributionService } from './attribution.service';
import {
  computeMetrics,
  EMPTY_DELIVERY,
  type CampaignObjectiveId,
} from './campaign-metrics';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly attribution: AttributionService,
  ) {}

  @Get('overview')
  async overview(@CurrentUser() user: AuthUser) {
    const businessId = await this.access.requireBusinessId(user.id);
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const chains = await this.attribution.chains(businessId);
    const report = computeMetrics(chains.business, EMPTY_DELIVERY, null);
    const leadToOrder = report.metrics.find(
      (metric) => metric.id === 'leadToOrderRate',
    );

    const [
      unreadNotifications,
      aiHandled,
      humanHandoffs,
      recentOrders,
      campaigns,
    ] = await Promise.all([
      this.prisma.notification.count({
        where: { businessId, readAt: null },
      }),
      this.prisma.conversation.count({
        where: { businessId, mode: 'AI' },
      }),
      this.prisma.conversation.count({
        where: { businessId, needsHuman: true },
      }),
      this.prisma.order.findMany({
        where: {
          businessId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'asc' },
        select: { totalEgp: true, createdAt: true },
      }),
      this.prisma.campaign.findMany({
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
      }),
    ]);

    const salesByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const total = recentOrders
        .filter((order) => order.createdAt.toISOString().slice(0, 10) === key)
        .reduce((sum, order) => sum + order.totalEgp, 0);
      return { day: String(d.getDate()).padStart(2, '0'), value: total };
    });

    return {
      metrics: {
        salesEgp: chains.business.revenueEgp,
        orders: chains.business.orders,
        leads: chains.business.leads,
        conversations: chains.business.conversations,
        unreadNotifications,
        aiHandled,
        humanHandoffs,
        conversions: chains.business.orders,
        conversionRate: leadToOrder?.value ?? null,
      },
      report,
      unattributed: chains.unattributed,
      salesByDay,
      campaigns: campaigns.map((campaign) => {
        const measured = computeMetrics(
          chains.forCampaign(campaign.id),
          EMPTY_DELIVERY,
          campaign.objective as CampaignObjectiveId,
        );
        const chain = chains.forCampaign(campaign.id);
        return {
          ...campaign,
          conversations: chain.conversations,
          leads: chain.leads,
          orders: chain.orders,
          revenueEgp: chain.revenueEgp,
          headline: measured.headline,
          metrics: measured.metrics,
        };
      }),
      enoughData:
        chains.business.conversations > 0 ||
        chains.business.orders > 0 ||
        chains.business.leads > 0,
    };
  }
}
