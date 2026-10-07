import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversationChannel,
  MessageRole,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { UsageService } from '../billing/usage.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AiEngineAdapter } from '../channels/ai-engine.adapter';
import { MerchantTokenService } from '../channels/merchant-token.service';
import type {
  AiEngineInboundPayload,
  ChannelType,
} from '../channels/channel.types';
import { MetaGraphClient } from './meta/meta-graph.client';
import { MetaOauthService } from './meta/meta-oauth.service';
import { MetaOutboundService } from './meta/meta-outbound.service';

export type CreatePageCommentFromWebhookInput = {
  pageId: string;
  commentId: string;
  postId: string;
  /** Caption/body of the parent post when already known (poll/webhook). */
  postMessage?: string | null;
  fromUserId: string;
  fromName?: string | null;
  message: string;
  commentedAt: Date;
  rawPayload: unknown;
  platform?: SocialPlatform;
};

@Injectable()
export class PageCommentsService {
  private readonly logger = new Logger(PageCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbound: MetaOutboundService,
    private readonly realtime: RealtimeService,
    private readonly graph: MetaGraphClient,
    private readonly oauth: MetaOauthService,
    private readonly config: ConfigService,
    private readonly aiEngine: AiEngineAdapter,
    private readonly tokens: MerchantTokenService,
    private readonly usage: UsageService,
  ) {}

  async createFromWebhook(input: CreatePageCommentFromWebhookInput) {
    const platform = input.platform ?? SocialPlatform.FACEBOOK;
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        externalId: input.pageId,
        platform,
        status: SocialConnectionStatus.CONNECTED,
      },
    });
    if (!account) {
      this.logger.warn(
        `No CONNECTED ${platform} SocialAccount for id=${input.pageId}`,
      );
      return null;
    }

    let customer = await this.prisma.customer.findFirst({
      where: {
        businessId: account.businessId,
        externalId: input.fromUserId,
      },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          businessId: account.businessId,
          externalId: input.fromUserId,
          platform,
          name: input.fromName?.trim() || null,
        },
      });
    }

    if (!customer.name) {
      let name = input.fromName?.trim() || null;
      if (!name) {
        name = await this.outbound.getSenderName(account.id, input.fromUserId);
      }
      if (name) {
        customer = await this.prisma.customer.update({
          where: { id: customer.id },
          data: { name },
        });
      }
    }

    const existing = await this.prisma.pageComment.findUnique({
      where: { commentId: input.commentId },
    });
    if (existing) {
      return existing;
    }

    const rawPayload = this.withPostMessageHint(
      input.rawPayload,
      input.postMessage,
    );

    const row = await this.prisma.pageComment.create({
      data: {
        commentId: input.commentId,
        postId: input.postId,
        pageId: input.pageId,
        fromUserId: input.fromUserId,
        message: input.message,
        commentedAt: input.commentedAt,
        businessId: account.businessId,
        customerId: customer.id,
        rawPayload: rawPayload as object,
      },
    });

    this.logger.log(
      `Comment received commentId=${row.commentId} postId=${row.postId}`,
    );
    return row;
  }

  /**
   * Open (or reuse) an Inbox FACEBOOK/INSTAGRAM conversation for this comment,
   * seed it with the comment text as a customer message, then run the AI
   * engine to generate a reply so the merchant inbox + DM flow works the
   * same way as any other channel inbound message.
   */
  async ensureConversationFromComment(commentId: string) {
    const row = await this.prisma.pageComment.findUnique({
      where: { commentId },
    });
    if (!row) return null;
    if (row.conversationId) {
      return this.prisma.conversation.findUnique({
        where: { id: row.conversationId },
      });
    }

    const channel = await this.channelForComment(row.pageId);
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        businessId: row.businessId,
        customerId: row.customerId,
        channel,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          businessId: row.businessId,
          customerId: row.customerId,
          channel,
          mode: 'AI',
          status: 'OPEN',
          lastMessageAt: row.commentedAt,
        },
      });
      await this.usage.recordConversation(row.businessId, conversation.id);
      this.logger.log(
        `New conversation from comment conversationId=${conversation.id} commentId=${row.commentId}`,
      );
    }

    const alreadySeeded = await this.prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        meta: {
          path: ['pageCommentId'],
          equals: row.commentId,
        },
      },
    });

    let seededMessageId: string | null = null;
    const commentText =
      row.message?.trim() || `(تعليق على المنشور ${row.postId})`;
    const postContext = await this.resolvePostContext(row);
    const content = this.formatCommentWithPostContext(commentText, postContext);

    if (!alreadySeeded) {
      const msg = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.CUSTOMER,
          content,
          meta: {
            source: 'page_comment',
            pageCommentId: row.commentId,
            postId: row.postId,
            pageId: row.pageId,
            postMessage: postContext.text,
            postPermalink: postContext.permalink,
            postMediaType: postContext.mediaType,
          },
        },
      });
      seededMessageId = msg.id;
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    await this.prisma.pageComment.update({
      where: { id: row.id },
      data: { conversationId: conversation.id },
    });

    this.realtime.notifyConversationUpdated(row.businessId, conversation.id);

    // ------------------------------------------------------------------
    // Trigger AI for the newly-seeded comment conversation so the
    // merchant gets an AI-generated reply in the inbox exactly like
    // a normal inbound DM. Post caption/body is included in `content`
    // so the model knows what the customer commented on.
    // ------------------------------------------------------------------
    if (conversation.mode !== 'HUMAN' && !conversation.needsHuman) {
      void this.runAiForCommentConversation({
        businessId: row.businessId,
        conversationId: conversation.id,
        customerId: row.customerId,
        channel: conversation.channel as ChannelType,
        seededMessageId,
        customerMessage: content,
      }).catch((e) =>
        this.logger.warn(
          `AI run for comment ${row.commentId} failed: ${e instanceof Error ? e.message : 'unknown'}`,
        ),
      );
    }

    return conversation;
  }

  /**
   * Instagram comment webhook: save, open INSTAGRAM inbox thread,
   * send a configurable PUBLIC acknowledgment (merchant policy),
   * then run the AI engine for the private DM/inbox conversation.
   *
   * The private DM content comes from the AI Service response; we no
   * longer hardcode a private reply text.
   */
  async handleInstagramComment(input: CreatePageCommentFromWebhookInput) {
    const created = await this.createFromWebhook({
      ...input,
      platform: SocialPlatform.INSTAGRAM,
    });
    if (!created) return null;
    if (created.publicRepliedAt && created.privateRepliedAt) return created;

    const conversation = await this.ensureConversationFromComment(
      created.commentId,
    );
    let row = await this.prisma.pageComment.findUnique({
      where: { id: created.id },
    });
    if (!row) return created;

    const account = await this.prisma.socialAccount.findFirst({
      where: {
        externalId: input.pageId,
        platform: SocialPlatform.INSTAGRAM,
        status: SocialConnectionStatus.CONNECTED,
      },
      include: {
        business: {
          select: {
            name: true,
            aiAgent: { select: { commentFixedReply: true } },
          },
        },
      },
    });
    if (!account?.accessTokenEnc) return row;

    let token: string;
    try {
      token = this.oauth.decrypt(account.accessTokenEnc);
    } catch {
      this.logger.warn(`IG comment token decrypt failed ig=${input.pageId}`);
      return row;
    }

    // ------------------------------------------------------------------
    // Public reply: merchant/agent-configurable canned ack.
    // Public threads are visible to all Facebook/Instagram users so the
    // merchant (not the AI) should own this exact wording via the
    // `commentFixedReply` agent setting or env override.
    // ------------------------------------------------------------------
    const publicReplyText = this.publicCommentAck(
      account.business?.name,
      account.business?.aiAgent?.commentFixedReply,
    );

    if (!row.publicRepliedAt) {
      const reply = await this.graph.replyToInstagramComment(
        row.commentId,
        token,
        publicReplyText,
      );
      if (reply.ok) {
        row = await this.prisma.pageComment.update({
          where: { id: row.id },
          data: {
            publicReplyId: reply.replyId,
            publicRepliedAt: new Date(),
          },
        });
        this.logger.log(
          `IG public reply sent commentId=${row.commentId} replyId=${reply.replyId}`,
        );
      }
    }

    // ------------------------------------------------------------------
    // Private DM: let the AI engine respond using the already-seeded
    // conversation. We do NOT duplicate-send if AI already produced a
    // reply through runAiForCommentConversation.
    // ------------------------------------------------------------------
    if (!row.privateRepliedAt && conversation) {
      // Wait briefly so the concurrent AI run (fired above) can insert
      // its reply message before we decide whether to send it.
      const latestAiMsg = await this.waitForLatestAiMessage(
        conversation.id,
        4000,
      );

      if (latestAiMsg) {
        const pageId = account.parentExternalId || input.pageId;
        const priv = await this.graph.sendInstagramPrivateReply(
          pageId,
          token,
          row.commentId,
          latestAiMsg.content,
        );
        const alreadyReplied =
          !priv.sent &&
          typeof priv.error === 'string' &&
          priv.error.includes('already has a reply');
        if (priv.sent || alreadyReplied) {
          row = await this.prisma.pageComment.update({
            where: { id: row.id },
            data: { privateRepliedAt: new Date() },
          });
          this.logger.log(
            priv.sent
              ? `IG private AI reply sent commentId=${row.commentId} messageId=${priv.messageId}`
              : `IG private reply already sent commentId=${row.commentId}`,
          );
          if (
            priv.sent &&
            !(latestAiMsg.meta as Record<string, unknown> | null)?.[
              'metaMessageId'
            ]
          ) {
            await this.prisma.message.update({
              where: { id: latestAiMsg.id },
              data: {
                meta: {
                  ...(latestAiMsg.meta as Record<string, unknown> | null),
                  pageCommentId: row.commentId,
                  metaMessageId: priv.messageId,
                },
              },
            });
          }
        }
      }
    }

    return row;
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  /**
   * Resolve parent post caption/body for AI + inbox context.
   * Prefer payload/poll hint, then Graph API fetch.
   */
  private async resolvePostContext(row: {
    postId: string;
    pageId: string;
    businessId: string;
    rawPayload: unknown;
  }): Promise<{
    text: string | null;
    permalink: string | null;
    mediaType: string | null;
  }> {
    const fromPayload = this.extractPostMessageFromPayload(row.rawPayload);
    if (fromPayload) {
      return { text: fromPayload, permalink: null, mediaType: null };
    }

    const account = await this.prisma.socialAccount.findFirst({
      where: {
        businessId: row.businessId,
        externalId: row.pageId,
        status: SocialConnectionStatus.CONNECTED,
        accessTokenEnc: { not: null },
      },
      select: { accessTokenEnc: true, platform: true },
    });
    if (!account?.accessTokenEnc) {
      return { text: null, permalink: null, mediaType: null };
    }

    let token: string;
    try {
      token = this.oauth.decrypt(account.accessTokenEnc);
    } catch {
      return { text: null, permalink: null, mediaType: null };
    }

    const platform =
      account.platform === SocialPlatform.INSTAGRAM ? 'INSTAGRAM' : 'FACEBOOK';
    const fetched = await this.graph.getPostContent(
      row.postId,
      token,
      platform,
    );
    if (!fetched.ok) {
      return { text: null, permalink: null, mediaType: null };
    }
    return {
      text: fetched.text,
      permalink: fetched.permalink,
      mediaType: fetched.mediaType,
    };
  }

  private withPostMessageHint(
    rawPayload: unknown,
    postMessage?: string | null,
  ): unknown {
    const hint = postMessage?.trim();
    if (!hint) return rawPayload ?? null;
    if (
      rawPayload &&
      typeof rawPayload === 'object' &&
      !Array.isArray(rawPayload)
    ) {
      return { ...(rawPayload as Record<string, unknown>), postMessage: hint };
    }
    return { postMessage: hint, raw: rawPayload ?? null };
  }

  private extractPostMessageFromPayload(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const root = raw as Record<string, unknown>;

    // Poller / createFromWebhook may stash post text at the top level.
    if (typeof root.postMessage === 'string' && root.postMessage.trim()) {
      return root.postMessage.trim();
    }

    const value =
      root.value && typeof root.value === 'object'
        ? (root.value as Record<string, unknown>)
        : root;

    const post = value.post as Record<string, unknown> | undefined;
    if (post) {
      if (typeof post.message === 'string' && post.message.trim()) {
        return post.message.trim();
      }
      if (typeof post.story === 'string' && post.story.trim()) {
        return post.story.trim();
      }
    }

    const media = value.media as Record<string, unknown> | undefined;
    if (media && typeof media.caption === 'string' && media.caption.trim()) {
      return media.caption.trim();
    }

    return null;
  }

  /** Build customer/AI message that includes the parent post. */
  private formatCommentWithPostContext(
    commentText: string,
    post: {
      text: string | null;
      permalink: string | null;
      mediaType: string | null;
    },
  ) {
    const postBody = post.text?.trim();
    if (postBody) {
      return [
        'تعليق على المنشور التالي:',
        postBody,
        '',
        `تعليق العميل: ${commentText}`,
      ].join('\n');
    }

    const mediaHint = post.mediaType ? ` (نوع المحتوى: ${post.mediaType})` : '';
    const linkHint = post.permalink ? `\nرابط المنشور: ${post.permalink}` : '';
    return [
      `تعليق على منشور${mediaHint}${linkHint}`,
      '',
      `تعليق العميل: ${commentText}`,
    ].join('\n');
  }

  /** Acknowledgment shown on a public comment — merchant-owned wording. */
  private publicCommentAck(
    businessName?: string | null,
    businessReply?: string | null,
  ) {
    const fromBusiness = businessReply?.trim();
    if (fromBusiness) return fromBusiness;
    const fromEnv = this.config.get<string>('META_COMMENT_FIXED_REPLY')?.trim();
    if (fromEnv) return fromEnv;
    const shop = businessName?.trim() || 'المتجر';
    return `أهلاً بيك! تعليقك وصل لـ ${shop}. هنبعتلك التفاصيل في رسالة خاصة قريب 💬`;
  }

  private async channelForComment(pageId: string) {
    const ig = await this.prisma.socialAccount.findFirst({
      where: {
        externalId: pageId,
        platform: SocialPlatform.INSTAGRAM,
      },
      select: { id: true },
    });
    return ig ? ConversationChannel.INSTAGRAM : ConversationChannel.FACEBOOK;
  }

  /**
   * Generate an AI response for the conversation that was just seeded
   * from a page comment. Mirrors the logic InboundMessageService uses
   * so every channel gets the same AI experience.
   */
  private async runAiForCommentConversation(input: {
    businessId: string;
    conversationId: string;
    customerId: string;
    channel: ChannelType;
    seededMessageId: string | null;
    customerMessage: string;
  }) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: input.conversationId },
      select: { id: true, mode: true, needsHuman: true, channel: true },
    });
    if (
      !conversation ||
      conversation.mode === 'HUMAN' ||
      conversation.needsHuman
    ) {
      return;
    }

    const authorizationToken = await this.tokens.issueForMerchant(
      input.businessId,
    );
    const [historyRows, agentRow, customer] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: 'asc' },
        take: 40,
        select: { role: true, content: true, createdAt: true },
      }),
      this.prisma.aIAgent.findUnique({
        where: { businessId: input.businessId },
        select: {
          primaryGoal: true,
          secondaryGoals: true,
          tone: true,
          instructions: true,
        },
      }),
      this.prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { name: true, phone: true, externalId: true },
      }),
    ]);

    const payload: AiEngineInboundPayload = {
      businessId: input.businessId,
      conversationId: input.conversationId,
      customerId: input.customerId,
      channel: input.channel,
      messageId:
        (input.seededMessageId ??
        historyRows[historyRows.length - 1]?.role === 'CUSTOMER')
          ? ((
              await this.prisma.message.findFirst({
                where: {
                  conversationId: input.conversationId,
                  role: MessageRole.CUSTOMER,
                },
                orderBy: { createdAt: 'desc' },
                select: { id: true },
              })
            )?.id ?? 'comment-seed')
          : 'comment-seed',
      text: input.customerMessage,
      authorizationToken,
      customer: {
        name: customer?.name ?? null,
        phone: customer?.phone ?? null,
        externalId: customer?.externalId ?? null,
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

    // Adapter persists its own reply message and fires realtime events.
    await this.aiEngine.handleInbound(payload);
  }

  /** Poll up to `timeoutMs` for the most recent AI reply in a conversation. */
  private async waitForLatestAiMessage(
    conversationId: string,
    timeoutMs: number,
  ): Promise<{ id: string; content: string; meta: unknown } | null> {
    const start = Date.now();
    const intervalMs = 250;
    while (Date.now() - start < timeoutMs) {
      const latest = await this.prisma.message.findFirst({
        where: {
          conversationId,
          role: MessageRole.AI,
          NOT: {
            meta: {
              path: ['source'],
              equals: 'ig_comment_private_reply',
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, content: true, meta: true, createdAt: true },
      });
      if (latest && latest.createdAt.getTime() >= start - 1000) {
        return latest;
      }
      if (latest) return latest;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return this.prisma.message.findFirst({
      where: { conversationId, role: MessageRole.AI },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, meta: true },
    });
  }
}
