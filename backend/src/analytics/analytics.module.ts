import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AttributionService } from './attribution.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AttributionService],
  exports: [AttributionService],
})
export class AnalyticsModule {}
