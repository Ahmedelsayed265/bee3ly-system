import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversationChannel,
  SocialPlatform,
} from '@prisma/client';
import { Inject, forwardRef } from '@nestjs/common';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => AiService))
    private readonly ai: AiService,
  ) {}

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const accounts = await this.prisma.socialAccount.findMany({
      where: { businessId },
      select: {
        id: true,
        platform: true,
        displayName: true,
        externalId: true,
        connectedAt: true,
      },
    });
    return {
      accounts,
      metaConfigured: Boolean(this.config.get('META_APP_ID')),
      oauthUrl: this.buildOAuthUrl(businessId),
    };
  }

  /** Dev/demo connect without real Meta OAuth */
  async connectDemo(userId: string, platform: SocialPlatform, displayName?: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const externalId = `demo-${platform.toLowerCase()}-${businessId.slice(0, 8)}`;
    const account = await this.prisma.socialAccount.upsert({
      where: {
        businessId_platform: { businessId, platform },
      },
      create: {
        businessId,
        platform,
        externalId,
        displayName: displayName ?? `${platform} Page`,
        accessTokenEnc: this.encrypt('demo-token'),
      },
      update: {
        displayName: displayName ?? `${platform} Page`,
        accessTokenEnc: this.encrypt('demo-token'),
      },
      select: {
        id: true,
        platform: true,
        displayName: true,
        externalId: true,
        connectedAt: true,
      },
    });
    return { account };
  }

  async disconnect(userId: string, platform: SocialPlatform) {
    const businessId = await this.access.requireBusinessId(userId);
    await this.prisma.socialAccount.deleteMany({
      where: { businessId, platform },
    });
    return { success: true };
  }

  verifyWebhook(mode?: string, token?: string, challenge?: string) {
    const verifyToken = this.config.get<string>(
      'META_WEBHOOK_VERIFY_TOKEN',
      'bee3ly-verify',
    );
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge ?? '';
    }
    throw new BadRequestException('Webhook verification failed');
  }

  async handleWebhook(body: Record<string, unknown>) {
    this.logger.log(`Meta webhook received: ${JSON.stringify(body).slice(0, 500)}`);

    const entry = (body.entry as Array<Record<string, unknown>> | undefined) ?? [];
    for (const item of entry) {
      const messaging =
        (item.messaging as Array<Record<string, unknown>> | undefined) ?? [];
      for (const event of messaging) {
        const sender = event.sender as { id?: string } | undefined;
        const message = event.message as { text?: string } | undefined;
        const recipient = event.recipient as { id?: string } | undefined;
        if (!sender?.id || !message?.text || !recipient?.id) continue;

        const account = await this.prisma.socialAccount.findFirst({
          where: { externalId: recipient.id },
        });
        if (!account) {
          this.logger.warn(`No social account for page ${recipient.id}`);
          continue;
        }

        let customer = await this.prisma.customer.findFirst({
          where: {
            businessId: account.businessId,
            externalId: sender.id,
          },
        });
        if (!customer) {
          customer = await this.prisma.customer.create({
            data: {
              businessId: account.businessId,
              externalId: sender.id,
              platform:
                account.platform === SocialPlatform.INSTAGRAM
                  ? SocialPlatform.INSTAGRAM
                  : SocialPlatform.FACEBOOK,
            },
          });
        }

        let conversation = await this.prisma.conversation.findFirst({
          where: {
            businessId: account.businessId,
            customerId: customer.id,
            channel:
              account.platform === SocialPlatform.INSTAGRAM
                ? ConversationChannel.INSTAGRAM
                : ConversationChannel.FACEBOOK,
          },
          orderBy: { updatedAt: 'desc' },
        });
        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              businessId: account.businessId,
              customerId: customer.id,
              channel:
                account.platform === SocialPlatform.INSTAGRAM
                  ? ConversationChannel.INSTAGRAM
                  : ConversationChannel.FACEBOOK,
            },
          });
        }

        // Reuse the same engine via owner membership (first owner)
        const owner = await this.prisma.teamMember.findFirst({
          where: { businessId: account.businessId, role: 'OWNER' },
        });
        if (!owner) continue;

        await this.ai.simulateMessage(
          owner.userId,
          message.text,
          conversation.id,
        );
      }
    }

    return { success: true };
  }

  private buildOAuthUrl(businessId: string) {
    const appId = this.config.get<string>('META_APP_ID');
    const redirect = this.config.get<string>(
      'META_REDIRECT_URI',
      'http://localhost:3000/social/meta/callback',
    );
    if (!appId) return null;
    const state = Buffer.from(JSON.stringify({ businessId })).toString('base64url');
    const scopes = [
      'pages_show_list',
      'pages_messaging',
      'instagram_basic',
      'instagram_manage_messages',
    ].join(',');
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=${scopes}`;
  }

  private encrypt(value: string) {
    const secret = this.config.get<string>(
      'TOKEN_ENCRYPTION_KEY',
      'bee3ly-dev-encryption-key-32chars!!',
    );
    const key = createHash('sha256').update(secret).digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(payload: string) {
    const secret = this.config.get<string>(
      'TOKEN_ENCRYPTION_KEY',
      'bee3ly-dev-encryption-key-32chars!!',
    );
    const key = createHash('sha256').update(secret).digest();
    const [ivHex, tagHex, dataHex] = payload.split(':');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex!, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex!, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex!, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
