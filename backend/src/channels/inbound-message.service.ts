import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationChannel,
  MessageRole,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AiEngineAdapter } from './ai-engine.adapter';
import type { InboundIngestResult, InboundMessageEvent } from './channel.types';
import { MetaOutboundService } from '../social/meta/meta-outbound.service';

@Injectable()
export class InboundMessageService {
  private readonly logger = new Logger(InboundMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineAdapter,
    private readonly outbound: MetaOutboundService,
    private readonly realtime: RealtimeService,
  ) {}

  async ingest(event: InboundMessageEvent): Promise<InboundIngestResult> {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        externalId: event.externalAccountId,
        provider: event.provider,
        status: {
          in: [
            SocialConnectionStatus.CONNECTED,
            SocialConnectionStatus.SIMULATION,
          ],
        },
      },
    });

    if (!account) {
      this.logger.warn(
        `No connected account for ${event.provider}:${event.externalAccountId}`,
      );
      throw new Error('CHANNEL_ACCOUNT_NOT_FOUND');
    }

    // Idempotent message by external message id when present
    if (event.externalMessageId) {
      const existing = await this.prisma.message.findFirst({
        where: {
          meta: {
            path: ['externalMessageId'],
            equals: event.externalMessageId,
          },
        },
      });
      if (existing) {
        const conv = await this.prisma.conversation.findUnique({
          where: { id: existing.conversationId },
        });
        return {
          businessId: account.businessId,
          conversationId: existing.conversationId,
          customerId: conv?.customerId ?? '',
          messageId: existing.id,
          duplicate: true,
        };
      }
    }

    const platform =
      event.channel === 'INSTAGRAM'
        ? SocialPlatform.INSTAGRAM
        : event.channel === 'WHATSAPP'
          ? SocialPlatform.WHATSAPP
          : SocialPlatform.FACEBOOK;
    const channel =
      event.channel === 'INSTAGRAM'
        ? ConversationChannel.INSTAGRAM
        : event.channel === 'WHATSAPP'
          ? ConversationChannel.WHATSAPP
          : ConversationChannel.FACEBOOK;

    let customer = await this.prisma.customer.findFirst({
      where: {
        businessId: account.businessId,
        externalId: event.externalSenderId,
      },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          businessId: account.businessId,
          externalId: event.externalSenderId,
          platform,
          name: event.senderName ?? null,
          phone: event.channel === 'WHATSAPP' ? event.externalSenderId : null,
        },
      });
    }

    if (event.channel === 'WHATSAPP' && !customer.phone) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { phone: event.externalSenderId },
      });
    }

    if (
      !customer.name &&
      event.senderName &&
      event.channel === 'WHATSAPP'
    ) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { name: event.senderName },
      });
    } else if (
      !customer.name &&
      account.status === SocialConnectionStatus.CONNECTED &&
      event.channel !== 'WHATSAPP'
    ) {
      const senderName = await this.outbound.getSenderName(
        account.id,
        event.externalSenderId,
      );
      if (senderName) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: { name: senderName },
        });
      }
    }

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        businessId: account.businessId,
        customerId: customer.id,
        channel,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          businessId: account.businessId,
          customerId: customer.id,
          channel,
        },
      });
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.CUSTOMER,
        content: event.text,
        meta: {
          provider: event.provider,
          externalMessageId: event.externalMessageId ?? null,
          externalSenderId: event.externalSenderId,
          externalAccountId: event.externalAccountId,
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Integration point — no AI reasoning in webhook/controller
    if (conversation.mode !== 'HUMAN' && !conversation.needsHuman) {
      const aiResult = await this.aiEngine.handleInbound({
        businessId: account.businessId,
        conversationId: conversation.id,
        customerId: customer.id,
        channel: conversation.channel,
        messageId: message.id,
        text: event.text,
        customer: {
          name: customer.name,
          phone: customer.phone,
          externalId: customer.externalId,
        },
      });

      let reply = aiResult.reply;
      if (!reply) {
        const business = await this.prisma.business.findUnique({
          where: { id: account.businessId },
          select: { name: true },
        });
        const shop = business?.name?.trim() || 'المتجر';
        // Fixed ack while AI Engine is offline / agent paused
        reply = `أهلاً بيك! رسالتك وصلت لـ ${shop}. هنرد عليك حالاً.`;
        await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: MessageRole.AI,
            content: reply,
            meta: { source: 'fixed_reply' },
          },
        });
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });
      }

      if (account.status === SocialConnectionStatus.CONNECTED) {
        const sent = await this.outbound.sendText(
          account.id,
          event.externalSenderId,
          reply,
        );
        if (!sent.sent) {
          this.logger.warn(
            `Outbound reply not sent for conversation ${conversation.id}`,
          );
        }
      }
    }

    this.realtime.notifyConversationUpdated(
      account.businessId,
      conversation.id,
    );

    return {
      businessId: account.businessId,
      conversationId: conversation.id,
      customerId: customer.id,
      messageId: message.id,
      duplicate: false,
    };
  }
}
