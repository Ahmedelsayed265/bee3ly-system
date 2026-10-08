import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiModule } from '../ai/ai.module';
import { AiEngineAdapter } from '../channels/ai-engine.adapter';
import { InboundMessageService } from '../channels/inbound-message.service';
import { MerchantTokenService } from '../channels/merchant-token.service';
import { MetaGraphClient } from './meta/meta-graph.client';
import { MetaOauthService } from './meta/meta-oauth.service';
import { ChannelOutboundService } from './channel-outbound.service';
import { MetaOutboundService } from './meta/meta-outbound.service';
import { MetaWebhookService } from './meta/meta-webhook.service';
import { WhatsappEmbeddedService } from './meta/whatsapp-embedded.service';
import { TikTokApiClient } from './tiktok/tiktok-api.client';
import { TikTokOauthService } from './tiktok/tiktok-oauth.service';
import { TikTokOutboundService } from './tiktok/tiktok-outbound.service';
import { TikTokWebhookService } from './tiktok/tiktok-webhook.service';
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
    ChannelOutboundService,
    TikTokApiClient,
    TikTokOauthService,
    TikTokOutboundService,
    TikTokWebhookService,
    MetaWebhookService,
    WhatsappEmbeddedService,
    PageCommentsService,
    PageCommentsPollerService,
    InboundMessageService,
    AiEngineAdapter,
    MerchantTokenService,
  ],
  exports: [
    SocialService,
    MetaOutboundService,
    ChannelOutboundService,
    InboundMessageService,
    PageCommentsService,
    PageCommentsPollerService,
    MerchantTokenService,
    AiEngineAdapter,
    MetaOauthService,
  ],
})
export class SocialModule {}
