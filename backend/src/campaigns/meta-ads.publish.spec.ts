jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
  Logger: class {
    warn() {}
  },
}));
jest.mock('../social/meta/meta-oauth.service', () => ({
  MetaOauthService: class MetaOauthService {},
}));
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { CampaignStatus } from '@prisma/client';
import { MetaAdsService } from './meta-ads.service';

describe('MetaAdsService publish idempotency', () => {
  function setup(existingIds: Partial<{
    metaCampaignId: string;
    metaAdsetId: string;
    metaAdId: string;
    metaCreativeId: string;
  }> = {}) {
    const posts: string[] = [];
    const campaign: Record<string, unknown> = {
      id: 'camp-1',
      businessId: 'biz-1',
      name: 'Retarget',
      objective: 'MORE_MESSAGES',
      status: CampaignStatus.DRAFT,
      offer: 'Hello',
      audiences: [],
      budget: 100,
      currency: 'EGP',
      suggestedMessaging: 'Come chat',
      channel: 'FACEBOOK',
      startDate: null,
      endDate: null,
      metaCampaignId: null,
      metaAdsetId: null,
      metaAdId: null,
      metaCreativeId: null,
      metaAudienceIds: [],
      publishStep: null,
      metaError: null,
      metaErrorUserMsg: null,
      audienceNote: null,
      ...existingIds,
    };
    const prisma = {
      business: {
        findUniqueOrThrow: async () => ({
          id: 'biz-1',
          metaAdAccountId: 'act_99',
          metaAdAccountCurrency: 'EGP',
          metaAdsTokenEnc: 'enc',
        }),
        update: async () => ({}),
      },
      campaign: {
        findFirstOrThrow: async () => campaign,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(campaign, data);
          return campaign;
        },
      },
      socialAccount: {
        findFirst: async () => ({ externalId: 'page-1' }),
      },
      order: { findMany: async () => [] },
      customer: { findMany: async () => [] },
    };
    const graph = {
      post: async (path: string) => {
        posts.push(path);
        return { id: `id-${posts.length}` };
      },
      get: async () => ({}),
    };
    const service = new MetaAdsService(
      prisma as never,
      { get: (key: string) => (key === 'META_ADS_PUBLISH_ENABLED' ? 'true' : undefined) } as never,
      { decrypt: () => 'token' } as never,
      graph as never,
    );
    return { service, posts, campaign };
  }

  it('creates campaign, ad set, creative, and ad paused, then reuses saved ids', async () => {
    const first = setup();
    const created = await first.service.publish('biz-1', 'camp-1');
    expect(created?.status).toBe(CampaignStatus.PAUSED_ON_META);
    expect(first.posts).toEqual([
      'act_99/campaigns',
      'act_99/adsets',
      'act_99/adcreatives',
      'act_99/ads',
    ]);
    expect(first.campaign.metaCampaignId).toBe('id-1');
    expect(first.campaign.metaAdId).toBe('id-4');

    const retry = setup({
      metaCampaignId: 'id-1',
      metaAdsetId: 'id-2',
      metaCreativeId: 'id-3',
      metaAdId: 'id-4',
    });
    await retry.service.publish('biz-1', 'camp-1');
    expect(retry.posts).toEqual([]);
    expect(retry.campaign.status).toBe(CampaignStatus.PAUSED_ON_META);
  });

  it('keeps the campaign id when a later step fails', async () => {
    const { service, posts, campaign } = setup();
    const original = service['graph'].post.bind(service['graph']);
    service['graph'].post = async (path: string) => {
      if (path.endsWith('/adsets')) {
        posts.push(path);
        throw new Error(
          '{"error":{"message":"budget","error_user_msg":"Budget too low"}}',
        );
      }
      return original(path, 'token', {});
    };
    const failed = await service.publish('biz-1', 'camp-1');
    expect(failed?.status).toBe(CampaignStatus.FAILED);
    expect(campaign.metaCampaignId).toBeTruthy();
    expect(campaign.metaAdsetId).toBeNull();
    expect(posts).toEqual(['act_99/campaigns', 'act_99/adsets']);
  });

  it('returns null when the publish flag is off', async () => {
    const { service } = setup();
    (
      service as unknown as { config: { get: () => string } }
    ).config = { get: () => 'false' };
    await expect(service.publish('biz-1', 'camp-1')).resolves.toBeNull();
  });
});
