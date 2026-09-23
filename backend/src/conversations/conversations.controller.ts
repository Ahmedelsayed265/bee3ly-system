import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';

class LeadStatusDto {
  @IsIn(['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'])
  status!: string;
}

class QuickReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  payload!: string;
}

class HumanMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => QuickReplyDto)
  quickReplies?: QuickReplyDto[];
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get('conversations')
  list(@CurrentUser() user: AuthUser) {
    return this.conversations.list(user.id);
  }

  @Get('conversations/:id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversations.getOne(user.id, id);
  }

  @Delete('conversations/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversations.remove(user.id, id);
  }

  @Post('conversations/:id/human-message')
  humanMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: HumanMessageDto,
  ) {
    return this.conversations.sendHumanMessage(
      user.id,
      id,
      dto.content,
      dto.quickReplies,
    );
  }

  @Get('leads')
  listLeads(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.conversations.listLeads(
      user.id,
      query.page ?? 1,
      query.limit ?? 10,
    );
  }

  @Patch('leads/:id/status')
  updateLead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: LeadStatusDto,
  ) {
    return this.conversations.updateLeadStatus(user.id, id, dto.status);
  }
}
