import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
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
    // ---- Validate merchant authorization token ----------------------------
    // CRITICAL: The AI Service MUST know which merchant/channel this request
    // belongs to so it can fetch the correct product catalog. If no signed
    // JWT is available we MUST NOT call the service — it will return 401
    // "Not authenticated" anyway, and we save a wasted round-trip.
    const token = (payload.authorizationToken ?? '').trim();
    if (!token) {
      this.logger.warn(
        `AI Service skipped — missing authorizationToken for business=${payload.businessId} channel=${payload.channel}`,
      );

      console.log(
        '[AI_SERVICE] ⚠️  SKIPPED: authorizationToken is empty/undefined for merchant',
        payload.businessId,
      );
      return this.safeFixedFallback(payload, 'INVALID_TOKEN');
    }

    // ---- Build endpoint URL ------------------------------------------------
    // Strategy:
    //   1) If the env URL already has a full path ending with /chat or
    //      /inbound (e.g. ".../api/v1/chat") — use it exactly as provided.
    //   2) Otherwise ALWAYS default to "/api/v1/chat" — this is the contract
    //      proven live by the deployed FastAPI/Swagger UI (uvicorn server).
    //      The old "/v1/inbound" path was never wired up on the AI side.
    const raw = engineUrl.replace(/\/$/, '');
    const hasFullPath = /\/(chat|inbound)$/i.test(raw);
    const endpoint = hasFullPath ? raw : `${raw}/api/v1/chat`;

    const timeoutMs = this.parseTimeout(
      this.config.get<string>('AI_SERVICE_TIMEOUT_MS', '15000'),
    );

    const apiKey =
      this.config.get<string>('AI_SERVICE_API_KEY') ||
      this.config.get<string>('AI_ENGINE_API_KEY');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // ---- Build request body ------------------------------------------------
    //
    // The deployed AI Service Swagger accepts:
    //   POST /api/v1/chat  body = { "message": "string" }
    //
    // Bee3ly also sends the full normalized context so the AI Service can
    // read merchant scope, history, customer, agent config if it chooses.
    // Unknown extra keys are ignored by FastAPI by default, so the
    // compatibility layer is non-breaking.
    //
    // NOTE: businessId / merchantId are DOUBLED — both in the signed JWT
    // (claims: sub, businessId, merchantId, customer_id) AND mirrored here in
    // the JSON body — so the AI Service has multiple ways to resolve the
    // merchant scope regardless of which extraction strategy it uses.
    const requestBody = {
      message: payload.text,
      businessId: payload.businessId,
      merchantId: payload.businessId,
      conversationId: payload.conversationId,
      customerId: payload.customerId,
      channel: payload.channel,
      messageId: payload.messageId,
      text: payload.text,
      authorizationToken: token,
      customer: payload.customer,
      history: payload.history,
      agent: payload.agent,
    };

    console.log(
      '\n[AI_SERVICE] ==================================================',
    );

    console.log('[AI_SERVICE] → POST', endpoint);

    console.log(
      '[AI_SERVICE] → merchantId=',
      payload.businessId,
      'channel=',
      payload.channel,
      'conversationId=',
      payload.conversationId,
    );

    console.log(
      '[AI_SERVICE] → customer message:',
      JSON.stringify(payload.text),
    );

    console.log(
      '[AI_SERVICE] → Bearer token (first 40 chars):',
      token.slice(0, 40) + '...',
    );

    console.log(
      '[AI_SERVICE] → token length:',
      token.length,
      'history messages:',
      payload.history?.length ?? 0,
    );
    if (apiKey) {
      console.log('[AI_SERVICE] → X-Bee3ly-Api-Key header: SET');
    }

    try {
      let res = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(apiKey ? { 'X-Bee3ly-Api-Key': apiKey } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      // Fallback path: if the first endpoint 404s, try the other common
      // path. This shields us against env-var URL misconfigurations
      // (e.g. bare host without /api/v1/chat vs host with a different path).
      if (res.status === 404 && !hasFullPath) {
        const fallbackEndpoint = `${raw}/v1/inbound`;
        console.log(
          '[AI_SERVICE] → 404 on primary, trying fallback endpoint',
          fallbackEndpoint,
        );
        res = await fetch(fallbackEndpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(apiKey ? { 'X-Bee3ly-Api-Key': apiKey } : {}),
          },
          body: JSON.stringify(requestBody),
        });
      }

      console.log('[AI_SERVICE] ← HTTP', res.status, res.statusText);

      if (res.status === 401 || res.status === 403) {
        const body = await this.safeReadText(res);

        console.log(
          '[AI_SERVICE] ⚠️  TOKEN REJECTED (401/403):',
          body.slice(0, 240),
        );
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
        console.log(
          '[AI_SERVICE] ⚠️  404 NOT FOUND — check AI_SERVICE_URL path (should end with /api/v1/chat)',
        );
        this.logger.warn(
          `AI Service 404 — endpoint unreachable at ${endpoint} — fix AI_SERVICE_URL or ensure the AI service exposes /api/v1/chat`,
        );
        return this.safeFixedFallback(payload, 'SERVICE_UNAVAILABLE');
      }

      if (!res.ok) {
        const body = await this.safeReadText(res);

        console.log(
          '[AI_SERVICE] ⚠️  NON-2XX:',
          res.status,
          'body:',
          body.slice(0, 240),
        );
        this.logger.warn(
          `AI Service HTTP ${res.status}: ${body.slice(0, 120)}`,
        );
        return this.safeFixedFallback(payload, 'SERVICE_UNAVAILABLE');
      }

      const text = await this.safeReadText(res);

      console.log('[AI_SERVICE] ← raw response body:', text.slice(0, 1000));

      // Parse flexible response shapes:
      //   Deployed FastAPI /api/v1/chat contract is likely:
      //      { "reply": "..." }     (our contract)  OR
      //      { "message": "..." }   (Swagger UI-style mirror)  OR
      //      { "data": { "reply": "..." } } OR raw string
      let reply: string | null = null;
      let toolsUsed: string[] | undefined;
      let order: unknown;
      let lead: unknown;
      let needsHuman = false;
      let handoffReason: string | undefined;
      try {
        const json = JSON.parse(text) as
          | {
              reply?: unknown;
              message?: unknown;
              data?: unknown;
              toolsUsed?: unknown;
              order?: unknown;
              lead?: unknown;
              needsHuman?: unknown;
              handoffReason?: unknown;
            }
          | string;
        if (typeof json === 'string') {
          reply = json.trim() || null;
        } else {
          const r = json.reply ?? json.message;
          if (typeof r === 'string' && r.trim()) {
            reply = r.trim();
          } else if (
            json.data &&
            typeof json.data === 'object' &&
            json.data !== null
          ) {
            const inner = (json.data as { reply?: unknown; message?: unknown })
              .reply;
            const innerMsg = (
              json.data as { reply?: unknown; message?: unknown }
            ).message;
            const pick = typeof inner === 'string' ? inner : innerMsg;
            if (typeof pick === 'string' && pick.trim()) reply = pick.trim();
          }
          if (Array.isArray(json.toolsUsed)) {
            toolsUsed = json.toolsUsed.filter(
              (t): t is string => typeof t === 'string',
            );
          }
          if (json.order) order = json.order;
          if (json.lead) lead = json.lead;
          if (json.needsHuman === true) needsHuman = true;
          if (typeof json.handoffReason === 'string') {
            handoffReason = json.handoffReason;
          }
        }
      } catch {
        // Not JSON — treat plain text body as reply directly
        const trimmed = text.trim();
        if (trimmed) reply = trimmed;
      }

      if (!reply) {
        console.log('[AI_SERVICE] ⚠️  EMPTY / INVALID reply');
        this.logger.warn('AI Service returned empty reply');
        return this.safeFixedFallback(payload, 'INVALID_RESPONSE');
      }

      console.log('[AI_SERVICE] ✅ FINAL AI REPLY:', JSON.stringify(reply));

      console.log(
        '[AI_SERVICE] ==================================================\n',
      );

      await this.persistAiReply(
        payload.businessId,
        payload.conversationId,
        reply,
        'external',
        { toolsUsed, order, lead, needsHuman, handoffReason },
      );

      if (needsHuman) {
        await this.prisma.conversation.update({
          where: { id: payload.conversationId },
          data: {
            needsHuman: true,
            status: 'NEEDS_HUMAN',
            mode: 'HUMAN',
            conversionStage: 'HUMAN_HANDOFF',
            handoffReason: handoffReason ?? 'AI handoff',
          },
        });
        this.realtime.notifyConversationUpdated(
          payload.businessId,
          payload.conversationId,
        );
      } else if (order) {
        await this.prisma.conversation.update({
          where: { id: payload.conversationId },
          data: { conversionStage: 'CONVERTED' },
        });
      }

      return {
        reply,
        mode: 'external',
        toolsUsed,
        order,
        lead,
        needsHuman,
        handoffReason,
      };
    } catch (e) {
      const aborted =
        e instanceof Error &&
        (e.name === 'AbortError' || e.name === 'TimeoutError');
      if (aborted) {
        console.log('[AI_SERVICE] ⏱️  TIMEOUT after', timeoutMs, 'ms');
        this.logger.warn(`AI Service timed out after ${timeoutMs}ms`);
        return this.safeFixedFallback(payload, 'TIMEOUT');
      }

      console.log(
        '[AI_SERVICE] ❌ NETWORK ERROR:',
        e instanceof Error ? e.message : 'unknown',
        e instanceof Error && e.stack ? '\n' + e.stack.slice(0, 300) : '',
      );
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
    extra?: {
      toolsUsed?: string[];
      order?: unknown;
      lead?: unknown;
      needsHuman?: boolean;
      handoffReason?: string;
    },
  ) {
    await this.prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.AI,
        content,
        meta: {
          source,
          ...(extra?.toolsUsed?.length
            ? { toolsUsed: extra.toolsUsed }
            : {}),
          ...(extra?.order ? { orderId: (extra.order as { id?: string }).id } : {}),
          ...(extra?.needsHuman ? { needsHuman: true } : {}),
        },
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
