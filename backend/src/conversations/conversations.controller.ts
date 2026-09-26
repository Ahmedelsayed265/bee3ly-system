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
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
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

const LEAD_STATUSES = ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

class LeadStatusDto {
  @IsIn(LEAD_STATUSES)
  status!: string;
}

class LeadQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  intent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

class LeadIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];
}

class BulkLeadStatusDto extends LeadIdsDto {
  @IsIn(LEAD_STATUSES)
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
  listLeads(@CurrentUser() user: AuthUser, @Query() query: LeadQueryDto) {
    return this.conversations.listLeads(
      user.id,
      query.page ?? 1,
      query.limit ?? 10,
      {
        status: query.status,
        intent: query.intent,
        q: query.q,
        campaignId: query.campaignId,
      },
    );
  }

  @Patch('leads/bulk-status')
  updateLeads(@CurrentUser() user: AuthUser, @Body() dto: BulkLeadStatusDto) {
    return this.conversations.updateLeadsStatus(user.id, dto.ids, dto.status);
  }

  @Delete('leads')
  removeLeads(@CurrentUser() user: AuthUser, @Body() dto: LeadIdsDto) {
    return this.conversations.removeLeads(user.id, dto.ids);
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
