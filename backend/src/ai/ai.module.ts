import { Module, forwardRef } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocialModule } from '../social/social.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiContextCacheModule } from './context/ai-context-cache.module';
import { ContextBuilderService } from './context/context-builder.service';
import { LlmEngine } from './engines/llm.engine';
import { RulesEngine } from './engines/rules.engine';
import { AiToolsService } from './tools/ai-tools.service';

@Module({
  imports: [
    AiContextCacheModule,
    forwardRef(() => ConversationsModule),
    forwardRef(() => SocialModule),
    NotificationsModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    ContextBuilderService,
    AiToolsService,
    RulesEngine,
    LlmEngine,
  ],
  exports: [
    AiService,
    AiToolsService,
    ContextBuilderService,
    RulesEngine,
    AiContextCacheModule,
  ],
})
export class AiModule {}
