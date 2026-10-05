import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import { BusinessAccessService } from '../common/business-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetaOauthService } from './meta/meta-oauth.service';
import { MetaWebhookService } from './meta/meta-webhook.service';
import {
  WhatsappEmbeddedService,
  type WhatsAppEmbeddedCompleteInput,
} from './meta/whatsapp-embedded.service';
import { TikTokOauthService } from './tiktok/tiktok-oauth.service';
import { TikTokWebhookService } from './tiktok/tiktok-webhook.service';

/**
 * Channel facade for Bee3ly.
 * Provider-specific Meta logic lives under ./meta/*
 */
@Injectable()
export class SocialService implements OnModuleInit {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly config: ConfigService,
    private readonly metaOauth: MetaOauthService,
    private readonly metaWebhook: MetaWebhookService,
    private readonly whatsappEmbedded: WhatsappEmbeddedService,
    private readonly tiktokOauth: TikTokOauthService,
    private readonly tiktokWebhook: TikTokWebhookService,
  ) {}

  async onModuleInit() {
    // A shared Cloud API test token overwrites whichever business is picked.
    // Real merchants connect their own number through Embedded Signup.
    if (this.config.get<string>('WHATSAPP_BIND_TEST_NUMBER') !== 'true') return;

    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim();
    const phoneNumberId = this.config
      .get<string>('WHATSAPP_PHONE_NUMBER_ID')
      ?.trim();
    if (!token || !phoneNumberId) return;

    const existing = await this.prisma.socialAccount.findFirst({
      where: { platform: SocialPlatform.WHATSAPP, externalId: phoneNumberId },
      select: { businessId: true },
    });
    const businessId =
      existing?.businessId ?? (await this.pickWhatsAppBusinessId());
    if (!businessId) {
      this.logger.warn(
        'WhatsApp test token is set, but there is no business to attach it to',
      );
      return;
    }

    await this.prisma.socialAccount.upsert({
      where: {
        businessId_platform: {
          businessId,
          platform: SocialPlatform.WHATSAPP,
        },
      },
      create: {
        businessId,
        provider: 'META',
        platform: SocialPlatform.WHATSAPP,
        externalId: phoneNumberId,
        displayName: 'WhatsApp test',
        accessTokenEnc: this.metaOauth.encrypt(token),
        status: SocialConnectionStatus.CONNECTED,
        capabilities: ['messages', 'send'],
        metadata: { mode: 'test-number' },
      },
      update: {
        externalId: phoneNumberId,
        displayName: 'WhatsApp test',
        accessTokenEnc: this.metaOauth.encrypt(token),
        status: SocialConnectionStatus.CONNECTED,
        capabilities: ['messages', 'send'],
        metadata: { mode: 'test-number' },
      },
    });
    this.logger.log(
      `WhatsApp test number bound phoneNumberId=${phoneNumberId} business=${businessId}`,
    );
  }

  private async pickWhatsAppBusinessId() {
    const connected = await this.prisma.socialAccount.findFirst({
      where: {
        status: SocialConnectionStatus.CONNECTED,
        platform: { in: [SocialPlatform.FACEBOOK, SocialPlatform.INSTAGRAM] },
      },
      orderBy: { updatedAt: 'desc' },
      select: { businessId: true },
    });
    if (connected) return connected.businessId;
    const business = await this.prisma.business.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return business?.id ?? null;
  }

  async list(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const accounts = await this.prisma.socialAccount.findMany({
      where: { businessId },
      select: {
        id: true,
        provider: true,
        platform: true,
        displayName: true,
        externalId: true,
        status: true,
        webhookSubscribedAt: true,
        parentExternalId: true,
        capabilities: true,
        connectedAt: true,
      },
    });
    return {
      accounts,
      metaConfigured: Boolean(this.config.get('META_APP_ID')),
      oauthUrl: this.metaOauth.buildOAuthUrl(businessId, userId),
      connectLabel: 'Connect Facebook & Instagram',
      whatsappEmbedded: this.whatsappEmbedded.getClientConfig(),
      tiktokConfigured: this.tiktokOauth.isConfigured(),
    };
  }

  getWhatsAppEmbeddedConfig() {
    return this.whatsappEmbedded.getClientConfig();
  }

  completeWhatsAppEmbeddedSignup(
    userId: string,
    input: WhatsAppEmbeddedCompleteInput,
  ) {
    return this.whatsappEmbedded.completeSignup(userId, input);
  }

  async connectDemo(
    userId: string,
    platform: SocialPlatform,
    displayName?: string,
  ) {
    const businessId = await this.access.requireBusinessId(userId);
    const externalId = `demo-${platform.toLowerCase()}-${businessId.slice(0, 8)}`;
    const provider = platform === SocialPlatform.TIKTOK ? 'TIKTOK' : 'META';
    const account = await this.prisma.socialAccount.upsert({
      where: {
        businessId_platform: { businessId, platform },
      },
      create: {
        businessId,
        provider,
        platform,
        externalId,
        displayName: displayName ?? `${platform} (Simulation)`,
        accessTokenEnc: this.metaOauth.encrypt('demo-token'),
        status: SocialConnectionStatus.SIMULATION,
        capabilities: ['messages'],
        metadata: { mode: 'simulation' },
      },
      update: {
        provider,
        displayName: displayName ?? `${platform} (Simulation)`,
        accessTokenEnc: this.metaOauth.encrypt('demo-token'),
        status: SocialConnectionStatus.SIMULATION,
        capabilities: ['messages'],
        metadata: { mode: 'simulation' },
      },
      select: {
        id: true,
        platform: true,
        displayName: true,
        externalId: true,
        status: true,
        connectedAt: true,
      },
    });
    return { account };
  }

  async disconnect(userId: string, platform: SocialPlatform) {
    const businessId = await this.access.requireBusinessId(userId);
    await this.prisma.socialAccount.updateMany({
      where: { businessId, platform },
      data: {
        status: SocialConnectionStatus.DISCONNECTED,
        accessTokenEnc: null,
        webhookSubscribedAt: null,
      },
    });
    return { success: true };
  }

  verifyWebhook(mode?: string, token?: string, challenge?: string) {
    return this.metaWebhook.verify(mode, token, challenge);
  }

  verifyWebhookSignature(rawBody: Buffer | string, signature?: string) {
    return this.metaWebhook.verifySignature(rawBody, signature);
  }

  handleWebhook(body: Record<string, unknown>, rawBody?: Buffer | string) {
    return this.metaWebhook.handle(body, rawBody);
  }

  handleOAuthCallback(code?: string, state?: string) {
    return this.metaOauth.handleCallback(code, state);
  }

  getPending(userId: string, pendingId: string) {
    return this.metaOauth.getPending(userId, pendingId);
  }

  selectPage(userId: string, pendingId: string, pageId: string) {
    return this.metaOauth.selectPage(userId, pendingId, pageId);
  }

  startConnect(userId: string) {
    return this.access.requireBusinessId(userId).then((businessId) => {
      const url = this.metaOauth.buildOAuthUrl(businessId, userId);
      if (!url) {
        throw new BadRequestException(
          'META_APP_ID is not configured — use simulation or set Meta credentials',
        );
      }
      return { oauthUrl: url };
    });
  }

  startTikTokConnect(userId: string) {
    return this.access.requireBusinessId(userId).then((businessId) => {
      const url = this.tiktokOauth.buildOAuthUrl(businessId, userId);
      if (!url) {
        throw new BadRequestException(
          'TIKTOK_CLIENT_KEY is not configured — use simulation or set TikTok credentials',
        );
      }
      return { oauthUrl: url };
    });
  }

  handleTikTokOAuthCallback(query: {
    code?: string;
    auth_code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }) {
    return this.tiktokOauth.handleCallback(query);
  }

  handleTikTokWebhook(body: Record<string, unknown>) {
    return this.tiktokWebhook.handle(body);
  }
}
