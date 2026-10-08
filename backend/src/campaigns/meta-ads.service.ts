import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CampaignStatus,
  type Campaign,
  type CampaignObjective,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetaOauthService } from '../social/meta/meta-oauth.service';
import { MetaAdsClient } from './meta-ads.client';
import {
  dailyBudgetMinor,
  destinationType,
  hashPhones,
  isCustomAudienceTermsError,
  isTokenError,
  mapObjective,
  metaUserMessage,
} from './meta-ads.mapping';

const LOOKALIKE_MIN = 100;

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly oauth: MetaOauthService,
    private readonly graph: MetaAdsClient,
  ) {}

  enabled() {
    return this.config.get<string>('META_ADS_PUBLISH_ENABLED') === 'true';
  }

  async publish(businessId: string, campaignId: string) {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    if (
      !this.enabled() ||
      !business.metaAdAccountId ||
      !business.metaAdsTokenEnc
    ) {
      return null;
    }

    let campaign = await this.prisma.campaign.findFirstOrThrow({
      where: { id: campaignId, businessId },
    });
    const token = this.oauth.decrypt(business.metaAdsTokenEnc);
    const act = business.metaAdAccountId.replace(/^act_/, '');
    const page = await this.prisma.socialAccount.findFirst({
      where: { businessId, platform: 'FACEBOOK', status: 'CONNECTED' },
    });
    if (!page?.externalId || page.externalId.startsWith('pending-')) {
      throw new Error('Connect a Facebook Page before publishing ads');
    }

    campaign = await this.save(campaign.id, {
      status: CampaignStatus.PUBLISHING,
      metaError: null,
      metaErrorUserMsg: null,
    });

    try {
      if (
        campaign.startDate &&
        campaign.endDate &&
        campaign.endDate.getTime() <= campaign.startDate.getTime()
      ) {
        throw new Error('End date must be after the start date');
      }
      dailyBudgetMinor(
        campaign.budget,
        business.metaAdAccountCurrency || campaign.currency,
      );
      const audience = await this.ensureAudiences(
        campaign,
        token,
        act,
        page.externalId,
      );
      const salesNote =
        mapObjective(campaign.objective).objective === 'OUTCOME_SALES'
          ? 'No Meta pixel is connected, so this paused ad asks people to message the page instead of tracking purchases.'
          : null;
      const audienceNote = dedupeNote(
        salesNote && !audience.note?.includes(salesNote)
          ? [audience.note, salesNote].filter(Boolean).join(' ')
          : (audience.note ?? ''),
      );
      campaign = await this.save(campaign.id, {
        metaAudienceIds: audience.ids,
        audienceNote,
        publishStep: 'audiences',
      });

      const mapped = this.deliveryObjective(campaign);
      if (!campaign.metaCampaignId) {
        const created = await this.graph.post(`act_${act}/campaigns`, token, {
          name: campaign.name,
          objective: mapped.objective,
          special_ad_categories: [],
          status: 'PAUSED',
          is_adset_budget_sharing_enabled: false,
        });
        campaign = await this.save(campaign.id, {
          metaCampaignId: String(created.id),
          publishStep: 'campaign',
        });
      }

      if (!campaign.metaAdsetId) {
        const currency = business.metaAdAccountCurrency || campaign.currency;
        const created = await this.graph.post(`act_${act}/adsets`, token, {
          name: `${campaign.name} · set`,
          campaign_id: campaign.metaCampaignId,
          daily_budget: dailyBudgetMinor(campaign.budget, currency),
          is_adset_budget_sharing_enabled: false,
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          billing_event: mapped.billingEvent,
          optimization_goal: mapped.optimizationGoal,
          destination_type: mapped.messaging
            ? destinationType(campaign.channel)
            : undefined,
          promoted_object: { page_id: page.externalId },
          targeting: {
            geo_locations: { countries: ['EG'] },
            targeting_automation: { advantage_audience: 0 },
            ...(campaign.metaAudienceIds.length
              ? {
                  custom_audiences: campaign.metaAudienceIds.map((id) => ({
                    id,
                  })),
                }
              : {}),
          },
          start_time: campaign.startDate?.toISOString(),
          end_time: campaign.endDate?.toISOString(),
          status: 'PAUSED',
        });
        campaign = await this.save(campaign.id, {
          metaAdsetId: String(created.id),
          publishStep: 'adset',
        });
      }

      if (!campaign.metaCreativeId) {
        const created = await this.graph.post(`act_${act}/adcreatives`, token, {
          name: `${campaign.name} · creative`,
          object_story_spec: {
            page_id: page.externalId,
            link_data: {
              message: (campaign.suggestedMessaging || campaign.offer).slice(
                0,
                1000,
              ),
              link: `https://m.me/${page.externalId}`,
              call_to_action: { type: 'MESSAGE_PAGE' },
            },
          },
        });
        campaign = await this.save(campaign.id, {
          metaCreativeId: String(created.id),
          publishStep: 'creative',
        });
      }

      if (!campaign.metaAdId) {
        const created = await this.graph.post(`act_${act}/ads`, token, {
          name: `${campaign.name} · ad`,
          adset_id: campaign.metaAdsetId,
          creative: { creative_id: campaign.metaCreativeId },
          status: 'PAUSED',
        });
        campaign = await this.save(campaign.id, {
          metaAdId: String(created.id),
          publishStep: 'ad',
        });
      }

      return this.save(campaign.id, {
        status: CampaignStatus.PAUSED_ON_META,
        effectiveStatus: 'PAUSED',
        publishStep: 'done',
      });
    } catch (error) {
      await this.onGraphError(businessId, error);
      const step = campaign.publishStep ?? 'publish';
      return this.save(campaign.id, {
        status: CampaignStatus.FAILED,
        publishStep: step,
        metaError: metaUserMessage(error),
        metaErrorUserMsg: isCustomAudienceTermsError(error)
          ? 'Accept Custom Audience terms in Meta Business Settings, then retry.'
          : metaUserMessage(error),
      });
    }
  }

  async setDelivery(
    businessId: string,
    campaignId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    const campaign = await this.prisma.campaign.findFirstOrThrow({
      where: { id: campaignId, businessId },
    });
    if (!business.metaAdsTokenEnc || !campaign.metaCampaignId) {
      throw new Error('Campaign is not published on Meta');
    }
    const token = this.oauth.decrypt(business.metaAdsTokenEnc);
    for (const id of [
      campaign.metaCampaignId,
      campaign.metaAdsetId,
      campaign.metaAdId,
    ]) {
      if (!id) continue;
      await this.graph.post(id, token, { status });
    }
    return this.save(campaign.id, {
      status:
        status === 'ACTIVE'
          ? CampaignStatus.ACTIVE
          : CampaignStatus.PAUSED_ON_META,
      effectiveStatus: status,
    });
  }

  /** Sales needs a pixel. This creative asks for a message, so use that instead. */
  private deliveryObjective(campaign: Campaign) {
    const mapped = mapObjective(campaign.objective);
    if (mapped.objective === 'OUTCOME_SALES')
      return mapObjective('MORE_MESSAGES');
    return mapped;
  }

  private async ensureAudiences(
    campaign: Campaign,
    token: string,
    act: string,
    pageId: string,
  ) {
    if (campaign.metaAudienceIds.length) {
      return {
        ids: campaign.metaAudienceIds,
        note: campaign.audienceNote,
      };
    }
    const ids: string[] = [];
    const notes: string[] = [];
    const wants = new Set(campaign.audiences);
    const objective = campaign.objective;

    if (
      wants.has('CUSTOMERS') ||
      wants.has('SIMILAR') ||
      objective === 'RETARGETING'
    ) {
      const buyers = await this.buyerPhones(campaign.businessId);
      const hashes = hashPhones(buyers);
      if (hashes.length) {
        const audienceId = await this.customerFile(
          token,
          act,
          `${campaign.name} buyers`,
          hashes,
        );
        if (!audienceId) {
          this.noteTerms(notes);
        } else {
          ids.push(audienceId);
        }
        if (audienceId && wants.has('SIMILAR')) {
          if (hashes.length < LOOKALIKE_MIN) {
            notes.push(
              `Lookalike skipped: buyer audience has ${hashes.length} people (need ${LOOKALIKE_MIN}).`,
            );
          } else {
            const lookalike = await this.graph.post(
              `act_${act}/customaudiences`,
              token,
              {
                name: `${campaign.name} lookalike EG 1%`,
                subtype: 'LOOKALIKE',
                origin_audience_id: audienceId,
                lookalike_spec: {
                  country: 'EG',
                  ratio: 0.01,
                  type: 'similarity',
                },
              },
            );
            ids.push(String(lookalike.id));
          }
        }
      } else if (wants.has('CUSTOMERS') || wants.has('SIMILAR')) {
        notes.push(
          'No buyer phone numbers yet — buyer/lookalike audience skipped.',
        );
      }
    }

    if (wants.has('MESSAGED')) {
      const phones = await this.messagedWithoutOrder(campaign.businessId);
      const hashes = hashPhones(phones);
      if (hashes.length) {
        const audienceId = await this.customerFile(
          token,
          act,
          `${campaign.name} messaged`,
          hashes,
        );
        if (audienceId) ids.push(audienceId);
        else this.noteTerms(notes);
      } else {
        try {
          const engagement = await this.graph.post(
            `act_${act}/customaudiences`,
            token,
            {
              name: `${campaign.name} page engagers`,
              subtype: 'ENGAGEMENT',
              rule: {
                inclusions: {
                  operator: 'or',
                  rules: [
                    {
                      event_sources: [{ id: pageId, type: 'page' }],
                      retention_seconds: 60 * 60 * 24 * 365,
                      filter: {
                        operator: 'and',
                        filters: [
                          {
                            field: 'event',
                            operator: 'eq',
                            value: 'page_engaged',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          );
          ids.push(String(engagement.id));
          notes.push(
            'No phone numbers for people who messaged — using page engagement audience.',
          );
        } catch (error) {
          notes.push(`Audience not available: ${metaUserMessage(error)}`);
        }
      }
    }

    if (wants.has('ENGAGED')) {
      try {
        const engagement = await this.graph.post(
          `act_${act}/customaudiences`,
          token,
          {
            name: `${campaign.name} page engagers`,
            subtype: 'ENGAGEMENT',
            rule: {
              inclusions: {
                operator: 'or',
                rules: [
                  {
                    event_sources: [{ id: pageId, type: 'page' }],
                    retention_seconds: 60 * 60 * 24 * 365,
                    filter: {
                      operator: 'and',
                      filters: [
                        {
                          field: 'event',
                          operator: 'eq',
                          value: 'page_engaged',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        );
        ids.push(String(engagement.id));
      } catch (error) {
        notes.push(`Audience not available: ${metaUserMessage(error)}`);
      }
    }

    return { ids, note: notes.filter(Boolean).join(' ') || null };
  }

  private noteTerms(notes: string[]) {
    const note =
      'Customer lists were skipped because Custom Audience terms are not accepted. The ad targets Egypt only.';
    if (!notes.includes(note)) notes.push(note);
  }

  private async customerFile(
    token: string,
    act: string,
    name: string,
    hashes: string[],
  ) {
    try {
      const created = await this.graph.post(
        `act_${act}/customaudiences`,
        token,
        {
          name,
          subtype: 'CUSTOM',
          customer_file_source: 'USER_PROVIDED_ONLY',
        },
      );
      const id = String(created.id);
      await this.graph.post(`${id}/users`, token, {
        payload: { schema: ['PHONE'], data: hashes.map((hash) => [hash]) },
      });
      return id;
    } catch (error) {
      if (isCustomAudienceTermsError(error)) return null;
      throw error;
    }
  }

  private async buyerPhones(businessId: string) {
    const orders = await this.prisma.order.findMany({
      where: { businessId },
      select: { customer: { select: { phone: true } } },
      take: 5000,
    });
    return orders
      .map((order) => order.customer?.phone)
      .filter((phone): phone is string => Boolean(phone));
  }

  private async messagedWithoutOrder(businessId: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        businessId,
        phone: { not: null },
        orders: { none: {} },
        conversations: { some: {} },
      },
      select: { phone: true },
      take: 5000,
    });
    return customers
      .map((customer) => customer.phone)
      .filter((phone): phone is string => Boolean(phone));
  }

  private async onGraphError(businessId: string, error: unknown) {
    if (!isTokenError(error)) return;
    await this.prisma.business.update({
      where: { id: businessId },
      data: { metaAdsNeedsReconnect: true },
    });
    this.logger.warn(`Meta ads token needs reconnect business=${businessId}`);
  }

  private save(
    id: string,
    data: Partial<
      Pick<
        Campaign,
        | 'status'
        | 'metaCampaignId'
        | 'metaAdsetId'
        | 'metaAdId'
        | 'metaCreativeId'
        | 'metaAudienceIds'
        | 'publishStep'
        | 'metaError'
        | 'metaErrorUserMsg'
        | 'effectiveStatus'
        | 'audienceNote'
      >
    >,
  ) {
    return this.prisma.campaign.update({ where: { id }, data });
  }
}

function dedupeNote(note: string) {
  const seen = new Set<string>();
  const unique = note
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part || seen.has(part)) return false;
      seen.add(part);
      return true;
    });
  return unique.join(' ') || null;
}

export type { CampaignObjective };
