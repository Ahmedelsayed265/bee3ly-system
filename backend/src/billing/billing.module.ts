import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingController } from './billing.controller';
import { BillingMetricsService } from './billing.metrics.service';
import { BillingService } from './billing.service';
import { CreditsService } from './credits.service';
import { EntitlementsService } from './entitlements.service';
import { PaymobProvider } from './payment/paymob.provider';
import { TapProvider } from './payment/tap.provider';
import { SubscriptionService } from './subscription.service';
import { UsageService } from './usage.service';
import { WebhookService } from './webhook.service';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [BillingController],
  providers: [
    SubscriptionService,
    UsageService,
    CreditsService,
    EntitlementsService,
    BillingService,
    WebhookService,
    BillingMetricsService,
    PaymobProvider,
    TapProvider,
  ],
  exports: [SubscriptionService, UsageService, EntitlementsService],
})
export class BillingModule {}
