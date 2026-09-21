import { Injectable, Logger } from '@nestjs/common';
import { SocialConnectionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaGraphClient } from './meta-graph.client';
import { MetaOauthService } from './meta-oauth.service';

@Injectable()
export class MetaOutboundService {
  private readonly logger = new Logger(MetaOutboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphClient,
    private readonly oauth: MetaOauthService,
  ) {}

  private async resolveConnectedToken(socialAccountId: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!account?.accessTokenEnc) {
      this.logger.warn('Missing token for outbound send');
      return null;
    }
    if (account.status === SocialConnectionStatus.SIMULATION) {
      return null;
    }
    if (account.status === SocialConnectionStatus.REAUTH_REQUIRED) {
      return null;
    }
    if (account.status !== SocialConnectionStatus.CONNECTED) {
      return null;
    }
    return this.oauth.decrypt(account.accessTokenEnc);
  }

  async getSenderName(socialAccountId: string, senderId: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    const token = await this.resolveConnectedToken(socialAccountId);
    if (!token || !account?.externalId) return null;

    const fromProfile = await this.graph.getUserProfile(token, senderId);
    if (fromProfile) return fromProfile;

    return this.graph.getSenderNameFromConversations(
      account.externalId,
      token,
      senderId,
    );
  }

  async sendText(socialAccountId: string, recipientId: string, text: string) {
    const token = await this.resolveConnectedToken(socialAccountId);
    if (!token) {
      return { sent: false as const };
    }
    return this.graph.sendTextMessage(token, recipientId, text);
  }
}
