import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AiEngineAdapter } from '../channels/ai-engine.adapter';
import { InboundMessageService } from '../channels/inbound-message.service';
import { MetaGraphClient } from './meta/meta-graph.client';
import { MetaOauthService } from './meta/meta-oauth.service';
import { MetaOutboundService } from './meta/meta-outbound.service';
import { MetaWebhookService } from './meta/meta-webhook.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [SocialController],
  providers: [
    SocialService,
    MetaGraphClient,
    MetaOauthService,
    MetaOutboundService,
    MetaWebhookService,
    InboundMessageService,
    AiEngineAdapter,
  ],
  exports: [SocialService, MetaOutboundService, InboundMessageService],
})
export class SocialModule {}
