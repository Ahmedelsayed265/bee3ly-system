import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationChannel,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TikTokApiClient } from './tiktok-api.client';
import { TikTokOauthService } from './tiktok-oauth.service';

@Injectable()
export class TikTokOutboundService {
  private readonly logger = new Logger(TikTokOutboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: TikTokApiClient,
    private readonly oauth: TikTokOauthService,
  ) {}

  getSenderName(socialAccountId: string, senderId: string): null {
    void socialAccountId;
    void senderId;
    return null;
  }

  async sendText(socialAccountId: string, recipientId: string, text: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!account || account.platform !== SocialPlatform.TIKTOK) {
      return { sent: false as const };
    }
    if (
      account.status !== SocialConnectionStatus.CONNECTED ||
      !account.accessTokenEnc
    ) {
      return { sent: false as const };
    }

    const conversationId = await this.resolveConversationId(
      account.businessId,
      recipientId,
    );
    if (!conversationId) {
      this.logger.warn(
        `No TikTok conversation_id for customer=${recipientId} business=${account.businessId}`,
      );
      return { sent: false as const };
    }

    const accessToken = await this.resolveAccessToken(account);
    if (!accessToken) {
      return { sent: false as const };
    }

    try {
      return await this.api.sendTextMessage({
        accessToken,
        businessId: account.externalId,
        conversationId,
        text,
      });
    } catch (err) {
      this.logger.warn(
        `TikTok send failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { sent: false as const };
    }
  }

  private async resolveConversationId(
    businessId: string,
    customerExternalId: string,
  ) {
    const message = await this.prisma.message.findFirst({
      where: {
        role: 'CUSTOMER',
        conversation: {
          businessId,
          channel: ConversationChannel.TIKTOK,
          customer: { externalId: customerExternalId },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { meta: true },
    });
    const meta = message?.meta as { tiktokConversationId?: string } | null;
    return meta?.tiktokConversationId?.trim() ?? null;
  }

  private async resolveAccessToken(account: {
    id: string;
    accessTokenEnc: string | null;
    refreshTokenEnc: string | null;
    tokenExpiresAt: Date | null;
  }) {
    if (!account.accessTokenEnc) return null;

    const expiresSoon =
      account.tokenExpiresAt &&
      account.tokenExpiresAt.getTime() < Date.now() + 60_000;

    if (!expiresSoon) {
      return this.oauth.decryptAccessToken(account.accessTokenEnc);
    }

    if (!account.refreshTokenEnc) {
      return this.oauth.decryptAccessToken(account.accessTokenEnc);
    }

    try {
      const refreshed = await this.api.refreshAccessToken(
        this.oauth.decryptRefreshToken(account.refreshTokenEnc),
      );
      const expiresAt =
        refreshed.expires_in && refreshed.expires_in > 0
          ? new Date(Date.now() + refreshed.expires_in * 1000)
          : null;
      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEnc: this.oauth.encrypt(refreshed.access_token),
          refreshTokenEnc: refreshed.refresh_token
            ? this.oauth.encrypt(refreshed.refresh_token)
            : account.refreshTokenEnc,
          tokenExpiresAt: expiresAt,
        },
      });
      return refreshed.access_token;
    } catch (err) {
      this.logger.warn(
        `TikTok token refresh failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.oauth.decryptAccessToken(account.accessTokenEnc);
    }
  }
}
