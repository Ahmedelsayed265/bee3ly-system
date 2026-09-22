import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConversionStage, LeadStatus, MessageRole } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { ConversationsService } from '../conversations/conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ContextBuilderService } from './context/context-builder.service';
import { LlmEngine } from './engines/llm.engine';
import { RulesEngine } from './engines/rules.engine';
import type { AiEngineResult } from './types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly conversations: ConversationsService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly rules: RulesEngine,
    private readonly llm: LlmEngine,
    private readonly realtime: RealtimeService,
  ) {}

  async getAgent(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    let agent = await this.prisma.aIAgent.findUnique({ where: { businessId } });
    if (!agent) {
      agent = await this.prisma.aIAgent.create({ data: { businessId } });
    }
    return { agent };
  }

  async updateAgent(
    userId: string,
    input: {
      primaryGoal?: string;
      secondaryGoals?: string[];
      isActive?: boolean;
      tone?: string;
      instructions?: string | null;
      handoffEnabled?: boolean;
    },
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const agent = await this.prisma.aIAgent.upsert({
      where: { businessId },
      create: {
        businessId,
        primaryGoal: input.primaryGoal ?? 'GET_ORDERS',
        secondaryGoals: input.secondaryGoals ?? [
          'ANSWER_QUESTIONS',
          'QUALIFY',
          'HUMAN_HANDOFF',
        ],
        isActive: input.isActive ?? true,
        tone: input.tone ?? 'FRIENDLY',
        instructions: input.instructions ?? null,
        handoffEnabled: input.handoffEnabled ?? true,
      },
      update: {
        ...(input.primaryGoal !== undefined
          ? { primaryGoal: input.primaryGoal }
          : {}),
        ...(input.secondaryGoals !== undefined
          ? { secondaryGoals: input.secondaryGoals }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.tone !== undefined ? { tone: input.tone } : {}),
        ...(input.instructions !== undefined
          ? { instructions: input.instructions }
          : {}),
        ...(input.handoffEnabled !== undefined
          ? { handoffEnabled: input.handoffEnabled }
          : {}),
      },
    });
    return { agent };
  }

  async simulateMessage(
    userId: string,
    content: string,
    conversationId?: string,
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversation = conversationId
      ? await this.prisma.conversation.findFirst({
          where: { id: conversationId, businessId },
        })
      : await this.conversations.ensureSimulationConversation(businessId);

    if (!conversation) {
      throw new ServiceUnavailableException('Conversation not found');
    }

    return this.processCustomerMessage({
      businessId,
      conversationId: conversation.id,
      customerId: conversation.customerId,
      content,
    });
  }

  /**
   * Temporary local engine used ONLY via AiEngineAdapter when
   * AI_ENGINE_DEV_FALLBACK=true. Prefer external AI_ENGINE_URL in production.
   * Assumes the customer message is already persisted.
   */
  async generateReplyOnly(input: {
    businessId: string;
    conversationId: string;
    customerId: string;
    content: string;
  }) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: input.conversationId,
        businessId: input.businessId,
      },
    });
    if (!conversation) {
      throw new ServiceUnavailableException('Conversation not found');
    }

    const agent = await this.prisma.aIAgent.findUnique({
      where: { businessId: input.businessId },
    });
    if (agent && !agent.isActive) {
      const intent = this.rules.detectIntent(input.content);
      await this.ensureSoftLead({
        businessId: input.businessId,
        customerId: input.customerId,
        conversationId: conversation.id,
        campaignId: conversation.campaignId,
        intent,
        alreadyCreatedLead: false,
        alreadyCreatedOrder: false,
      });
      const nextStage = this.rules.stageForIntent(
        intent,
        conversation.conversionStage === 'HUMAN_HANDOFF' &&
          !conversation.needsHuman
          ? 'NEW'
          : conversation.conversionStage,
      );
      if (nextStage !== conversation.conversionStage) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { conversionStage: nextStage },
        });
      }
      return { reply: null as string | null, mode: 'paused' as const };
    }
    if (conversation.mode === 'HUMAN' || conversation.needsHuman) {
      return { reply: null as string | null, mode: 'human' as const };
    }

    const ctx = await this.contextBuilder.build({
      businessId: input.businessId,
      conversationId: conversation.id,
      customerId: input.customerId,
      latestCustomerMessage: input.content,
    });

    // Dev fallback uses rules engine only — Bee3ly is not the AI product
    const result = await this.rules.run(ctx);

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.AI,
        content: result.reply,
        intent: result.intent,
        meta: {
          source: 'dev_fallback',
          toolsUsed: result.toolsUsed,
          mode: result.mode,
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        needsHuman: result.needsHuman,
        status: result.needsHuman ? 'NEEDS_HUMAN' : 'OPEN',
        mode: result.needsHuman ? 'HUMAN' : 'AI',
        conversionStage: result.conversionStage,
        handoffReason: result.handoffReason ?? null,
      },
    });

    await this.ensureSoftLead({
      businessId: input.businessId,
      customerId: input.customerId,
      conversationId: conversation.id,
      campaignId: conversation.campaignId,
      intent: result.intent,
      alreadyCreatedLead: Boolean(result.lead),
      alreadyCreatedOrder: Boolean(result.order),
    });

    this.realtime.notifyConversationUpdated(
      input.businessId,
      conversation.id,
    );

    return { reply: result.reply, mode: 'dev_fallback' as const };
  }

  /** Inbox simulation path (temporary local intelligence until AI Engine ships) */
  async processCustomerMessage(input: {
    businessId: string;
    conversationId: string;
    customerId: string;
    content: string;
  }) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: input.conversationId,
        businessId: input.businessId,
      },
    });
    if (!conversation) {
      throw new ServiceUnavailableException('Conversation not found');
    }

    const agent = await this.prisma.aIAgent.findUnique({
      where: { businessId: input.businessId },
    });

    const intentGuess = this.rules.detectIntent(input.content);

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.CUSTOMER,
        content: input.content,
        intent: intentGuess,
      },
    });

    // Human mode or AI paused → do not auto-reply
    if (conversation.mode === 'HUMAN' || conversation.needsHuman) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
      this.realtime.notifyConversationUpdated(
        input.businessId,
        conversation.id,
      );
      return {
        conversationId: conversation.id,
        intent: intentGuess,
        reply: null,
        toolsUsed: [],
        order: null,
        lead: null,
        message: null,
        mode: 'human' as const,
        paused: false,
        needsHuman: true,
      };
    }

    if (agent && !agent.isActive) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
      this.realtime.notifyConversationUpdated(
        input.businessId,
        conversation.id,
      );
      return {
        conversationId: conversation.id,
        intent: intentGuess,
        reply: null,
        toolsUsed: [],
        order: null,
        lead: null,
        message: null,
        mode: 'paused' as const,
        paused: true,
        needsHuman: false,
        notice: 'المساعد الذكي مش متاح دلوقتي، تقدر تكمل المحادثة يدويًا.',
      };
    }

    const ctx = await this.contextBuilder.build({
      businessId: input.businessId,
      conversationId: conversation.id,
      customerId: input.customerId,
      latestCustomerMessage: input.content,
    });

    let result: AiEngineResult | null = await this.llm.run(ctx);
    if (!result) {
      result = await this.rules.run(ctx);
    }

    const aiMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.AI,
        content: result.reply,
        intent: result.intent,
        meta: {
          toolsUsed: result.toolsUsed,
          mode: result.mode,
          confidence: result.confidence,
          conversionStage: result.conversionStage,
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        needsHuman: result.needsHuman,
        status: result.needsHuman ? 'NEEDS_HUMAN' : 'OPEN',
        mode: result.needsHuman ? 'HUMAN' : 'AI',
        conversionStage: result.conversionStage,
        handoffReason: result.handoffReason ?? null,
      },
    });

    // Soft lead creation for interest intents (avoid dup spam: one NEW per customer)
    await this.ensureSoftLead({
      businessId: input.businessId,
      customerId: input.customerId,
      conversationId: conversation.id,
      campaignId: conversation.campaignId,
      intent: result.intent,
      alreadyCreatedLead: Boolean(result.lead),
      alreadyCreatedOrder: Boolean(result.order),
    });

    this.logger.debug(`AI reply via ${result.mode} intent=${result.intent}`);

    this.realtime.notifyConversationUpdated(
      input.businessId,
      conversation.id,
    );

    return {
      conversationId: conversation.id,
      intent: result.intent,
      reply: result.reply,
      toolsUsed: result.toolsUsed,
      order: result.order,
      lead: result.lead,
      message: aiMessage,
      mode: result.mode,
      paused: false,
      needsHuman: result.needsHuman,
      conversionStage: result.conversionStage,
    };
  }

  /** Create NEW lead for interest intents when tools didn't already create one. */
  private async ensureSoftLead(input: {
    businessId: string;
    customerId: string;
    conversationId: string;
    campaignId: string | null;
    intent: string;
    alreadyCreatedLead: boolean;
    alreadyCreatedOrder: boolean;
  }) {
    if (
      input.alreadyCreatedLead ||
      input.alreadyCreatedOrder ||
      ![
        'PURCHASE_INTENT',
        'PRICE_INQUIRY',
        'AVAILABILITY',
        'PRODUCT_QUESTION',
        'LEAD_INTENT',
      ].includes(input.intent)
    ) {
      return;
    }

    const existing = await this.prisma.lead.findFirst({
      where: {
        businessId: input.businessId,
        customerId: input.customerId,
        status: { in: [LeadStatus.NEW, LeadStatus.QUALIFIED] },
      },
    });
    if (existing) return;

    await this.prisma.lead.create({
      data: {
        businessId: input.businessId,
        customerId: input.customerId,
        conversationId: input.conversationId,
        campaignId: input.campaignId,
        status: LeadStatus.NEW,
        intent: input.intent,
      },
    });
  }

  async setConversationMode(
    userId: string,
    conversationId: string,
    mode: 'AI' | 'HUMAN',
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
    });
    if (!conversation) {
      throw new ServiceUnavailableException('Conversation not found');
    }
    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        mode,
        needsHuman: mode === 'HUMAN',
        status: mode === 'HUMAN' ? 'NEEDS_HUMAN' : 'OPEN',
        conversionStage:
          mode === 'HUMAN'
            ? ConversionStage.HUMAN_HANDOFF
            : conversation.conversionStage,
        handoffReason: mode === 'AI' ? null : conversation.handoffReason,
      },
    });
    this.realtime.notifyConversationUpdated(businessId, conversationId);
    return { conversation: updated };
  }
}
