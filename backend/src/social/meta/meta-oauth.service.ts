import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import { BusinessAccessService } from '../../common/business-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaGraphClient } from './meta-graph.client';

@Injectable()
export class MetaOauthService {
  private readonly logger = new Logger(MetaOauthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly config: ConfigService,
    private readonly graph: MetaGraphClient,
  ) {}

  buildOAuthUrl(businessId: string, userId: string) {
    const appId = this.config.get<string>('META_APP_ID');
    const redirect = this.config.get<string>(
      'META_REDIRECT_URI',
      'http://localhost:3000/social/meta/callback',
    );
    if (!appId) return null;
    const state = Buffer.from(JSON.stringify({ businessId, userId })).toString(
      'base64url',
    );
    const scopes = [
      'pages_show_list',
      'pages_messaging',
      'pages_manage_metadata',
    ].join(',');
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=${scopes}`;
  }

  async handleCallback(code?: string, state?: string) {
    if (!code || !state) throw new BadRequestException('Missing code/state');

    let businessId: string;
    let userId: string;
    try {
      const parsed = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf8'),
      ) as { businessId?: string; userId?: string };
      if (!parsed.businessId || !parsed.userId) throw new Error('bad state');
      businessId = parsed.businessId;
      userId = parsed.userId;
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    const token = await this.graph.exchangeCode(code);
    const pages = await this.graph.listPages(token.access_token);
    if (pages.length === 0) {
      throw new BadRequestException('No Facebook Pages found for this account');
    }

    const pending = await this.prisma.pendingMetaConnection.create({
      data: {
        businessId,
        userId,
        userAccessTokenEnc: this.encrypt(token.access_token),
        pagesJson: pages.map((p) => ({
          id: p.id,
          name: p.name,
          access_token: p.access_token,
          instagram_business_account: p.instagram_business_account ?? null,
        })),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Mark connecting state (no page selected yet)
    await this.prisma.socialAccount.upsert({
      where: {
        businessId_platform: {
          businessId,
          platform: SocialPlatform.FACEBOOK,
        },
      },
      create: {
        businessId,
        provider: 'META',
        platform: SocialPlatform.FACEBOOK,
        externalId: `pending-${pending.id}`,
        displayName: 'Connecting…',
        status: SocialConnectionStatus.CONNECTING,
        metadata: { pendingId: pending.id },
      },
      update: {
        status: SocialConnectionStatus.CONNECTING,
        metadata: { pendingId: pending.id },
      },
    });

    const frontend = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    )
      .split(',')[0]
      .trim();
    return {
      redirectTo: `${frontend}/app/settings?metaPending=${pending.id}`,
      pendingId: pending.id,
    };
  }

  async getPending(userId: string, pendingId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const pending = await this.prisma.pendingMetaConnection.findFirst({
      where: { id: pendingId, businessId, userId },
    });
    if (!pending || pending.expiresAt < new Date()) {
      throw new NotFoundException('Pending Meta connection expired or missing');
    }
    const pages = (
      pending.pagesJson as Array<{
        id: string;
        name: string;
        instagram_business_account?: { id: string } | null;
      }>
    ).map((p) => ({
      id: p.id,
      name: p.name,
      hasInstagram: Boolean(p.instagram_business_account?.id),
    }));
    return { pendingId: pending.id, pages };
  }

  async selectPage(userId: string, pendingId: string, pageId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const pending = await this.prisma.pendingMetaConnection.findFirst({
      where: { id: pendingId, businessId, userId },
    });
    if (!pending || pending.expiresAt < new Date()) {
      throw new NotFoundException('Pending Meta connection expired or missing');
    }

    const pages = pending.pagesJson as Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string } | null;
    }>;
    const page = pages.find((p) => p.id === pageId);
    if (!page)
      throw new BadRequestException('Page not found in pending session');

    const subscribe = await this.graph.subscribeApp(page.id, page.access_token);
    if (!subscribe.success) {
      this.logger.warn(`Webhook subscribe failed for page ${page.id}`);
    }

    const fb = await this.prisma.socialAccount.upsert({
      where: {
        businessId_platform: {
          businessId,
          platform: SocialPlatform.FACEBOOK,
        },
      },
      create: {
        businessId,
        provider: 'META',
        platform: SocialPlatform.FACEBOOK,
        externalId: page.id,
        displayName: page.name,
        accessTokenEnc: this.encrypt(page.access_token),
        status: SocialConnectionStatus.CONNECTED,
        webhookSubscribedAt: subscribe.success ? new Date() : null,
        capabilities: ['messages', 'send'],
        metadata: {
          pageId: page.id,
          webhookSubscribed: subscribe.success,
        },
      },
      update: {
        externalId: page.id,
        displayName: page.name,
        accessTokenEnc: this.encrypt(page.access_token),
        status: SocialConnectionStatus.CONNECTED,
        webhookSubscribedAt: subscribe.success ? new Date() : null,
        capabilities: ['messages', 'send'],
        metadata: {
          pageId: page.id,
          webhookSubscribed: subscribe.success,
        },
      },
    });

    let ig = null;
    if (page.instagram_business_account?.id) {
      ig = await this.prisma.socialAccount.upsert({
        where: {
          businessId_platform: {
            businessId,
            platform: SocialPlatform.INSTAGRAM,
          },
        },
        create: {
          businessId,
          provider: 'META',
          platform: SocialPlatform.INSTAGRAM,
          externalId: page.instagram_business_account.id,
          displayName: `${page.name} · Instagram`,
          accessTokenEnc: this.encrypt(page.access_token),
          status: SocialConnectionStatus.CONNECTED,
          parentExternalId: page.id,
          webhookSubscribedAt: subscribe.success ? new Date() : null,
          capabilities: ['messages', 'send'],
          metadata: {
            pageId: page.id,
            igBusinessId: page.instagram_business_account.id,
          },
        },
        update: {
          externalId: page.instagram_business_account.id,
          displayName: `${page.name} · Instagram`,
          accessTokenEnc: this.encrypt(page.access_token),
          status: SocialConnectionStatus.CONNECTED,
          parentExternalId: page.id,
          webhookSubscribedAt: subscribe.success ? new Date() : null,
          capabilities: ['messages', 'send'],
          metadata: {
            pageId: page.id,
            igBusinessId: page.instagram_business_account.id,
          },
        },
      });
    }

    await this.prisma.pendingMetaConnection.delete({
      where: { id: pending.id },
    });

    return {
      facebook: {
        id: fb.id,
        displayName: fb.displayName,
        status: fb.status,
        webhookSubscribed: Boolean(fb.webhookSubscribedAt),
      },
      instagram: ig
        ? {
            id: ig.id,
            displayName: ig.displayName,
            status: ig.status,
          }
        : null,
      notice: ig
        ? 'Facebook & Instagram connected'
        : 'Facebook Page connected (no Instagram Business account on this Page)',
    };
  }

  encrypt(value: string) {
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
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
}
