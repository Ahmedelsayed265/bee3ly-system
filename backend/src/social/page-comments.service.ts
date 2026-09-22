import { Injectable, Logger } from '@nestjs/common';
import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
}
