import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
