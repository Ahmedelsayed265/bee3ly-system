import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiModule } from '../ai/ai.module';
import { AiEngineAdapter } from '../channels/ai-engine.adapter';
import { InboundMessageService } from '../channels/inbound-message.service';
import { MerchantTokenService } from '../channels/merchant-token.service';
import { MetaGraphClient } from './meta/meta-graph.client';
import { MetaOauthService } from './meta/meta-oauth.service';
import { MetaOutboundService } from './meta/meta-outbound.service';
import { MetaWebhookService } from './meta/meta-webhook.service';
import { PageCommentsPollerService } from './page-comments-poller.service';
import { PageCommentsService } from './page-comments.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [
    forwardRef(() => AiModule),
    // JwtModule provides JwtService used by MerchantTokenService.
    // The token service passes secret/ttl explicitly on every sign/verify
    // call so we don't need registerAsync defaults here.
    JwtModule,
  ],
  controllers: [SocialController],
  providers: [
    SocialService,
    MetaGraphClient,
    MetaOauthService,
    MetaOutboundService,
    MetaWebhookService,
    PageCommentsService,
    PageCommentsPollerService,
    InboundMessageService,
    AiEngineAdapter,
    MerchantTokenService,
  ],
  exports: [
    SocialService,
    MetaOutboundService,
    InboundMessageService,
    PageCommentsService,
    PageCommentsPollerService,
    MerchantTokenService,
    AiEngineAdapter,
  ],
})
export class SocialModule {}
