import {
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageRole } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import type {
  AiEngineInboundPayload,
  AiEngineInboundResponse,
} from './channel.types';

/**
 * Central integration point for the external Bee3ly AI Service.
 *
 * Responsibilities:
 *  - Forward the normalized inbound payload + signed merchant JWT
 *  - Classify errors (timeout, unavailable, invalid token, bad response, …)
 *  - Persist the AI reply (or a safe fixed fallback) + realtime notifications
 *  - Preserve the local dev fallback (rules engine) when explicitly enabled
 *
 * Security invariants:
 *  - The caller (InboundMessageService / PageCommentsService) is responsible
 *    for resolving `businessId` from the incoming channel/account BEFORE
 *    calling this adapter. We never guess a merchant ID.
 *  - The AI Service authorization token (JWT) is sent both as the
 *    `Authorization: Bearer` header AND mirrored in the JSON payload
 *    so the AI Service can validate + extract the merchant scope.
 *  - On ANY AI failure we fall back to a SAFE, generic acknowledgment that
 *    does not reference products or merchant-specific data. Cross-merchant
 *    data leakage is impossible in the fallback path because the fallback
 *    does not read product data.
 */
@Injectable()
export class AiEngineAdapter {
  private readonly logger = new Logger(AiEngineAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AiService))
    private readonly ai: AiService,
    private readonly realtime: RealtimeService,
  ) {}

  async handleInbound(
    payload: AiEngineInboundPayload,
  ): Promise<AiEngineInboundResponse> {
    const engineUrl =
      this.config.get<string>('AI_SERVICE_URL')?.trim() ||
      this.config.get<string>('AI_ENGINE_URL')?.trim();

    if (engineUrl) {
      return this.callExternalEngine(engineUrl, payload);
    }

    const useFallback =
      this.config.get<string>('AI_ENGINE_DEV_FALLBACK') === 'true';
    if (!useFallback) {
      this.logger.debug(
        'No AI_SERVICE_URL and fallback disabled — returning safe fixed fallback',
      );
      return this.safeFixedFallback(payload, 'SERVICE_UNAVAILABLE');
    }

    return this.devFallback(payload);
  }

  // ------------------------------------------------------------------
  // External AI Service
  // ------------------------------------------------------------------

  private async callExternalEngine(
    engineUrl: string,
    payload: AiEngineInboundPayload,
  ): Promise<AiEngineInboundResponse> {
    const endpoint = `${engineUrl.replace(/\/$/, '')}/v1/inbound`;
    const timeoutMs = this.parseTimeout(
      this.config.get<string>('AI_SERVICE_TIMEOUT_MS', '15000'),
    );

    const apiKey =
      this.config.get<string>('AI_SERVICE_API_KEY') ||
      this.config.get<string>('AI_ENGINE_API_KEY');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          // Merchant-scoped authorization: AI Service validates this JWT
          // to confirm it is allowed to read this merchant's products.
          Authorization: `Bearer ${payload.authorizationToken}`,
          ...(apiKey ? { 'X-Bee3ly-Api-Key': apiKey } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        const body = await this.safeReadText(res);
        this.logger.warn(
          `AI Service rejected token HTTP ${res.status}: ${body.slice(0, 120)}`,
        );
        const isExpired = /expired|exp/i.test(body);
        return this.safeFixedFallback(
          payload,
          isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        );
      }

      if (res.status === 404) {
        this.logger.warn(`AI Service 404 — channel/merchant lookup failed`);
        return this.safeFixedFallback(payload, 'MERCHANT_NOT_FOUND');
      }

      if (!res.ok) {
        const body = await this.safeReadText(res);
        this.logger.warn(
          `AI Service HTTP ${res.status}: ${body.slice(0, 120)}`,
        );
        return this.safeFixedFallback(payload, 'SERVICE_UNAVAILABLE');
      }

      const data = (await res.json()) as { reply?: unknown; error?: string };

      if (typeof data.reply !== 'string' || !data.reply.trim()) {
        this.logger.warn('AI Service returned empty reply');
        return this.safeFixedFallback(payload, 'INVALID_RESPONSE');
      }

      const reply = data.reply.trim();

      await this.persistAiReply(
        payload.businessId,
        payload.conversationId,
        reply,
        'external',
      );

      return { reply, mode: 'external' };
    } catch (e) {
      const aborted =
        e instanceof Error &&
        (e.name === 'AbortError' || e.name === 'TimeoutError');
      if (aborted) {
        this.logger.warn(`AI Service timed out after ${timeoutMs}ms`);
        return this.safeFixedFallback(payload, 'TIMEOUT');
      }
      this.logger.warn(
        `AI Service unreachable: ${e instanceof Error ? e.message : 'unknown'}`,
      );
      return this.safeFixedFallback(payload, 'SERVICE_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }

  // ------------------------------------------------------------------
  // Fallbacks
  // ------------------------------------------------------------------

  /**
   * Local dev-only path — uses the internal rules engine.
   * Kept because the existing codebase supports it explicitly.
   */
  private async devFallback(
    payload: AiEngineInboundPayload,
  ): Promise<AiEngineInboundResponse> {
    try {
      const result = await this.ai.generateReplyOnly({
        businessId: payload.businessId,
        conversationId: payload.conversationId,
        customerId: payload.customerId,
        content: payload.text,
      });
      return {
        reply: result.reply,
        mode: result.reply ? 'dev_fallback' : 'none',
        error: result.reply ? undefined : 'SERVICE_UNAVAILABLE',
      };
    } catch (e) {
      this.logger.warn(
        `Dev fallback failed: ${e instanceof Error ? e.message : 'unknown'}`,
      );
      return this.safeFixedFallback(payload, 'SERVICE_UNAVAILABLE');
    }
  }

  /**
   * SAFEST path: a generic, merchant-specific (name only) acknowledgment.
   *
   * CRITICAL SECURITY: this reply NEVER reads products, orders, or any
   * merchant-scoped content beyond the merchant display name. It is
   * impossible to leak Merchant A's product data into Merchant B's
   * conversation through this fallback.
   */
  private async safeFixedFallback(
    payload: AiEngineInboundPayload,
    error: Exclude<AiEngineInboundResponse['error'], undefined>,
  ): Promise<AiEngineInboundResponse> {
    const business = await this.prisma.business.findUnique({
      where: { id: payload.businessId },
      select: { name: true },
    });
    const shop = business?.name?.trim() || 'المتجر';
    const reply = `أهلاً بيك! رسالتك وصلت لـ ${shop}. هنرد عليك حالاً.`;

    await this.prisma.message.create({
      data: {
        conversationId: payload.conversationId,
        role: MessageRole.AI,
        content: reply,
        meta: { source: 'fixed_fallback', error },
      },
    });
    await this.prisma.conversation.update({
      where: { id: payload.conversationId },
      data: { lastMessageAt: new Date() },
    });
    this.realtime.notifyConversationUpdated(
      payload.businessId,
      payload.conversationId,
    );

    return { reply, mode: 'fixed_fallback', error };
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private async persistAiReply(
    businessId: string,
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
    this.realtime.notifyConversationUpdated(businessId, conversationId);
  }

  private parseTimeout(raw: string): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 15_000;
    return n;
  }

  private async safeReadText(res: Response): Promise<string> {
    try {
      return await res.text();
    } catch {
      return '';
    }
  }
}
