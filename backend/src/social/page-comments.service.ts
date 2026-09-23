import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversationChannel,
  MessageRole,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { MetaGraphClient } from './meta/meta-graph.client';
import { MetaOauthService } from './meta/meta-oauth.service';
import { MetaOutboundService } from './meta/meta-outbound.service';

export type CreatePageCommentFromWebhookInput = {
  pageId: string;
  commentId: string;
  postId: string;
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
        rawPayload: input.rawPayload as object,
      },
    });

    this.logger.log(
      `Comment received commentId=${row.commentId} postId=${row.postId}`,
    );
    return row;
  }

  /**
   * Open (or reuse) an Inbox FACEBOOK conversation for this comment and
   * seed it with the comment text as a customer message.
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

    if (!alreadySeeded) {
      const content =
        row.message?.trim() ||
        `(تعليق على المنشور ${row.postId})`;
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: MessageRole.CUSTOMER,
          content,
          meta: {
            source: 'page_comment',
            pageCommentId: row.commentId,
            postId: row.postId,
            pageId: row.pageId,
          },
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    await this.prisma.pageComment.update({
      where: { id: row.id },
      data: { conversationId: conversation.id },
    });

    this.realtime.notifyConversationUpdated(
      row.businessId,
      conversation.id,
    );
    return conversation;
  }

  /**
   * Instagram comment webhook: save, open an INSTAGRAM inbox thread,
   * then send the fixed public reply and a private DM.
   */
  async handleInstagramComment(input: CreatePageCommentFromWebhookInput) {
    const created = await this.createFromWebhook({
      ...input,
      platform: SocialPlatform.INSTAGRAM,
    });
    if (!created) return null;
    if (created.publicRepliedAt && created.privateRepliedAt) return created;

    await this.ensureConversationFromComment(created.commentId);
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

    const replyText = this.fixedReply(
      account.business?.name,
      account.business?.aiAgent?.commentFixedReply,
    );

    if (!row.publicRepliedAt) {
      const reply = await this.graph.replyToInstagramComment(
        row.commentId,
        token,
        replyText,
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

    if (!row.privateRepliedAt) {
      const pageId = account.parentExternalId || input.pageId;
      const priv = await this.graph.sendInstagramPrivateReply(
        pageId,
        token,
        row.commentId,
        replyText,
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
            ? `IG private reply sent commentId=${row.commentId} messageId=${priv.messageId}`
            : `IG private reply already sent commentId=${row.commentId}`,
        );
        if (row.conversationId) {
          const seeded = await this.prisma.message.findFirst({
            where: {
              conversationId: row.conversationId,
              meta: {
                path: ['pageCommentId'],
                equals: row.commentId,
              },
            },
          });
          if (!seeded) {
            await this.prisma.message.create({
              data: {
                conversationId: row.conversationId,
                role: MessageRole.AI,
                content: replyText,
                meta: {
                  source: 'ig_comment_private_reply',
                  pageCommentId: row.commentId,
                  metaMessageId: priv.sent ? priv.messageId : null,
                },
              },
            });
            await this.prisma.conversation.update({
              where: { id: row.conversationId },
              data: { lastMessageAt: new Date() },
            });
            this.realtime.notifyConversationUpdated(
              row.businessId,
              row.conversationId,
            );
          }
        }
      }
    }

    return row;
  }

  private fixedReply(businessName?: string | null, businessReply?: string | null) {
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
}
