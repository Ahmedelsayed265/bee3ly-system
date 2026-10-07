import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationChannel,
  MessageRole,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { isBillingLimit } from '../billing/billing.http';
import { EntitlementsService } from '../billing/entitlements.service';
import { trivialReply } from '../billing/trivial-message';
import { UsageService } from '../billing/usage.service';
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
import { ContextBuilderService } from '../ai/context/context-builder.service';
import { PAYMENT_REVIEW_HANDOFF } from '../ai/payment-review.constants';
import { AiToolsService } from '../ai/tools/ai-tools.service';
import { ChannelOutboundService } from '../social/channel-outbound.service';

@Injectable()
export class InboundMessageService {
  private readonly logger = new Logger(InboundMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineAdapter,
    private readonly tokens: MerchantTokenService,
    private readonly outbound: ChannelOutboundService,
    private readonly realtime: RealtimeService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly aiTools: AiToolsService,
    private readonly entitlements: EntitlementsService,
    private readonly usage: UsageService,
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
          : event.channel === 'TIKTOK'
            ? SocialPlatform.TIKTOK
            : SocialPlatform.FACEBOOK;
    const channel: ConversationChannel =
      event.channel === 'INSTAGRAM'
        ? ConversationChannel.INSTAGRAM
        : event.channel === 'WHATSAPP'
          ? ConversationChannel.WHATSAPP
          : event.channel === 'TIKTOK'
            ? ConversationChannel.TIKTOK
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
    let openedOverCap = false;
    if (!conversation) {
      const room = await this.conversationRoom(businessId);
      openedOverCap = !room;
      conversation = await this.prisma.conversation.create({
        data: {
          businessId,
          customerId: customer.id,
          channel,
        },
      });
      await this.usage.recordConversation(businessId, conversation.id);
    }

    const attachments = event.attachments ?? [];

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
          ...(event.tiktokConversationId
            ? { tiktokConversationId: event.tiktokConversationId }
            : {}),
          ...(attachments.length ? { attachments } : {}),
          ...(attachments.some((a) => a.type === 'image')
            ? { paymentReceipt: true }
            : {}),
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
    const paymentReviewPending =
      conversation.needsHuman &&
      conversation.handoffReason === PAYMENT_REVIEW_HANDOFF;
    const hasImage = attachments.some((a) => a.type === 'image');

    if (hasImage && !paymentReviewPending && conversation.mode !== 'HUMAN') {
      await this.handlePaymentScreenshot({
        businessId,
        conversationId: conversation.id,
        customerId: customer.id,
        customerMessage: event.text,
        account,
        externalSenderId: event.externalSenderId,
      });
      this.realtime.notifyConversationUpdated(businessId, conversation.id);
      return {
        businessId,
        conversationId: conversation.id,
        customerId: customer.id,
        messageId: message.id,
        duplicate: false,
      };
    }

    const canned = trivialReply(event.text);
    if (
      canned &&
      conversation.mode !== 'HUMAN' &&
      !paymentReviewPending &&
      account.status === SocialConnectionStatus.CONNECTED
    ) {
      try {
        await this.outbound.sendText(
          account.id,
          event.externalSenderId,
          canned,
        );
      } catch (error) {
        if (!isBillingLimit(error)) throw error;
        this.logger.warn(
          `Skipped trivial reply for ${conversation.id}: plan limit`,
        );
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

    const access = await this.entitlements.access(businessId);
    const shouldRunAi =
      conversation.mode !== 'HUMAN' &&
      !paymentReviewPending &&
      !openedOverCap &&
      !access.restricted &&
      access.features.ai;

    if (shouldRunAi) {
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
          role: m.role,
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
        try {
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
        } catch (error) {
          if (!isBillingLimit(error)) throw error;
          this.logger.warn(
            `Skipped AI reply for ${conversation.id}: plan limit`,
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

  private async conversationRoom(businessId: string) {
    try {
      await this.entitlements.assertCanStartConversation(businessId);
      return true;
    } catch (error) {
      if (isBillingLimit(error)) return false;
      throw error;
    }
  }

  /** Prepaid screenshot: merchant review only — never Gemini createOrder on this turn. */
  private async handlePaymentScreenshot(input: {
    businessId: string;
    conversationId: string;
    customerId: string;
    customerMessage: string;
    account: { id: string; status: SocialConnectionStatus };
    externalSenderId: string;
  }) {
    const ctx = await this.contextBuilder.build(
      {
        businessId: input.businessId,
        conversationId: input.conversationId,
        customerId: input.customerId,
        latestCustomerMessage: input.customerMessage,
      },
      { includeMessageHistory: true },
    );

    const customerLabel = ctx.customer.name?.trim() || 'عميل';
    await this.aiTools.execute('transferToHuman', ctx, {
      reason: PAYMENT_REVIEW_HANDOFF,
      summary: `${customerLabel} — تم استلام إيصال تحويل ويحتاج تأكيد`,
    });
    // No auto-reply to customer — merchant confirms from inbox; notification already sent.
  }
}
