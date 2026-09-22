import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationChannel,
  MessageRole,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
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
};

@Injectable()
export class PageCommentsService {
  private readonly logger = new Logger(PageCommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbound: MetaOutboundService,
    private readonly realtime: RealtimeService,
  ) {}

  async createFromWebhook(input: CreatePageCommentFromWebhookInput) {
    const account = await this.prisma.socialAccount.findFirst({
      where: {
        externalId: input.pageId,
        platform: SocialPlatform.FACEBOOK,
        status: SocialConnectionStatus.CONNECTED,
      },
    });
    if (!account) {
      this.logger.warn(
        `No CONNECTED Facebook SocialAccount for pageId=${input.pageId}`,
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
          platform: SocialPlatform.FACEBOOK,
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

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        businessId: row.businessId,
        customerId: row.customerId,
        channel: ConversationChannel.FACEBOOK,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          businessId: row.businessId,
          customerId: row.customerId,
          channel: ConversationChannel.FACEBOOK,
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
}
