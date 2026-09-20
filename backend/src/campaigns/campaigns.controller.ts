import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, LaunchCampaignDto } from './dto/campaign.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.campaigns.list(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.campaigns.getOne(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user.id, dto);
  }

  @Patch(':id/launch')
  launch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: LaunchCampaignDto,
  ) {
    return this.campaigns.launch(user.id, id, dto.status);
  }
}
