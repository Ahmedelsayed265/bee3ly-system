import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageRole } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AiEngineInboundPayload,
  AiEngineInboundResponse,
} from './channel.types';

/**
 * Integration point for the external Bee3ly AI Engine.
 * Bee3ly owns data + actions; the engine owns conversation intelligence.
 *
 * Temporary local rules/LLM remain available ONLY as an explicit
 * development fallback (AI_ENGINE_DEV_FALLBACK=true).
 */
@Injectable()
export class AiEngineAdapter {
  private readonly logger = new Logger(AiEngineAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async handleInbound(
    payload: AiEngineInboundPayload,
  ): Promise<AiEngineInboundResponse> {
    const engineUrl = this.config.get<string>('AI_ENGINE_URL')?.trim();

    if (engineUrl) {
      try {
        const res = await fetch(`${engineUrl.replace(/\/$/, '')}/v1/inbound`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.get('AI_ENGINE_API_KEY')
              ? {
                  Authorization: `Bearer ${this.config.get('AI_ENGINE_API_KEY')}`,
                }
              : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          this.logger.warn(`AI Engine HTTP ${res.status}`);
          return { reply: null, mode: 'none' };
        }
        const data = (await res.json()) as { reply?: string };
        if (data.reply) {
          await this.persistAiReply(
            payload.conversationId,
            data.reply,
            'external',
          );
        }
        return { reply: data.reply ?? null, mode: 'external' };
      } catch (e) {
        this.logger.warn(
          `AI Engine unreachable: ${e instanceof Error ? e.message : 'unknown'}`,
        );
        return { reply: null, mode: 'none' };
      }
    }

    const useFallback =
      this.config.get<string>('AI_ENGINE_DEV_FALLBACK') === 'true';
    if (!useFallback) {
      this.logger.debug(
        'No AI_ENGINE_URL and fallback disabled — message ingested only',
      );
      return { reply: null, mode: 'none' };
    }

    // Temporary local fallback for development/demo only
    const result = await this.ai.generateReplyOnly({
      businessId: payload.businessId,
      conversationId: payload.conversationId,
      customerId: payload.customerId,
      content: payload.text,
    });
    return {
      reply: result.reply,
      mode: 'dev_fallback',
    };
  }

  private async persistAiReply(
    conversationId: string,
    content: string,
    source: string,
  ) {
    await this.prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.AI,
        content,
        meta: { source },
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });
  }
}
