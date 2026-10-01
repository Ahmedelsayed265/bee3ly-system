import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaOauthService } from '../meta/meta-oauth.service';
import { TikTokApiClient } from './tiktok-api.client';

@Injectable()
export class TikTokOauthService implements OnModuleInit {
  private readonly logger = new Logger(TikTokOauthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly api: TikTokApiClient,
    private readonly tokenCrypto: MetaOauthService,
  ) {}

  async onModuleInit() {
    const callback = this.webhookCallbackUrl();
    if (!callback || !this.api.isConfigured()) return;
    try {
      await this.api.subscribeDirectMessageWebhook(callback);
    } catch (err) {
      this.logger.warn(
        `TikTok webhook subscription skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  isConfigured() {
    return this.api.isConfigured();
  }

  buildOAuthUrl(businessId: string, userId: string) {
    const clientKey = this.api.clientKey;
    const redirect = this.redirectUri();
    if (!clientKey) return null;

    const state = Buffer.from(JSON.stringify({ businessId, userId })).toString(
      'base64url',
    );
    const scopes =
      this.config.get<string>('TIKTOK_OAUTH_SCOPES')?.trim() ||
      'user.info.basic,user.info.profile';
    const authorizeBase =
      this.config.get<string>('TIKTOK_OAUTH_AUTHORIZE_URL')?.trim() ||
      'https://www.tiktok.com/v2/auth/authorize/';

    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      scope: scopes,
      redirect_uri: redirect,
      state,
    });
    return `${authorizeBase}?${params.toString()}`;
  }

  async handleCallback(query: {
    code?: string;
    auth_code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }) {
    const frontend = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    if (query.error) {
      this.logger.warn(
        `TikTok OAuth error=${query.error} ${query.error_description ?? ''}`,
      );
      return { redirectTo: `${frontend}/settings?tiktok=error` };
    }

    const authCode = query.auth_code ?? query.code;
    if (!authCode || !query.state) {
      throw new BadRequestException('Missing TikTok OAuth code/state');
    }

    let businessId: string;
    let userId: string;
    try {
      const parsed = JSON.parse(
        Buffer.from(query.state, 'base64url').toString('utf8'),
      ) as { businessId?: string; userId?: string };
      if (!parsed.businessId || !parsed.userId) throw new Error('bad state');
      businessId = parsed.businessId;
      userId = parsed.userId;
    } catch {
      throw new BadRequestException('Invalid OAuth state');
    }

    const token = query.auth_code
      ? await this.api.exchangeAuthCode(authCode)
      : await this.api.exchangeLoginKitCode(authCode, this.redirectUri());

    const openId = token.open_id?.trim();
    if (!openId) {
      throw new BadRequestException(
        'TikTok did not return open_id — ensure Business Messaging scopes are granted',
      );
    }

    const displayName =
      token.display_name?.trim() || token.username?.trim() || 'TikTok Business';

    const expiresAt =
      token.expires_in && token.expires_in > 0
        ? new Date(Date.now() + token.expires_in * 1000)
        : null;

    await this.prisma.socialAccount.upsert({
      where: {
        businessId_platform: {
          businessId,
          platform: SocialPlatform.TIKTOK,
        },
      },
      create: {
        businessId,
        provider: 'TIKTOK',
        platform: SocialPlatform.TIKTOK,
        externalId: openId,
        displayName,
        accessTokenEnc: this.tokenCrypto.encrypt(token.access_token),
        refreshTokenEnc: token.refresh_token
          ? this.tokenCrypto.encrypt(token.refresh_token)
          : null,
        tokenExpiresAt: expiresAt,
        status: SocialConnectionStatus.CONNECTED,
        capabilities: ['messages', 'send'],
        metadata: { oauthUserId: userId, scope: token.scope ?? null },
        webhookSubscribedAt: new Date(),
      },
      update: {
        provider: 'TIKTOK',
        externalId: openId,
        displayName,
        accessTokenEnc: this.tokenCrypto.encrypt(token.access_token),
        refreshTokenEnc: token.refresh_token
          ? this.tokenCrypto.encrypt(token.refresh_token)
          : null,
        tokenExpiresAt: expiresAt,
        status: SocialConnectionStatus.CONNECTED,
        capabilities: ['messages', 'send'],
        metadata: { oauthUserId: userId, scope: token.scope ?? null },
        webhookSubscribedAt: new Date(),
      },
    });

    this.logger.log(
      `TikTok connected business=${businessId} open_id=${openId}`,
    );

    return { redirectTo: `${frontend}/settings?tiktok=connected` };
  }

  encrypt(value: string) {
    return this.tokenCrypto.encrypt(value);
  }

  decryptAccessToken(accessTokenEnc: string) {
    return this.tokenCrypto.decrypt(accessTokenEnc);
  }

  decryptRefreshToken(refreshTokenEnc: string) {
    return this.tokenCrypto.decrypt(refreshTokenEnc);
  }

  private redirectUri() {
    return this.config.get<string>(
      'TIKTOK_REDIRECT_URI',
      'http://localhost:5000/social/tiktok/callback',
    );
  }

  private webhookCallbackUrl() {
    const explicit = this.config.get<string>('TIKTOK_WEBHOOK_URL')?.trim();
    if (explicit) return explicit;
    try {
      const redirect = this.redirectUri();
      const url = new URL(redirect);
      url.pathname = '/social/tiktok/webhook';
      url.search = '';
      return url.toString();
    } catch {
      return null;
    }
  }
}
