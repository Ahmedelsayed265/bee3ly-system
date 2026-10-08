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
  function setup(
    existingIds: Partial<{
      metaCampaignId: string;
      metaAdsetId: string;
      metaAdId: string;
      metaCreativeId: string;
    }> = {},
  ) {
    const posts: string[] = [];
    const bodies: Array<Record<string, unknown>> = [];
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
        findUniqueOrThrow: () => ({
          id: 'biz-1',
          metaAdAccountId: 'act_99',
          metaAdAccountCurrency: 'EGP',
          metaAdsTokenEnc: 'enc',
        }),
        update: () => ({}),
      },
      campaign: {
        findFirstOrThrow: () => campaign,
        update: ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(campaign, data);
          return campaign;
        },
      },
      socialAccount: {
        findFirst: () => ({ externalId: 'page-1' }),
      },
      order: { findMany: () => [] },
      customer: { findMany: () => [] },
    };
    const graph = {
      post: (path: string, _token: string, body: Record<string, unknown>) => {
        posts.push(path);
        bodies.push(body ?? {});
        return { id: `id-${posts.length}` };
      },
      get: () => ({}),
    };
    const service = new MetaAdsService(
      prisma as never,
      {
        get: (key: string) =>
          key === 'META_ADS_PUBLISH_ENABLED' ? 'true' : undefined,
      } as never,
      { decrypt: () => 'token' } as never,
      graph as never,
    );
    return { service, posts, bodies, campaign };
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
    expect(first.bodies[0].is_adset_budget_sharing_enabled).toBe(false);
    expect(first.bodies[1].is_adset_budget_sharing_enabled).toBe(false);
    expect(first.bodies[1].bid_strategy).toBe('LOWEST_COST_WITHOUT_CAP');
    expect(first.bodies[1].targeting).toMatchObject({
      targeting_automation: { advantage_audience: 0 },
    });
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
    service['graph'].post = (path: string) => {
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

  it('creates a paused ad when custom audience terms are not accepted', async () => {
    const { service, posts, campaign } = setup();
    campaign.audiences = ['CUSTOMERS'];
    service['prisma'].order.findMany = () => [
      { customer: { phone: '01000000000' } },
    ];
    const original = service['graph'].post.bind(service['graph']);
    service['graph'].post = (path: string) => {
      if (String(path).includes('customaudiences')) {
        posts.push(path);
        throw new Error(
          '{"error":{"message":"Custom Audience terms not accepted"}}',
        );
      }
      return original(path, 'token', {});
    };

    const created = await service.publish('biz-1', 'camp-1');

    expect(created?.status).toBe(CampaignStatus.PAUSED_ON_META);
    expect(campaign.metaAudienceIds).toEqual([]);
    expect(String(campaign.audienceNote)).toContain('Custom Audience terms');
    expect(posts).toEqual([
      'act_99/customaudiences',
      'act_99/campaigns',
      'act_99/adsets',
      'act_99/adcreatives',
      'act_99/ads',
    ]);
  });

  it('returns null when the publish flag is off', async () => {
    const { service } = setup();
    (service as unknown as { config: { get: () => string } }).config = {
      get: () => 'false',
    };
    await expect(service.publish('biz-1', 'camp-1')).resolves.toBeNull();
  });
});
