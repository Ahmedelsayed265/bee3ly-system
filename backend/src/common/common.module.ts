import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessAccessService } from './business-access.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BusinessAccessService],
  exports: [BusinessAccessService],
})
export class CommonModule {}
