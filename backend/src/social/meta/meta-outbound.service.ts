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

  async sendText(socialAccountId: string, recipientId: string, text: string) {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!account?.accessTokenEnc) {
      this.logger.warn('Missing token for outbound send');
      return { sent: false };
    }
    if (account.status === SocialConnectionStatus.SIMULATION) {
      return { sent: false, reason: 'simulation' };
    }
    if (account.status === SocialConnectionStatus.REAUTH_REQUIRED) {
      return { sent: false, reason: 'reauth_required' };
    }
    if (account.status !== SocialConnectionStatus.CONNECTED) {
      return { sent: false, reason: 'not_connected' };
    }

    const token = this.oauth.decrypt(account.accessTokenEnc);
    return this.graph.sendTextMessage(token, recipientId, text);
  }
}
