import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MerchantTokenService } from '../channels/merchant-token.service';
import { CampaignAiBrainsService } from './campaign-ai-brains.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [NotificationsModule, AnalyticsModule, JwtModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignAiBrainsService, MerchantTokenService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
