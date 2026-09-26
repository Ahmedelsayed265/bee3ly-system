import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  ConversationChannel,
  LeadStatus,
  MessageRole,
  Prisma,
} from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { pageMeta, pageWindow } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { MetaOutboundService } from '../social/meta/meta-outbound.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    @Inject(forwardRef(() => MetaOutboundService))
    private readonly outbound: MetaOutboundService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversations = await this.prisma.conversation.findMany({
      where: { businessId },
      include: {
        customer: true,
        campaign: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        leads: {
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
        campaign: true,
        messages: { orderBy: { createdAt: 'asc' } },
        leads: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const orders = await this.prisma.order.findMany({
      where: {
        businessId,
        OR: [{ conversationId: id }, { customerId: conversation.customerId }],
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return { conversation, orders };
  }

  async remove(userId: string, id: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, businessId },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    await this.prisma.conversation.delete({ where: { id } });
    this.realtime.notifyConversationUpdated(businessId, id);
    return { success: true };
  }

  async listLeads(
    userId: string,
    page = 1,
    limit = 10,
    filters: {
      status?: string;
      intent?: string;
      q?: string;
      campaignId?: string;
    } = {},
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const window = pageWindow(page, limit);
    const where = this.leadWhere(businessId, filters);
    const facetWhere = this.leadWhere(businessId, {
      intent: filters.intent,
      q: filters.q,
      campaignId: filters.campaignId,
    });
    const [leads, total, grouped, intentRows] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          customer: { select: { name: true, phone: true } },
          campaign: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: window.skip,
        take: window.limit,
      }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: facetWhere,
        _count: { _all: true },
      }),
      this.prisma.lead.findMany({
        where: { businessId, intent: { not: null } },
        distinct: ['intent'],
        select: { intent: true },
        orderBy: { intent: 'asc' },
      }),
    ]);
    const counts: Record<LeadStatus, number> = {
      NEW: 0,
      QUALIFIED: 0,
      CONVERTED: 0,
      LOST: 0,
    };
    for (const row of grouped) counts[row.status] = row._count._all;
    const intents = intentRows
      .map((row) => row.intent)
      .filter((intent): intent is string => Boolean(intent));
    return {
      leads,
      counts,
      intents,
      ...pageMeta(total, window.page, window.limit),
    };
  }

  async updateLeadsStatus(userId: string, ids: string[], status: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const result = await this.prisma.lead.updateMany({
      where: { businessId, id: { in: ids } },
      data: { status: status as LeadStatus },
    });
    return { updated: result.count };
  }

  async removeLeads(userId: string, ids: string[]) {
    const businessId = await this.access.requireBusinessId(userId);
    const result = await this.prisma.lead.deleteMany({
      where: { businessId, id: { in: ids } },
    });
    return { deleted: result.count };
  }

  private leadWhere(
    businessId: string,
    filters: {
      status?: string;
      intent?: string;
      q?: string;
      campaignId?: string;
    },
  ): Prisma.LeadWhereInput {
    const q = filters.q?.trim();
    return {
      businessId,
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.status ? { status: filters.status as LeadStatus } : {}),
      ...(filters.intent ? { intent: filters.intent } : {}),
      ...(q
        ? {
            OR: [
              { customer: { name: { contains: q, mode: 'insensitive' } } },
              { customer: { phone: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  async updateLeadStatus(userId: string, leadId: string, status: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, businessId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: status as never },
    });
    return { lead: updated };
  }

  async sendHumanMessage(
    userId: string,
    conversationId: string,
    content: string,
    quickReplies?: Array<{ title: string; payload: string }>,
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      include: { customer: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.HUMAN,
        content,
        meta: quickReplies?.length ? { quickReplies } : undefined,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        mode: 'HUMAN',
        needsHuman: true,
      },
    });

    if (
      (conversation.channel === 'FACEBOOK' ||
        conversation.channel === 'INSTAGRAM') &&
      conversation.customer.externalId
    ) {
      const account = await this.prisma.socialAccount.findFirst({
        where: {
          businessId,
          platform: conversation.channel,
          status: 'CONNECTED',
        },
      });
      if (account) {
        await this.outbound.sendText(
          account.id,
          conversation.customer.externalId,
          content,
          quickReplies,
        );
      }
    }

    this.realtime.notifyConversationUpdated(businessId, conversationId);
    return { message };
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
