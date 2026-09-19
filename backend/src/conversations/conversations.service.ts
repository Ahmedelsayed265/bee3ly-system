import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
  ) {}

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversations = await this.prisma.conversation.findMany({
      where: { businessId },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
    return { conversations };
  }

  async getOne(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, businessId },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return { conversation };
  }

  async listLeads(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const leads = await this.prisma.lead.findMany({
      where: { businessId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return { leads };
  }

  async ensureSimulationConversation(businessId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { businessId, channel: ConversationChannel.SIMULATION },
      orderBy: { createdAt: 'desc' },
      include: { customer: true, messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) return existing;

    const customer = await this.prisma.customer.create({
      data: {
        businessId,
        name: 'عميل تجريبي',
        externalId: `sim-${businessId.slice(0, 8)}`,
      },
    });

    return this.prisma.conversation.create({
      data: {
        businessId,
        customerId: customer.id,
        channel: ConversationChannel.SIMULATION,
      },
      include: { customer: true, messages: true },
    });
  }
}
