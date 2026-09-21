import { Module, forwardRef } from '@nestjs/common';
import { SocialModule } from '../social/social.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [forwardRef(() => SocialModule)],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
