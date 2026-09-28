import { Module } from '@nestjs/common';
import { AiContextCacheModule } from '../ai/context/ai-context-cache.module';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  imports: [AiContextCacheModule],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
