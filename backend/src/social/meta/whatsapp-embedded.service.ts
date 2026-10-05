import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import { BusinessAccessService } from '../../common/business-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaGraphClient } from './meta-graph.client';
import { MetaOauthService } from './meta-oauth.service';

export type WhatsAppEmbeddedCompleteInput = {
  code: string;
  phoneNumberId?: string;
  wabaId?: string;
  displayPhoneNumber?: string;
  /** Page origin where FB.login ran, e.g. https://bee3ly.net */
  frontendOrigin?: string;
};

@Injectable()
export class WhatsappEmbeddedService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappEmbeddedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly access: BusinessAccessService,
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphClient,
    private readonly metaOauth: MetaOauthService,
  ) {}

  onModuleInit() {
    const cfg = this.getClientConfig();
    if (cfg.configured) {
      this.logger.log('WhatsApp Embedded Signup is configured for merchants');
    } else {
      this.logger.warn(
        'WhatsApp Embedded Signup disabled — set META_APP_ID and META_WHATSAPP_EMBEDDED_CONFIG_ID',
      );
    }
  }

  getClientConfig() {
    const appId = this.config.get<string>('META_APP_ID')?.trim();
    const configId = this.config
      .get<string>('META_WHATSAPP_EMBEDDED_CONFIG_ID')
      ?.trim();
    return {
      configured: Boolean(appId && configId),
      appId: appId ?? null,
      configId: configId ?? null,
    };
  }

  async completeSignup(userId: string, input: WhatsAppEmbeddedCompleteInput) {
    const cfg = this.getClientConfig();
    if (!cfg.configured) {
      throw new ServiceUnavailableException(
        'WhatsApp Embedded Signup is not configured (META_APP_ID + META_WHATSAPP_EMBEDDED_CONFIG_ID)',
      );
    }
    if (!input.code?.trim()) {
      throw new BadRequestException('Missing OAuth code from Embedded Signup');
    }

    const businessId = await this.access.requireBusinessId(userId);
    let accessToken: string;
    try {
      const token = await this.graph.exchangeEmbeddedSignupCode(
        input.code.trim(),
        { frontendOrigin: input.frontendOrigin },
      );
      accessToken = token.access_token;
    } catch (e) {
      const detail =
        e instanceof Error &&
        e.message !== 'META_EMBEDDED_TOKEN_EXCHANGE_FAILED'
          ? e.message
          : 'Could not exchange WhatsApp signup code — complete Embedded Signup in the Meta popup, then retry';
      throw new BadRequestException(detail);
    }

    let phoneNumberId = input.phoneNumberId?.trim() || null;
    let wabaId = input.wabaId?.trim() || null;
    let displayName = input.displayPhoneNumber?.trim() || 'WhatsApp Business';

    if (!phoneNumberId || !wabaId) {
      const discovered =
        await this.graph.discoverWhatsAppPhoneNumbers(accessToken);
      const pick =
        (phoneNumberId
          ? discovered.find((p) => p.phoneNumberId === phoneNumberId)
          : null) ?? discovered[0];
      if (!pick) {
        throw new BadRequestException(
          'No WhatsApp phone number found on this Meta Business — finish adding your number in the signup dialog',
        );
      }
      phoneNumberId = pick.phoneNumberId;
      wabaId = pick.wabaId;
      displayName = pick.displayName;
    }

    const subscribed = await this.graph.subscribeWhatsAppWaba(
      wabaId,
      accessToken,
    );
    if (!subscribed.success) {
      this.logger.warn(
        `WABA webhook subscribe failed waba=${wabaId}: ${subscribed.error ?? ''}`,
      );
    }

    const account = await this.prisma.socialAccount.upsert({
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
        displayName,
        accessTokenEnc: this.metaOauth.encrypt(accessToken),
        status: SocialConnectionStatus.CONNECTED,
        parentExternalId: wabaId,
        webhookSubscribedAt: subscribed.success ? new Date() : null,
        capabilities: ['messages', 'send'],
        metadata: {
          mode: 'embedded_signup',
          wabaId,
          phoneNumberId,
        },
      },
      update: {
        externalId: phoneNumberId,
        displayName,
        accessTokenEnc: this.metaOauth.encrypt(accessToken),
        status: SocialConnectionStatus.CONNECTED,
        parentExternalId: wabaId,
        webhookSubscribedAt: subscribed.success ? new Date() : null,
        capabilities: ['messages', 'send'],
        metadata: {
          mode: 'embedded_signup',
          wabaId,
          phoneNumberId,
        },
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

    this.logger.log(
      `WhatsApp Embedded Signup complete business=${businessId} phoneNumberId=${phoneNumberId}`,
    );

    return { account };
  }
}
