import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialService } from './social.service';

class ConnectDemoDto {
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsOptional()
  @IsString()
  displayName?: string;
}

@Controller('social')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.social.list(user.id);
  }

  @Post('connect-demo')
  @UseGuards(JwtAuthGuard)
  connectDemo(@CurrentUser() user: AuthUser, @Body() dto: ConnectDemoDto) {
    return this.social.connectDemo(user.id, dto.platform, dto.displayName);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  disconnect(
    @CurrentUser() user: AuthUser,
    @Body() dto: { platform: SocialPlatform },
  ) {
    return this.social.disconnect(user.id, dto.platform);
  }

  @Get('meta/webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.social.verifyWebhook(mode, token, challenge);
  }

  @Post('meta/webhook')
  webhook(@Body() body: Record<string, unknown>) {
    return this.social.handleWebhook(body);
  }
}
