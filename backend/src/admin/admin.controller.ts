import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('businesses')
  businesses(@Query('search') search?: string) {
    return this.admin.businesses(search ?? '');
  }

  @Get('businesses/:id')
  business(@Param('id') id: string) {
    return this.admin.business(id);
  }

  @Get('users')
  users(@Query('search') search?: string) {
    return this.admin.users(search ?? '');
  }

  @Get('subscriptions')
  subscriptions() {
    return this.admin.subscriptions();
  }

  @Get('usage')
  usage() {
    return this.admin.usage();
  }
}
