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

    const platform =
      account.platform === 'INSTAGRAM' ? 'instagram' : 'messenger';
    const ownerIds = [
      account.externalId,
      account.parentExternalId,
    ].filter((id): id is string => Boolean(id));

    for (const ownerId of ownerIds) {
      const name = await this.graph.getSenderNameFromConversations(
        ownerId,
        token,
        senderId,
        platform,
      );
      if (name) return name;
    }
    return null;
  }

  async sendText(socialAccountId: string, recipientId: string, text: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    const token = await this.resolveConnectedToken(socialAccountId);
    if (!token || !account) {
      return { sent: false as const };
    }
    const pageId = account.parentExternalId || account.externalId;
    if (pageId) {
      await this.graph.takeThreadControl(pageId, token, recipientId);
    }
    return this.graph.sendTextMessage(token, recipientId, text);
  }
}
