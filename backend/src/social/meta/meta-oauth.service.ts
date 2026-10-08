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
import { isBillingLimit } from '../../billing/billing.http';
import { EntitlementsService } from '../../billing/entitlements.service';
import { BusinessAccessService } from '../../common/business-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MetaGraphClient } from './meta-graph.client';

@Injectable()
export class MetaOauthService {
  private readonly logger = new Logger(MetaOauthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly entitlements: EntitlementsService,
    private readonly config: ConfigService,
    private readonly graph: MetaGraphClient,
  ) {}

  buildOAuthUrl(businessId: string, userId: string) {
    const appId = this.config.get<string>('META_APP_ID');
    const redirect = this.config.get<string>(
      'META_REDIRECT_URI',
      'http://localhost:5000/social/meta/callback',
    );
    if (!appId) return null;
    const state = Buffer.from(JSON.stringify({ businessId, userId })).toString(
      'base64url',
    );
    // Page / messaging scopes. Do NOT add instagram_basic until the Meta App has
    // Instagram Graph API (Facebook Login) product + that permission available;
    // otherwise Meta returns "Invalid Scopes: instagram_basic" for developers.
    // Optional extra IG scopes via META_OAUTH_EXTRA_SCOPES (comma-separated).
    const baseScopes = [
      'pages_show_list',
      'pages_messaging',
      'pages_manage_metadata',
      'pages_read_engagement',
      'pages_manage_engagement',
      'business_management',
      // Marketing API — Ready for testing on app roles until Advanced Access.
      'ads_management',
      'ads_read',
    ];
    const extra = (this.config.get<string>('META_OAUTH_EXTRA_SCOPES') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const waScopes =
      this.config.get<string>('META_OAUTH_INCLUDE_WHATSAPP') === 'true'
        ? ['whatsapp_business_management', 'whatsapp_business_messaging']
        : [];
    const scopes = [...new Set([...baseScopes, ...waScopes, ...extra])].join(
      ',',
    );
    const version =
      this.config.get<string>('META_GRAPH_VERSION')?.trim() || 'v21.0';
    return `https://www.facebook.com/${version}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}&scope=${scopes}&auth_type=rerequest`;
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
    this.logger.log(
      `Meta OAuth token exchanged for business=${businessId} user=${userId}`,
    );
    const pages = await this.graph.listPages(token.access_token);
    if (pages.length === 0) {
      try {
        const diag = await this.graph.diagnoseUserAccess(token.access_token);
        this.logger.warn(
          `No Facebook Pages for business=${businessId} user=${userId} me=${diag.meId ?? '?'} (${diag.meName ?? '?'}) granted=[${diag.grantedPageScopes.join(',') || 'none'}] all=[${diag.permissions.join(',') || 'none'}] meErr=${diag.rawMeError ?? '-'} permErr=${diag.rawPermError ?? '-'}`,
        );
      } catch (err) {
        this.logger.warn(
          `No Facebook Pages + diagnose failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      throw new BadRequestException(
        'No Facebook Pages found for this account. Grant business_management, select Hillix pharm in the Meta dialog, and ensure the Page is linked to a Business you admin.',
      );
    }

    this.logger.log(
      `Meta pending pages ready: ${pages.map((p) => `${p.name}(${p.id})${p.instagram_business_account?.id ? '+ig' : ''}`).join(', ')}`,
    );

    await this.entitlements.assertCanConnect(
      businessId,
      SocialPlatform.FACEBOOK,
    );

    let adAccounts: Array<{
      id: string;
      name: string;
      account_status?: number;
      currency?: string;
      timezone_name?: string;
    }> = [];
    try {
      adAccounts = await this.graph.listAdAccounts(token.access_token);
    } catch (error) {
      const text = error instanceof Error ? error.message : '';
      if (text.includes('"code":190') || text.includes('"code": 190')) {
        await this.prisma.business.update({
          where: { id: businessId },
          data: { metaAdsNeedsReconnect: true },
        });
      }
      this.logger.warn(
        `Ad account list failed business=${businessId}: ${text.slice(0, 180)}`,
      );
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
        adAccountsJson: adAccounts,
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
    const adAccounts = (
      (pending.adAccountsJson as Array<{
        id: string;
        name: string;
        currency?: string;
        timezone_name?: string;
        account_status?: number;
      }>) ?? []
    ).map((account) => ({
      id: account.id,
      name: account.name,
      currency: account.currency ?? null,
      timezone: account.timezone_name ?? null,
      accountStatus: account.account_status ?? null,
    }));
    return { pendingId: pending.id, pages, adAccounts };
  }

  async selectPage(
    userId: string,
    pendingId: string,
    pageId: string,
    adAccountId?: string,
  ) {
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

    let igAccount = page.instagram_business_account ?? null;
    if (!igAccount?.id) {
      igAccount = await this.graph.getPageInstagramAccount(
        page.id,
        page.access_token,
      );
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
        capabilities: ['messages', 'send', 'feed'],
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
        capabilities: ['messages', 'send', 'feed'],
        metadata: {
          pageId: page.id,
          webhookSubscribed: subscribe.success,
        },
      },
    });

    let ig = null;
    if (igAccount?.id) {
      await this.entitlements.assertCanConnect(
        businessId,
        SocialPlatform.INSTAGRAM,
      );
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
          externalId: igAccount.id,
          displayName: `${page.name} · Instagram`,
          accessTokenEnc: this.encrypt(page.access_token),
          status: SocialConnectionStatus.CONNECTED,
          parentExternalId: page.id,
          webhookSubscribedAt: subscribe.success ? new Date() : null,
          capabilities: ['messages', 'send'],
          metadata: {
            pageId: page.id,
            igBusinessId: igAccount.id,
          },
        },
        update: {
          externalId: igAccount.id,
          displayName: `${page.name} · Instagram`,
          accessTokenEnc: this.encrypt(page.access_token),
          status: SocialConnectionStatus.CONNECTED,
          parentExternalId: page.id,
          webhookSubscribedAt: subscribe.success ? new Date() : null,
          capabilities: ['messages', 'send'],
          metadata: {
            pageId: page.id,
            igBusinessId: igAccount.id,
          },
        },
      });
    }

    let wa = null;
    try {
      const userToken = this.decrypt(pending.userAccessTokenEnc);
      const phones = await this.graph.discoverWhatsAppPhoneNumbers(userToken);
      if (phones.length > 0) {
        const pick = phones[0];
        await this.entitlements.assertCanConnect(
          businessId,
          SocialPlatform.WHATSAPP,
        );
        const waRow = await this.prisma.socialAccount.upsert({
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
            externalId: pick.phoneNumberId,
            displayName: pick.displayName,
            accessTokenEnc: this.encrypt(userToken),
            status: SocialConnectionStatus.CONNECTED,
            parentExternalId: pick.wabaId,
            capabilities: ['messages', 'send'],
            metadata: {
              wabaId: pick.wabaId,
              metaBusinessId: pick.businessId,
              phoneNumberId: pick.phoneNumberId,
            },
          },
          update: {
            externalId: pick.phoneNumberId,
            displayName: pick.displayName,
            accessTokenEnc: this.encrypt(userToken),
            status: SocialConnectionStatus.CONNECTED,
            parentExternalId: pick.wabaId,
            capabilities: ['messages', 'send'],
            metadata: {
              wabaId: pick.wabaId,
              metaBusinessId: pick.businessId,
              phoneNumberId: pick.phoneNumberId,
            },
          },
        });
        wa = {
          id: waRow.id,
          displayName: waRow.displayName,
          status: waRow.status,
        };
        this.logger.log(
          `WhatsApp linked phoneNumberId=${pick.phoneNumberId} business=${businessId}`,
        );
      }
    } catch (err) {
      if (isBillingLimit(err)) throw err;
      this.logger.warn(
        `WhatsApp discovery after page select failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const accounts =
      (pending.adAccountsJson as Array<{
        id: string;
        name?: string;
        currency?: string;
        timezone_name?: string;
      }>) ?? [];
    const chosen = adAccountId
      ? accounts.find((account) => account.id === adAccountId)
      : undefined;
    if (adAccountId && !chosen) {
      throw new BadRequestException('Ad account not found in pending session');
    }
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        metaAdsTokenEnc: pending.userAccessTokenEnc,
        metaAdsNeedsReconnect: false,
        ...(chosen
          ? {
              metaAdAccountId: chosen.id,
              metaAdAccountName: chosen.name ?? chosen.id,
              metaAdAccountCurrency: chosen.currency ?? null,
              metaAdAccountTimezone: chosen.timezone_name ?? null,
            }
          : {}),
      },
    });

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
      whatsapp: wa,
      notice: ig
        ? wa
          ? 'Facebook, Instagram & WhatsApp connected'
          : 'Facebook & Instagram connected'
        : wa
          ? 'Facebook Page & WhatsApp connected'
          : 'Facebook Page connected (no Instagram on this Page). In Meta App add Instagram Graph API with Facebook Login, then set META_OAUTH_EXTRA_SCOPES=instagram_basic and reconnect.',
    };
  }

  async listAdAccounts(userId: string) {
    const businessId = await this.access.requireBusinessId(userId);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        metaAdsTokenEnc: true,
        metaAdAccountId: true,
        metaAdsNeedsReconnect: true,
      },
    });
    if (!business?.metaAdsTokenEnc) {
      return {
        accounts: [],
        selectedId: business?.metaAdAccountId ?? null,
        needsReconnect: true,
      };
    }
    try {
      const token = this.decrypt(business.metaAdsTokenEnc);
      const accounts = await this.graph.listAdAccounts(token);
      return {
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          currency: account.currency ?? null,
          timezone: account.timezone_name ?? null,
        })),
        selectedId: business.metaAdAccountId,
        needsReconnect: false,
      };
    } catch (error) {
      const text = error instanceof Error ? error.message : '';
      if (text.includes('"code":190') || text.includes('"code": 190')) {
        await this.prisma.business.update({
          where: { id: businessId },
          data: { metaAdsNeedsReconnect: true },
        });
      }
      return {
        accounts: [],
        selectedId: business.metaAdAccountId,
        needsReconnect: true,
      };
    }
  }

  async selectAdAccount(userId: string, adAccountId: string) {
    const listed = await this.listAdAccounts(userId);
    const chosen = listed.accounts.find(
      (account) => account.id === adAccountId,
    );
    if (!chosen) {
      throw new BadRequestException(
        'Ad account is not available for this login',
      );
    }
    const businessId = await this.access.requireBusinessId(userId);
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        metaAdAccountId: chosen.id,
        metaAdAccountName: chosen.name,
        metaAdAccountCurrency: chosen.currency,
        metaAdAccountTimezone: chosen.timezone,
        metaAdsNeedsReconnect: false,
      },
    });
    return {
      selectedId: chosen.id,
      name: chosen.name,
      currency: chosen.currency,
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
