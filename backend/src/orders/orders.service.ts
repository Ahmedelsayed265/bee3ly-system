import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const orders = await this.prisma.order.findMany({
      where: { businessId },
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return { orders };
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
