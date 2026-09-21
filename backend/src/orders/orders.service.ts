import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async list(userId: string, page = 1, limit = 10) {
    const businessId = await this.access.requireBusinessId(userId);
    const window = pageWindow(page, limit);
    const where = { businessId };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true, customer: true },
        orderBy: { createdAt: 'desc' },
        skip: window.skip,
        take: window.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { orders, ...pageMeta(total, window.page, window.limit) };
  }

  async getOne(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const order = await this.prisma.order.findFirst({
      where: { id, businessId },
      include: { items: true, customer: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { order };
  }

  async updateStatus(userId: string, id: string, status: OrderStatus) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.order.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Order not found');
    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    return { order };
  }
}
