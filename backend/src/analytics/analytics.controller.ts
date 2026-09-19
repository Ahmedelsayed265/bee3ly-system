import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
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

    const [orders, leads, conversations, revenueAgg, unreadNotifications] =
      await Promise.all([
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
      ]);

    const recentOrders = await this.prisma.order.findMany({
      where: { businessId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { totalEgp: true, createdAt: true },
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

    return {
      metrics: {
        salesEgp: revenueAgg._sum.totalEgp ?? 0,
        orders,
        leads,
        conversations,
        unreadNotifications,
      },
      salesByDay,
    };
  }
}
