import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);
  private readonly version = 'v21.0';

  constructor(private readonly config: ConfigService) {}

  private base() {
    return `https://graph.facebook.com/${this.version}`;
  }

  async exchangeCode(code: string) {
    const appId = this.config.get<string>('META_APP_ID');
    const appSecret = this.config.get<string>('META_APP_SECRET');
    const redirect = this.config.get<string>(
      'META_REDIRECT_URI',
      'http://localhost:3000/social/meta/callback',
    );
    if (!appId || !appSecret) {
      throw new Error('META_APP_ID / META_APP_SECRET not configured');
    }
    const url = new URL(`${this.base()}/oauth/access_token`);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('redirect_uri', redirect);
    url.searchParams.set('code', code);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Token exchange failed: ${text.slice(0, 300)}`);
      throw new Error('META_TOKEN_EXCHANGE_FAILED');
    }
    return (await res.json()) as {
      access_token: string;
      expires_in?: number;
      token_type?: string;
    };
  }

  async listPages(userAccessToken: string): Promise<MetaPage[]> {
    const url = `${this.base()}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`List pages failed: ${text.slice(0, 300)}`);
      throw new Error('META_LIST_PAGES_FAILED');
    }
    const json = (await res.json()) as { data?: MetaPage[] };
    return json.data ?? [];
  }

  async subscribeApp(pageId: string, pageAccessToken: string) {
    const url = `${this.base()}/${pageId}/subscribed_apps`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: [
          'messages',
          'messaging_postbacks',
          'message_deliveries',
          'feed',
        ],
        access_token: pageAccessToken,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Subscribe apps failed: ${text.slice(0, 300)}`);
      return { success: false, error: text };
    }
    return { success: true };
  }

  /**
   * Re-register App-level Page webhook fields (callback + field list).
   * Includes `feed` for comment webhooks alongside messaging fields.
   */
  async ensureAppPageSubscriptions(callbackUrl: string, verifyToken: string) {
    const appId = this.config.get<string>('META_APP_ID');
    const appSecret = this.config.get<string>('META_APP_SECRET');
    if (!appId || !appSecret) {
      return { success: false as const, error: 'META_APP_ID/SECRET missing' };
    }
    const token = `${appId}|${appSecret}`;
    const fields = [
      'messages',
      'messaging_postbacks',
      'messaging_optins',
      'message_deliveries',
      'message_reads',
      'feed',
    ].join(',');
    const body = new URLSearchParams({
      object: 'page',
      callback_url: callbackUrl,
      verify_token: verifyToken,
      fields,
      include_values: 'true',
      access_token: token,
    });
    const res = await fetch(`${this.base()}/${appId}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(
        `App page subscriptions failed: ${text.slice(0, 300)}`,
      );
      return { success: false as const, error: text };
    }
    return { success: true as const };
  }

  async getUserProfile(pageAccessToken: string, userId: string) {
    const url = new URL(`${this.base()}/${userId}`);
    url.searchParams.set('fields', 'name,first_name,last_name');
    url.searchParams.set('access_token', pageAccessToken);
    const res = await fetch(url);
    if (res.ok) {
      const json = (await res.json()) as {
        name?: string;
        first_name?: string;
        last_name?: string;
      };
      const full =
        json.name?.trim() ||
        [json.first_name, json.last_name].filter(Boolean).join(' ').trim();
      if (full) return full;
    } else {
      const text = await res.text();
      this.logger.debug(`Get user profile failed: ${text.slice(0, 200)}`);
    }
    return null;
  }

  /** Fallback when User Profile API is blocked (common in Dev mode). */
  async getSenderNameFromConversations(
    pageId: string,
    pageAccessToken: string,
    senderId: string,
  ) {
    const url = new URL(`${this.base()}/${pageId}/conversations`);
    url.searchParams.set('fields', 'participants');
    url.searchParams.set('user_id', senderId);
    url.searchParams.set('platform', 'messenger');
    url.searchParams.set('access_token', pageAccessToken);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(
        `Conversations name lookup failed: ${text.slice(0, 300)}`,
      );
      return null;
    }
    const json = (await res.json()) as {
      data?: Array<{
        participants?: {
          data?: Array<{ id?: string; name?: string }>;
        };
      }>;
    };
    for (const thread of json.data ?? []) {
      for (const p of thread.participants?.data ?? []) {
        if (p.id === senderId && p.name?.trim()) {
          return p.name.trim();
        }
      }
    }
    return null;
  }

  async sendTextMessage(
    pageAccessToken: string,
    recipientId: string,
    text: string,
  ) {
    const url = `${this.base()}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    });
    if (!res.ok) {
      const textBody = await res.text();
      this.logger.warn(`Send message failed: ${textBody.slice(0, 300)}`);
      return { sent: false as const, error: textBody };
    }
    return { sent: true as const };
  }
}
