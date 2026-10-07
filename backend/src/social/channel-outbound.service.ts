import { Injectable } from '@nestjs/common';
import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import { EntitlementsService } from '../billing/entitlements.service';
import { UsageService } from '../billing/usage.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetaOutboundService } from './meta/meta-outbound.service';
import { TikTokOutboundService } from './tiktok/tiktok-outbound.service';

@Injectable()
export class ChannelOutboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaOutboundService,
    private readonly tiktok: TikTokOutboundService,
    private readonly entitlements: EntitlementsService,
    private readonly usage: UsageService,
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
      select: { platform: true, businessId: true, status: true },
    });
    if (!account) return { sent: false as const };
    await this.entitlements.assertCanSend(account.businessId);
    const meterWhatsApp =
      account.platform === SocialPlatform.WHATSAPP &&
      account.status === SocialConnectionStatus.CONNECTED;
    if (meterWhatsApp) {
      await this.usage.assertWhatsAppAvailable(account.businessId);
    }
    const sent =
      account.platform === SocialPlatform.TIKTOK
        ? await this.tiktok.sendText(socialAccountId, recipientId, text)
        : await this.meta.sendText(
            socialAccountId,
            recipientId,
            text,
            quickReplies,
          );
    if (meterWhatsApp && sent.sent) {
      await this.usage.consumeWhatsApp(account.businessId, 1, 'outbound');
    }
    return sent;
  }
}
