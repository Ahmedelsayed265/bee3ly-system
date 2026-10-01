import { Injectable } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetaOutboundService } from './meta/meta-outbound.service';
import { TikTokOutboundService } from './tiktok/tiktok-outbound.service';

@Injectable()
export class ChannelOutboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaOutboundService,
    private readonly tiktok: TikTokOutboundService,
  ) {}

  async getSenderName(socialAccountId: string, senderId: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
      select: { platform: true },
    });
    if (account?.platform === SocialPlatform.TIKTOK) {
      return this.tiktok.getSenderName(socialAccountId, senderId);
    }
    return this.meta.getSenderName(socialAccountId, senderId);
  }

  async sendText(
    socialAccountId: string,
    recipientId: string,
    text: string,
    quickReplies?: Array<{ title: string; payload: string }>,
  ) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
      select: { platform: true },
    });
    if (account?.platform === SocialPlatform.TIKTOK) {
      return this.tiktok.sendText(socialAccountId, recipientId, text);
    }
    return this.meta.sendText(socialAccountId, recipientId, text, quickReplies);
  }
}
