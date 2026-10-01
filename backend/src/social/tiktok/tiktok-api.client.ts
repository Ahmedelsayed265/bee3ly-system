import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TT_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

type TikTokApiResponse<T = unknown> = {
  code?: number;
  message?: string;
  request_id?: string;
  data?: T;
};

export type TikTokTokenResponse = {
  access_token: string;
  open_id?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  display_name?: string;
  username?: string;
};

@Injectable()
export class TikTokApiClient {
  private readonly logger = new Logger(TikTokApiClient.name);

  constructor(private readonly config: ConfigService) {}

  get clientKey() {
    return this.config.get<string>('TIKTOK_CLIENT_KEY')?.trim() ?? '';
  }

  get clientSecret() {
    return this.config.get<string>('TIKTOK_CLIENT_SECRET')?.trim() ?? '';
  }

  isConfigured() {
    return Boolean(this.clientKey && this.clientSecret);
  }

  async exchangeAuthCode(authCode: string): Promise<TikTokTokenResponse> {
    const body = {
      app_id: this.clientKey,
      secret: this.clientSecret,
      auth_code: authCode,
    };
    const data = await this.postJson<TikTokTokenResponse>(
      '/oauth2/access_token/',
      body,
    );
    if (!data.access_token) {
      throw new Error('TikTok token response missing access_token');
    }
    return data;
  }

  async exchangeLoginKitCode(
    code: string,
    redirectUri: string,
  ): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: params.toString(),
    });
    const json = (await res.json()) as {
      error?: string;
      error_description?: string;
      data?: TikTokTokenResponse;
    };
    if (!res.ok || json.error) {
      throw new Error(
        json.error_description ?? json.error ?? `HTTP ${res.status}`,
      );
    }
    const token = json.data;
    if (!token?.access_token) {
      throw new Error('TikTok Login Kit token response missing access_token');
    }
    return token;
  }

  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: params.toString(),
    });
    const json = (await res.json()) as {
      error?: string;
      error_description?: string;
      data?: TikTokTokenResponse;
    };
    if (!res.ok || json.error) {
      throw new Error(
        json.error_description ?? json.error ?? `HTTP ${res.status}`,
      );
    }
    const token = json.data;
    if (!token?.access_token) {
      throw new Error('TikTok refresh response missing access_token');
    }
    return token;
  }

  async subscribeDirectMessageWebhook(callbackUrl: string) {
    if (!this.isConfigured()) return;
    await this.postJson('/business/webhook/update/', {
      app_id: this.clientKey,
      secret: this.clientSecret,
      event_type: 'DIRECT_MESSAGE',
      callback_url: callbackUrl,
    });
    this.logger.log(`TikTok DIRECT_MESSAGE webhook subscribed → ${callbackUrl}`);
  }

  async sendTextMessage(input: {
    accessToken: string;
    businessId: string;
    conversationId: string;
    text: string;
  }) {
    await this.postJson(
      '/business/message/send/',
      {
        business_id: input.businessId,
        recipient_type: 'CONVERSATION',
        recipient: input.conversationId,
        message_type: 'TEXT',
        text: { body: input.text },
      },
      input.accessToken,
    );
    return { sent: true as const };
  }

  private async postJson<T>(
    path: string,
    body: Record<string, unknown>,
    accessToken?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Access-Token'] = accessToken;
    }
    const res = await fetch(`${TT_API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as TikTokApiResponse<T>;
    if (!res.ok || (json.code !== undefined && json.code !== 0)) {
      throw new Error(
        `TikTok API ${path}: ${json.message ?? res.statusText} (code=${json.code ?? res.status}, request_id=${json.request_id ?? '-'})`,
      );
    }
    return (json.data ?? {}) as T;
  }
}
