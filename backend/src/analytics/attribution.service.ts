import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ChainInput } from './campaign-metrics';

@Injectable()
export class AttributionService {
  constructor(private readonly prisma: PrismaService) {}

  async chains(businessId: string) {
    const sold = {
      businessId,
      status: { not: OrderStatus.CANCELLED },
    };

    const [conversations, leads, orders, revenue, byConversation, byLead, byOrder] =
      await Promise.all([
        this.prisma.conversation.count({ where: { businessId } }),
        this.prisma.lead.count({ where: { businessId } }),
        this.prisma.order.count({ where: sold }),
        this.prisma.order.aggregate({
          where: sold,
          _sum: { totalEgp: true },
        }),
        this.prisma.conversation.groupBy({
          by: ['campaignId'],
          where: { businessId },
          _count: { _all: true },
        }),
        this.prisma.lead.groupBy({
          by: ['campaignId'],
          where: { businessId },
          _count: { _all: true },
        }),
        this.prisma.order.groupBy({
          by: ['campaignId'],
          where: sold,
          _count: { _all: true },
          _sum: { totalEgp: true },
        }),
      ]);

    const conversationCounts = new Map(
      byConversation.map((row) => [row.campaignId, row._count._all]),
    );
    const leadCounts = new Map(
      byLead.map((row) => [row.campaignId, row._count._all]),
    );
    const orderCounts = new Map(
      byOrder.map((row) => [row.campaignId, row._count._all]),
    );
    const revenueByCampaign = new Map(
      byOrder.map((row) => [row.campaignId, row._sum.totalEgp ?? 0]),
    );

    const chainFor = (campaignId: string | null): ChainInput => ({
      conversations: conversationCounts.get(campaignId) ?? 0,
      leads: leadCounts.get(campaignId) ?? 0,
      orders: orderCounts.get(campaignId) ?? 0,
      revenueEgp: revenueByCampaign.get(campaignId) ?? 0,
      costOfGoodsEgp: null,
    });

    return {
      business: {
        conversations,
        leads,
        orders,
        revenueEgp: revenue._sum.totalEgp ?? 0,
        costOfGoodsEgp: null,
      } satisfies ChainInput,
      forCampaign: chainFor,
      unattributed: chainFor(null),
    };
  }
}
