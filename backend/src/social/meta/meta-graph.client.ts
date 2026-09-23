import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
  connected_instagram_account?: { id: string };
};

function resolveIgAccountId(page: {
  instagram_business_account?: { id: string } | null;
  connected_instagram_account?: { id: string } | null;
}): string | null {
  return (
    page.instagram_business_account?.id ||
    page.connected_instagram_account?.id ||
    null
  );
}

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
    const fields =
      'id,name,access_token,instagram_business_account,connected_instagram_account';
    const url = `${this.base()}/me/accounts?fields=${fields}&limit=100&access_token=${encodeURIComponent(userAccessToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`List pages failed: ${text.slice(0, 300)}`);
      throw new Error('META_LIST_PAGES_FAILED');
    }
    const json = (await res.json()) as { data?: MetaPage[]; paging?: unknown };
    let pages = (json.data ?? []).filter((p) => p.id && p.access_token);

    if (pages.length === 0) {
      this.logger.warn(
        'me/accounts empty — trying Business Manager owned_pages fallback',
      );
      pages = await this.listPagesViaBusinesses(userAccessToken);
    }

    pages = pages.map((p) => this.normalizePageIg(p));

    this.logger.log(
      `List pages ok: count=${pages.length} withIg=${pages.filter((p) => p.instagram_business_account?.id).length}`,
    );
    return pages;
  }

  /** Re-read IG linkage with a Page token (needs instagram_basic on the user grant). */
  async getPageInstagramAccount(
    pageId: string,
    pageAccessToken: string,
  ): Promise<{ id: string } | null> {
    const url = `${this.base()}/${pageId}?fields=instagram_business_account,connected_instagram_account&access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warn(
        `IG lookup failed for page ${pageId}: ${(await res.text()).slice(0, 200)}`,
      );
      return null;
    }
    const json = (await res.json()) as {
      instagram_business_account?: { id: string };
      connected_instagram_account?: { id: string };
    };
    const id = resolveIgAccountId(json);
    this.logger.log(
      `IG lookup page=${pageId} ig=${id ?? 'none'} biz=${json.instagram_business_account?.id ?? '-'} connected=${json.connected_instagram_account?.id ?? '-'}`,
    );
    return id ? { id } : null;
  }

  private normalizePageIg(page: MetaPage): MetaPage {
    const igId = resolveIgAccountId(page);
    return {
      ...page,
      instagram_business_account: igId
        ? { id: igId }
        : page.instagram_business_account,
    };
  }

  /**
   * Pages linked to a Meta Business often omit from /me/accounts unless
   * business_management is granted. Fallback: businesses → owned_pages → page token.
   */
  private async listPagesViaBusinesses(
    userAccessToken: string,
  ): Promise<MetaPage[]> {
    const bizUrl = `${this.base()}/me/businesses?fields=id,name&access_token=${encodeURIComponent(userAccessToken)}`;
    const bizRes = await fetch(bizUrl);
    const bizText = await bizRes.text();
    if (!bizRes.ok) {
      this.logger.warn(`List businesses failed: ${bizText.slice(0, 300)}`);
      return [];
    }

    let businesses: Array<{ id: string; name?: string }> = [];
    try {
      businesses =
        (
          JSON.parse(bizText) as {
            data?: Array<{ id: string; name?: string }>;
          }
        ).data ?? [];
    } catch {
      return [];
    }

    this.logger.log(
      `Businesses found: ${businesses.map((b) => `${b.name ?? '?'}(${b.id})`).join(', ') || 'none'}`,
    );

    const byId = new Map<string, MetaPage>();
    for (const biz of businesses) {
      const ownedUrl = `${this.base()}/${biz.id}/owned_pages?fields=id,name&limit=100&access_token=${encodeURIComponent(userAccessToken)}`;
      const ownedRes = await fetch(ownedUrl);
      if (!ownedRes.ok) {
        this.logger.warn(
          `owned_pages failed for business ${biz.id}: ${(await ownedRes.text()).slice(0, 200)}`,
        );
        continue;
      }
      const ownedJson = (await ownedRes.json()) as {
        data?: Array<{ id: string; name?: string }>;
      };
      for (const row of ownedJson.data ?? []) {
        if (!row.id || byId.has(row.id)) continue;
        const page = await this.fetchPageWithToken(row.id, userAccessToken);
        if (page) byId.set(page.id, page);
      }
    }

    return [...byId.values()];
  }

  private async fetchPageWithToken(
    pageId: string,
    userAccessToken: string,
  ): Promise<MetaPage | null> {
    const url = `${this.base()}/${pageId}?fields=id,name,access_token,instagram_business_account,connected_instagram_account&access_token=${encodeURIComponent(userAccessToken)}`;
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warn(
        `Page token fetch failed for ${pageId}: ${(await res.text()).slice(0, 200)}`,
      );
      return null;
    }
    const page = (await res.json()) as MetaPage & { error?: unknown };
    if (!page.id || !page.access_token) return null;
    return this.normalizePageIg({
      id: page.id,
      name: page.name,
      access_token: page.access_token,
      instagram_business_account: page.instagram_business_account,
      connected_instagram_account: page.connected_instagram_account,
    });
  }

  /** Safe diagnostics for empty /me/accounts (no tokens logged). */
  async diagnoseUserAccess(userAccessToken: string) {
    const meUrl = `${this.base()}/me?fields=id,name&access_token=${encodeURIComponent(userAccessToken)}`;
    const permUrl = `${this.base()}/me/permissions?access_token=${encodeURIComponent(userAccessToken)}`;

    const [meRes, permRes] = await Promise.all([fetch(meUrl), fetch(permUrl)]);
    const meText = await meRes.text();
    const permText = await permRes.text();

    let me: { id?: string; name?: string; error?: unknown } = {};
    let permissions: Array<{ permission: string; status: string }> = [];
    try {
      me = JSON.parse(meText) as typeof me;
    } catch {
      me = { error: meText.slice(0, 200) };
    }
    try {
      const parsed = JSON.parse(permText) as {
        data?: Array<{ permission: string; status: string }>;
        error?: unknown;
      };
      permissions = parsed.data ?? [];
      if (parsed.error) me = { ...me, error: parsed.error };
    } catch {
      /* keep empty */
    }

    return {
      meOk: meRes.ok,
      meId: me.id ?? null,
      meName: me.name ?? null,
      permissions: permissions.map((p) => `${p.permission}:${p.status}`),
      grantedPageScopes: permissions
        .filter(
          (p) =>
            p.status === 'granted' &&
            (p.permission.startsWith('pages_') ||
              p.permission === 'business_management' ||
              p.permission.includes('instagram')),
        )
        .map((p) => p.permission),
      rawMeError: meRes.ok ? null : meText.slice(0, 300),
      rawPermError: permRes.ok ? null : permText.slice(0, 300),
    };
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
          'messaging_handovers',
          'standby',
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
      'messaging_handovers',
      'standby',
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
    url.searchParams.set('fields', 'name,username');
    url.searchParams.set('access_token', pageAccessToken);
    const res = await fetch(url);
    if (res.ok) {
      const json = (await res.json()) as {
        name?: string;
        username?: string;
      };
      const full = json.name?.trim() || json.username?.trim();
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
    platform: 'messenger' | 'instagram' = 'messenger',
  ) {
    const url = new URL(`${this.base()}/${pageId}/conversations`);
    url.searchParams.set('fields', 'participants');
    url.searchParams.set('user_id', senderId);
    url.searchParams.set('platform', platform);
    url.searchParams.set('access_token', pageAccessToken);
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(
        `Conversations name lookup failed (${platform}): ${text.slice(0, 300)}`,
      );
      return null;
    }
    const json = (await res.json()) as {
      data?: Array<{
        participants?: {
          data?: Array<{ id?: string; name?: string; username?: string }>;
        };
      }>;
    };
    for (const thread of json.data ?? []) {
      for (const p of thread.participants?.data ?? []) {
        if (p.id !== senderId) continue;
        const label = p.name?.trim() || p.username?.trim();
        if (label) return label;
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

  /** Claim the thread when the Page Inbox currently owns it (standby). */
  async takeThreadControl(
    pageId: string,
    pageAccessToken: string,
    recipientId: string,
  ) {
    const url = `${this.base()}/${pageId}/take_thread_control?access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId } }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(
        `take_thread_control page=${pageId} recipient=${recipientId}: ${text.slice(0, 240)}`,
      );
      return { ok: false as const };
    }
    this.logger.log(
      `take_thread_control ok page=${pageId} recipient=${recipientId}`,
    );
    return { ok: true as const };
  }

  /**
   * Messenger Private Reply to a Page comment (opens/continues Inbox thread).
   * One private reply per comment within Meta's window.
   */
  async sendPrivateReplyToComment(
    pageAccessToken: string,
    commentId: string,
    text: string,
  ) {
    const url = `${this.base()}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text },
      }),
    });
    if (!res.ok) {
      const textBody = await res.text();
      this.logger.warn(
        `Private reply failed commentId=${commentId}: ${textBody.slice(0, 300)}`,
      );
      return { sent: false as const, error: textBody };
    }
    const json = (await res.json()) as { message_id?: string };
    return { sent: true as const, messageId: json.message_id ?? null };
  }

  /**
   * Recent Page posts + nested comments (Dev-mode polling fallback when
   * feed webhooks are not delivered).
   */
  async listRecentPageComments(
    pageId: string,
    pageAccessToken: string,
    opts?: { postLimit?: number; commentLimit?: number },
  ) {
    const postLimit = opts?.postLimit ?? 5;
    const commentLimit = opts?.commentLimit ?? 25;
    const url = new URL(`${this.base()}/${pageId}/feed`);
    url.searchParams.set(
      'fields',
      `id,created_time,comments.limit(${commentLimit}){id,message,from,created_time}`,
    );
    url.searchParams.set('limit', String(postLimit));
    url.searchParams.set('access_token', pageAccessToken);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(
        `List page comments failed pageId=${pageId}: ${text.slice(0, 300)}`,
      );
      return {
        ok: false as const,
        error: text,
        comments: [] as Array<{
          commentId: string;
          postId: string;
          pageId: string;
          fromUserId: string;
          fromName: string | null;
          message: string;
          commentedAt: Date;
          raw: unknown;
        }>,
      };
    }

    const json = (await res.json()) as {
      data?: Array<{
        id?: string;
        comments?: {
          data?: Array<{
            id?: string;
            message?: string;
            created_time?: string;
            from?: { id?: string; name?: string };
          }>;
        };
      }>;
    };

    const comments: Array<{
      commentId: string;
      postId: string;
      pageId: string;
      fromUserId: string;
      fromName: string | null;
      message: string;
      commentedAt: Date;
      raw: unknown;
    }> = [];

    for (const post of json.data ?? []) {
      const postId = typeof post.id === 'string' ? post.id : '';
      if (!postId) continue;
      for (const c of post.comments?.data ?? []) {
        const commentId = typeof c.id === 'string' ? c.id : '';
        const fromUserId = c.from?.id;
        if (!commentId || !fromUserId) continue;
        if (fromUserId === pageId) continue;
        comments.push({
          commentId,
          postId,
          pageId,
          fromUserId,
          fromName: c.from?.name?.trim() || null,
          message: typeof c.message === 'string' ? c.message : '',
          commentedAt: c.created_time
            ? new Date(c.created_time)
            : new Date(),
          raw: c,
        });
      }
    }

    return { ok: true as const, comments };
  }

  /** Public reply under a Page comment (requires pages_manage_engagement). */
  async replyToComment(
    commentId: string,
    pageAccessToken: string,
    message: string,
  ) {
    const url = new URL(`${this.base()}/${commentId}/comments`);
    url.searchParams.set('message', message);
    url.searchParams.set('access_token', pageAccessToken);
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(
        `Reply to comment failed commentId=${commentId}: ${text.slice(0, 300)}`,
      );
      return { ok: false as const, error: text };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true as const, replyId: json.id ?? null };
  }
}
