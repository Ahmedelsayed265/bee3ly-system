import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import type { Request, Response } from 'express';
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

class SelectPageDto {
  @IsString()
  pendingId!: string;

  @IsString()
  pageId!: string;
}

@Controller('social')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.social.list(user.id);
  }

  @Post('meta/connect')
  @UseGuards(JwtAuthGuard)
  startConnect(@CurrentUser() user: AuthUser) {
    return this.social.startConnect(user.id);
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

  @Get('meta/callback')
  async metaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.social.handleOAuthCallback(code, state);
    return res.redirect(result.redirectTo);
  }

  @Get('meta/pending/:id')
  @UseGuards(JwtAuthGuard)
  getPending(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.social.getPending(user.id, id);
  }

  @Post('meta/select-page')
  @UseGuards(JwtAuthGuard)
  selectPage(@CurrentUser() user: AuthUser, @Body() dto: SelectPageDto) {
    return this.social.selectPage(user.id, dto.pendingId, dto.pageId);
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
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: Record<string, unknown>,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(body));
    this.social.verifyWebhookSignature(raw, signature);
    return this.social.handleWebhook(body, raw);
  }
}
