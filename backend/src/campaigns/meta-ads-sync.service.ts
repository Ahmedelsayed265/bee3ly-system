import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CampaignStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MetaOauthService } from '../social/meta/meta-oauth.service';
import { MetaAdsClient } from './meta-ads.client';
import { isTokenError, metaUserMessage } from './meta-ads.mapping';
import { MetaAdsService } from './meta-ads.service';

@Injectable()
export class MetaAdsSyncService {
  private readonly logger = new Logger(MetaAdsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ads: MetaAdsService,
    private readonly oauth: MetaOauthService,
    private readonly graph: MetaAdsClient,
  ) {}

  @Cron('15 3 * * *')
  async syncInsights() {
    if (!this.ads.enabled()) return;
    const campaigns = await this.prisma.campaign.findMany({
      where: { metaCampaignId: { not: null } },
      include: { business: true },
    });
    for (const campaign of campaigns) {
      if (!campaign.business.metaAdsTokenEnc || !campaign.metaCampaignId) {
        continue;
      }
      try {
        const token = this.oauth.decrypt(campaign.business.metaAdsTokenEnc);
        const json = await this.graph.get(
          `${campaign.metaCampaignId}/insights`,
          token,
          {
            fields: 'spend,impressions,clicks,actions,date_start',
            time_increment: '1',
            date_preset: 'last_7d',
          },
        );
        const rows = Array.isArray(json.data) ? json.data : [];
        for (const row of rows) {
          const item = row as Record<string, unknown>;
          const date = new Date(String(item.date_start));
          if (Number.isNaN(date.getTime())) continue;
          await this.prisma.campaignInsight.upsert({
            where: {
              campaignId_date: { campaignId: campaign.id, date },
            },
            create: {
              campaignId: campaign.id,
              date,
              spend: new Prisma.Decimal(String(item.spend ?? '0')),
              impressions: Number(item.impressions ?? 0),
              clicks: Number(item.clicks ?? 0),
              actions: (item.actions as Prisma.InputJsonValue) ?? undefined,
            },
            update: {
              spend: new Prisma.Decimal(String(item.spend ?? '0')),
              impressions: Number(item.impressions ?? 0),
              clicks: Number(item.clicks ?? 0),
              actions: (item.actions as Prisma.InputJsonValue) ?? undefined,
            },
          });
        }
      } catch (error) {
        if (isTokenError(error)) {
          await this.prisma.business.update({
            where: { id: campaign.businessId },
            data: { metaAdsNeedsReconnect: true },
          });
        }
        this.logger.warn(
          `Insights sync failed campaign=${campaign.id}: ${metaUserMessage(error)}`,
        );
      }
    }
  }

  @Cron('0 */4 * * *')
  async syncStatus() {
    if (!this.ads.enabled()) return;
    const campaigns = await this.prisma.campaign.findMany({
      where: { metaAdId: { not: null } },
      include: { business: true },
    });
    for (const campaign of campaigns) {
      if (!campaign.business.metaAdsTokenEnc || !campaign.metaAdId) continue;
      try {
        const token = this.oauth.decrypt(campaign.business.metaAdsTokenEnc);
        const json = await this.graph.get(campaign.metaAdId, token, {
          fields: 'effective_status,ad_review_feedback',
        });
        const effective = String(json.effective_status ?? '');
        const status = mapEffective(effective, campaign.status);
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            effectiveStatus: effective,
            status,
            metaErrorUserMsg:
              status === CampaignStatus.REJECTED
                ? JSON.stringify(
                    (json as { ad_review_feedback?: unknown })
                      .ad_review_feedback ?? {},
                  ).slice(0, 500)
                : campaign.metaErrorUserMsg,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Status sync failed campaign=${campaign.id}: ${metaUserMessage(error)}`,
        );
      }
    }
  }
}

function mapEffective(effective: string, current: CampaignStatus): CampaignStatus {
  if (effective === 'ACTIVE') return CampaignStatus.ACTIVE;
  if (effective === 'PAUSED' || effective === 'CAMPAIGN_PAUSED') {
    return CampaignStatus.PAUSED_ON_META;
  }
  if (effective === 'DISAPPROVED' || effective === 'WITH_ISSUES') {
    return CampaignStatus.REJECTED;
  }
  if (effective === 'PENDING_REVIEW' || effective === 'IN_PROCESS') {
    return CampaignStatus.IN_REVIEW;
  }
  if (effective === 'ARCHIVED' || effective === 'DELETED') {
    return CampaignStatus.COMPLETED;
  }
  return current;
}
