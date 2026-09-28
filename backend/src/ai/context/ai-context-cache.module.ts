import { Module } from '@nestjs/common';
import { AiContextCacheService } from './ai-context-cache.service';

@Module({
  providers: [AiContextCacheService],
  exports: [AiContextCacheService],
})
export class AiContextCacheModule {}
