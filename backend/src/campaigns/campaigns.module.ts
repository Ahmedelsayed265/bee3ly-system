import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MerchantTokenService } from '../channels/merchant-token.service';
import { SocialModule } from '../social/social.module';
import { CampaignAiBrainsService } from './campaign-ai-brains.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { MetaAdsClient } from './meta-ads.client';
import { MetaAdsService } from './meta-ads.service';
import { MetaAdsSyncService } from './meta-ads-sync.service';

@Module({
  imports: [NotificationsModule, AnalyticsModule, JwtModule, SocialModule],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    CampaignAiBrainsService,
    MerchantTokenService,
    MetaAdsClient,
    MetaAdsService,
    MetaAdsSyncService,
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
