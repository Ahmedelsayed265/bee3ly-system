import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const notifications = await this.prisma.notification.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await this.prisma.notification.count({
      where: { businessId, readAt: null },
    });
    return { notifications, unreadCount };
  }

  async markRead(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const existing = await this.prisma.notification.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Notification not found');
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return { notification };
  }

  async markAllRead(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    await this.prisma.notification.updateMany({
      where: { businessId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async create(
    businessId: string,
    input: {
      type: NotificationType;
      title: string;
      body: string;
      data?: Prisma.InputJsonValue;
    },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        businessId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      },
    });
    this.realtime.notifyNotificationCreated(businessId, notification);
    return notification;
  }
}
