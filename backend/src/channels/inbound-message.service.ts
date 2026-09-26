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
import type {
  AiEngineInboundPayload,
  ChannelType,
  InboundIngestResult,
  InboundMessageEvent,
} from './channel.types';
import { MerchantTokenService } from './merchant-token.service';
import { MetaOutboundService } from '../social/meta/meta-outbound.service';

@Injectable()
export class InboundMessageService {
  private readonly logger = new Logger(InboundMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineAdapter,
    private readonly tokens: MerchantTokenService,
    private readonly outbound: MetaOutboundService,
    private readonly realtime: RealtimeService,
  ) {}

  async ingest(event: InboundMessageEvent): Promise<InboundIngestResult> {
    // ------------------------------------------------------------------
    // Step 1: Resolve channel → SocialAccount → businessId (merchant)
    // ------------------------------------------------------------------
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

    const businessId = account.businessId;

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
          businessId,
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
    const channel: ConversationChannel =
      event.channel === 'INSTAGRAM'
        ? ConversationChannel.INSTAGRAM
        : event.channel === 'WHATSAPP'
          ? ConversationChannel.WHATSAPP
          : ConversationChannel.FACEBOOK;

    let customer = await this.prisma.customer.findFirst({
      where: {
        businessId,
        externalId: event.externalSenderId,
      },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          businessId,
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

    if (!customer.name && event.senderName && event.channel === 'WHATSAPP') {
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
        businessId,
        customerId: customer.id,
        channel,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          businessId,
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

    // ------------------------------------------------------------------
    // Step 2: AI Engine path. Only when conversation is still in AI mode.
    // Merchant token + full context are built here; AiEngineAdapter owns
    // all error handling + safe fallback (so we don't double-fallback).
    // ------------------------------------------------------------------
    if (conversation.mode !== 'HUMAN' && !conversation.needsHuman) {
      // Issue a short-lived signed JWT so the AI Service can securely
      // identify + scope itself to this merchant.
      const authorizationToken = await this.tokens.issueForMerchant(businessId);

      const [historyRows, agentRow] = await Promise.all([
        this.prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
          take: 40,
          select: { role: true, content: true, createdAt: true },
        }),
        this.prisma.aIAgent.findUnique({
          where: { businessId },
          select: {
            primaryGoal: true,
            secondaryGoals: true,
            tone: true,
            instructions: true,
          },
        }),
      ]);

      const payload: AiEngineInboundPayload = {
        businessId,
        conversationId: conversation.id,
        customerId: customer.id,
        channel: conversation.channel as ChannelType,
        messageId: message.id,
        text: event.text,
        authorizationToken,
        customer: {
          name: customer.name,
          phone: customer.phone,
          externalId: customer.externalId,
        },
        history: historyRows.map((m) => ({
          role: m.role as 'CUSTOMER' | 'AI' | 'HUMAN' | 'SYSTEM',
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
        agent: agentRow
          ? {
              primaryGoal: agentRow.primaryGoal,
              secondaryGoals: agentRow.secondaryGoals,
              tone: agentRow.tone,
              instructions: agentRow.instructions,
            }
          : undefined,
      };

      const aiResult = await this.aiEngine.handleInbound(payload);
      const reply = aiResult.reply ?? null;

      // IMPORTANT: AiEngineAdapter is responsible for persisting the
      // reply message. Here we only care about SENDING it through the
      // original channel if the account is connected and a reply exists.
      if (reply && account.status === SocialConnectionStatus.CONNECTED) {
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

    this.realtime.notifyConversationUpdated(businessId, conversation.id);

    return {
      businessId,
      conversationId: conversation.id,
      customerId: customer.id,
      messageId: message.id,
      duplicate: false,
    };
  }
}
