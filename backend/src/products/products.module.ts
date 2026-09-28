import { Module } from '@nestjs/common';
import { AiContextCacheModule } from '../ai/context/ai-context-cache.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [AiContextCacheModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
